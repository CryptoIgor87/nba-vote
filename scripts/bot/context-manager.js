/**
 * Bot v2 context manager: selective context builder
 * Loads only what's needed based on intent detection
 */

const memory = require("./memory");
const userNotes = require("./user-notes");
const { SYSTEM_PROMPT } = require("./constants");

let _db = null;
function init(supabaseClient) { _db = supabaseClient; }

async function build(chatId, tgUsername, intent) {
  // Always loaded (~800 tokens total)
  const [summaryData, recentMessages, speakerNotes] = await Promise.all([
    memory.getLatestSummary(chatId),
    memory.getRecentMessages(chatId, 5),
    userNotes.get(tgUsername),
  ]);

  // Date/time
  const now = new Date();
  const tomskDate = now.toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", weekday: "short", timeZone: "Asia/Tomsk",
  });
  const tomskTime = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tomsk",
  });

  // On-demand context based on intent
  const extraParts = [];

  const tasks = [];
  if (intent.needsSeriesScores) tasks.push(getSeriesScores());
  if (intent.needsLeaderboard) tasks.push(getLeaderboard());
  if (intent.needsLiveScores) tasks.push(getLiveScores());
  if (intent.needsRecentResults) tasks.push(getRecentResults());

  const results = await Promise.all(tasks);
  extraParts.push(...results.filter(Boolean));

  return {
    systemPrompt: SYSTEM_PROMPT,
    dateTime: `${tomskDate}, ${tomskTime}`,
    summary: summaryData?.summary || null,
    recentMessages,
    speakerNotes,
    extraContext: extraParts.join("\n"),
  };
}

// --- Data loaders ---

async function getSeriesScores() {
  if (!_db) return "";
  const { data: teams } = await _db.from("nba_teams").select("id, abbreviation");
  const tmap = new Map(teams?.map(t => [t.id, t.abbreviation]));
  const { data: series } = await _db.from("nba_series").select("*");
  if (!series?.length) return "";

  let ctx = "\nСЧЕТА СЕРИЙ (из базы данных - ФАКТЫ):\n";
  for (const s of series) {
    const h = tmap.get(s.team_home_id);
    const a = tmap.get(s.team_away_id);
    const leader = s.home_wins > s.away_wins ? h : s.away_wins > s.home_wins ? a : "равная";
    const fin = s.status === "finished" ? " [ЗАВЕРШЕНА]" : "";
    ctx += `${h} ${s.home_wins}-${s.away_wins} ${a} (ведёт ${leader})${fin}\n`;
  }
  return ctx;
}

async function getLeaderboard() {
  if (!_db) return "";
  const { data: lb } = await _db.from("nba_leaderboard")
    .select("user_id, total_points")
    .order("total_points", { ascending: false })
    .limit(4);
  const { data: users } = await _db.from("nba_users").select("id, display_name, name");
  const uname = (id) => users?.find(u => u.id === id)?.display_name || users?.find(u => u.id === id)?.name || "?";

  let ctx = "\nРЕЙТИНГ ТУРНИРА:\n";
  lb?.forEach((l, i) => {
    ctx += `${i + 1}. ${uname(l.user_id)} - ${l.total_points} очков\n`;
  });
  return ctx;
}

async function getLiveScores() {
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard");
    const data = await res.json();
    if (!data?.events?.length) return "";
    let scores = "\nLIVE МАТЧИ (ESPN):\n";
    for (const ev of data.events) {
      const c = ev.competitions?.[0];
      if (!c) continue;
      const teams = c.competitors || [];
      const home = teams.find(t => t.homeAway === "home");
      const away = teams.find(t => t.homeAway === "away");
      const status = ev.status?.type?.description || "";
      const detail = ev.status?.type?.detail || "";
      const period = ev.status?.period || "";
      const hScore = parseInt(home?.score) || 0;
      const aScore = parseInt(away?.score) || 0;
      scores += `${home?.team?.abbreviation} ${hScore}-${aScore} ${away?.team?.abbreviation} | ${status}${status === "In Progress" ? ` Q${period} ${detail}` : ""}\n`;
    }
    return scores;
  } catch { return ""; }
}

async function getRecentResults() {
  if (!_db) return "";
  const { data: teams } = await _db.from("nba_teams").select("id, abbreviation");
  const tmap = new Map(teams?.map(t => [t.id, t.abbreviation]));

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: games } = await _db.from("nba_games")
    .select("home_team_id, away_team_id, home_score, away_score, game_date")
    .eq("status", "finished")
    .gte("game_date", threeDaysAgo)
    .order("game_date", { ascending: false });

  if (!games?.length) return "";
  let ctx = "\nПОСЛЕДНИЕ РЕЗУЛЬТАТЫ:\n";
  for (const g of games) {
    const date = new Date(g.game_date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", timeZone: "Asia/Tomsk" });
    ctx += `${date}: ${tmap.get(g.home_team_id)} ${g.home_score}-${g.away_score} ${tmap.get(g.away_team_id)}\n`;
  }
  return ctx;
}

module.exports = { init, build };
