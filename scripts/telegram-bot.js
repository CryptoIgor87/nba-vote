#!/usr/bin/env node
/**
 * Telegram bot "Гей Предсказатель"
 *
 * Sends notifications to a Telegram channel:
 * - 21:00 & 23:00 Tomsk (14:00 & 16:00 UTC): remind players who haven't bet
 * - 13:00 Tomsk (06:00 UTC): leaderboard changes after matches
 *
 * Usage: node scripts/telegram-bot.js [missed|leaderboard|test]
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

const { createClient } = require("@supabase/supabase-js");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ============ GAY ROASTS FOR MISSED BETS ============
const MISSED_ROASTS = [
  (name, match) => `${name}, сладкий мой, ты опять забыл поставить на ${match}? Завтра будешь плакать в подушку, как всегда 💅`,
  (name, match) => `Алло, ${name}! Пока ты красил ногти, все уже поставили на ${match}. Шевели булками! 🍑`,
  (name, match) => `${name} опять витает в облаках вместо того чтобы поставить на ${match}. Наверное опять в Grindr залип 📱`,
  (name, match) => `Девочки, ${name} снова пропускает ${match}! Видимо свидание важнее. Потом не ной, принцесса 👑`,
  (name, match) => `${name}, солнышко, ${match} ждёт твой прогноз! Или ты опять "занят"? Мы знаем чем... 😏`,
  (name, match) => `Королева драмы ${name} игнорирует ${match}. Завтра скажет "я не видел". Классика, детка 💄`,
  (name, match) => `${name}! Хватит листать тиктоки с полуголыми мужиками, поставь на ${match}! ⏰`,
  (name, match) => `Внимание! ${name} — единственный кто ещё не поставил на ${match}. Позор на весь гей-клуб 🏳️‍🌈`,
  (name, match) => `${name}, ау! ${match} скоро начнётся, а ты как всегда опаздываешь. Как на первое свидание 💋`,
  (name, match) => `Пупсик ${name} забыл про ${match}. Видимо после вчерашней вечеринки голова не варит 🍸`,
  (name, match) => `${name}, противный лентяй! Все уже поставили на ${match}, только ты сидишь красивый и бесполезный 🪞`,
  (name, match) => `Дорогуша ${name}, ${match} — это не опционально! Ставь прогноз или я расскажу всем про тот случай 🤫`,
];

// ============ GAY ROASTS FOR LEADERBOARD CHANGES ============
const OVERTAKE_ROASTS = [
  (winner, loser, pos) => `${winner} только что нагнул ${loser} и теперь на ${pos}-м месте! Кто сверху теперь, а? 🔝`,
  (winner, loser, pos) => `Девочки, ${winner} обошёл ${loser}! ${loser} теперь снизу. Привыкай, милый 😘`,
  (winner, loser, pos) => `СЕНСАЦИЯ! ${winner} залез на ${pos}-е место, оттеснив ${loser}. Доминация! 💪🏳️‍🌈`,
  (winner, loser, pos) => `${winner} выебал ${loser} по очкам и теперь ${pos}-й! ${loser}, не расстраивайся, зайка 🐰`,
  (winner, loser, pos) => `Горячая новость: ${winner} на ${pos}-м месте! ${loser} в шоке, плачет в ванной 🚿`,
  (winner, loser, pos) => `${winner} показал ${loser} кто тут альфа! ${pos}-е место, детка! ${loser} — подвинься 👋`,
  (winner, loser, pos) => `Рейтинг изменился! ${winner} теперь ${pos}-й, а ${loser} опустился. Ирония? Нет, карма 🌈`,
  (winner, loser, pos) => `${winner} сверху! ${loser} снизу! ${pos}-е место! Всё как в жизни, правда ${loser}? 😜`,
];

const LEADER_CELEBRATION = [
  (name) => `${name} — ПЕРВЫЙ! Королева бала, мисс NBA! Все остальные — на подтанцовке 👸🏆`,
  (name) => `${name} захватил трон! Поклонитесь, простые смертные! 🏆👑`,
  (name) => `Кто тут главная стерва рейтинга? Правильно, ${name}! Номер один, детка! 💅🏆`,
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("[DRY RUN]", text);
    return;
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
  });
  const data = await res.json();
  if (!data.ok) console.error("Telegram error:", data);
  else console.log("Sent:", text.substring(0, 80) + "...");
}

// ============ MISSED PREDICTIONS ============
async function checkMissedPredictions() {
  const { data: teams } = await s.from("nba_teams").select("id, abbreviation");
  const tmap = new Map(teams.map((t) => [t.id, t.abbreviation]));

  // Top 4 users by leaderboard
  const { data: lb } = await s.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false }).limit(4);
  const userIds = lb.map((l) => l.user_id);
  const { data: users } = await s.from("nba_users").select("id, display_name, name").in("id", userIds);
  const uname = (id) => { const u = users.find((u) => u.id === id); return u?.display_name || u?.name || "Аноним"; };

  // Upcoming games in next 24h
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: games } = await s.from("nba_games").select("*")
    .eq("status", "upcoming")
    .gte("game_date", now.toISOString())
    .lte("game_date", tomorrow.toISOString());

  if (!games || games.length === 0) {
    console.log("No upcoming games in next 24h");
    return;
  }

  // Check predictions
  const { data: preds } = await s.from("nba_predictions").select("user_id, game_id")
    .in("user_id", userIds)
    .in("game_id", games.map((g) => g.id));

  const predSet = new Set(preds?.map((p) => `${p.user_id}_${p.game_id}`) || []);

  // Also check daily questions
  const { data: dqs } = await s.from("nba_daily_questions").select("id, game_id")
    .eq("status", "active")
    .in("game_id", games.map((g) => g.id));

  const { data: dpicks } = dqs && dqs.length > 0
    ? await s.from("nba_daily_picks").select("user_id, question_id").in("user_id", userIds).in("question_id", dqs.map((q) => q.id))
    : { data: [] };

  const dpickSet = new Set(dpicks?.map((p) => `${p.user_id}_${p.question_id}`) || []);

  const messages = [];

  for (const uid of userIds) {
    const name = uname(uid);
    // Missed game predictions
    for (const game of games) {
      if (!predSet.has(`${uid}_${game.id}`)) {
        const match = `${tmap.get(game.home_team_id)} vs ${tmap.get(game.away_team_id)}`;
        messages.push(pick(MISSED_ROASTS)(name, match));
      }
    }
    // Missed daily questions
    for (const dq of (dqs || [])) {
      if (!dpickSet.has(`${uid}_${dq.id}`)) {
        const game = games.find((g) => g.id === dq.game_id);
        const match = game ? `вопрос дня ${tmap.get(game.home_team_id)}-${tmap.get(game.away_team_id)}` : "вопрос дня";
        messages.push(pick(MISSED_ROASTS)(name, match));
      }
    }
  }

  if (messages.length === 0) {
    await sendMessage("Все красавчики сделали прогнозы! Ни одного ленивого пидра сегодня 🌈✅");
  } else {
    // Group messages, max 3 per send
    for (let i = 0; i < messages.length; i += 3) {
      await sendMessage(messages.slice(i, i + 3).join("\n\n"));
    }
  }
}

// ============ LEADERBOARD CHANGES ============
async function checkLeaderboard() {
  // Current leaderboard
  const { data: lb } = await s.from("nba_leaderboard").select("user_id, total_points").order("total_points", { ascending: false });
  const { data: users } = await s.from("nba_users").select("id, display_name, name");
  const uname = (id) => { const u = users.find((u) => u.id === id); return u?.display_name || u?.name || "Аноним"; };

  if (!lb || lb.length < 2) return;

  // Check if top positions are close or changed (send summary)
  const top4 = lb.slice(0, 4);
  let msg = "🏆 <b>Рейтинг после вчерашних матчей:</b>\n\n";
  top4.forEach((entry, i) => {
    const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "4️⃣";
    msg += `${medal} <b>${uname(entry.user_id)}</b> — ${entry.total_points} очков\n`;
  });

  // Check tight races
  for (let i = 0; i < top4.length - 1; i++) {
    const diff = top4[i].total_points - top4[i + 1].total_points;
    if (diff <= 2 && diff > 0) {
      msg += `\n🔥 ${uname(top4[i].user_id)} опережает ${uname(top4[i + 1].user_id)} всего на ${diff}! Жарко! 🍑`;
    }
    if (diff === 0) {
      msg += `\n⚡ ${uname(top4[i].user_id)} и ${uname(top4[i + 1].user_id)} идут ноздря в ноздрю! Кто кого нагнёт? 😏`;
    }
  }

  await sendMessage(msg);
}

// ============ MAIN ============
async function main() {
  const mode = process.argv[2] || "missed";

  if (mode === "missed") {
    await checkMissedPredictions();
  } else if (mode === "leaderboard") {
    await checkLeaderboard();
  } else if (mode === "test") {
    await sendMessage("🏳️‍🌈 Гей Предсказатель активирован! Теперь никто не спрячется от прогнозов 💅");
  } else {
    console.log("Usage: node telegram-bot.js [missed|leaderboard|test]");
  }
}

main().catch(console.error);
