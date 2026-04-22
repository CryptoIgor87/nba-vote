import type { DailyQuestionCategory } from "./types";

const CDN_BASE = "https://cdn.nba.com/static/json";

interface NbaCdnPlayer {
  personId: number;
  firstName: string;
  familyName: string;
  starter: string;
  played: string;
  statistics: {
    points: number;
    threePointersMade: number;
    reboundsTotal: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    foulsPersonal: number;
    minutes: string;
  };
}

export interface LivePlayer {
  nba_id: number;
  name: string;
  teamTricode: string;
  starter: boolean;
  minutes: number;
  stats: NbaCdnPlayer["statistics"];
}

interface NbaCdnBoxScore {
  game: {
    gameId: string;
    homeTeam: {
      teamTricode: string;
      score: number;
      players: NbaCdnPlayer[];
    };
    awayTeam: {
      teamTricode: string;
      score: number;
      players: NbaCdnPlayer[];
    };
  };
}

interface NbaCdnScheduleGame {
  gameId: string;
  homeTeam: { teamTricode: string; score: number };
  awayTeam: { teamTricode: string; score: number };
  gameStatusText: string;
}

interface NbaCdnScheduleDate {
  gameDate: string; // "04/14/2026 00:00:00"
  games: NbaCdnScheduleGame[];
}

const CATEGORY_TO_STAT: Record<DailyQuestionCategory, string> = {
  total: "points",
  points: "points",
  threes: "threePointersMade",
  rebounds: "reboundsTotal",
  assists: "assists",
  steals: "steals",
  blocks: "blocks",
  turnovers: "turnovers",
  fouls: "foulsPersonal",
};

// ESPN stat labels → index mapping
const ESPN_LABELS = ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'AST', 'TO', 'STL', 'BLK', 'OREB', 'DREB', 'PF', '+/-'];
const CATEGORY_TO_ESPN_LABEL: Record<DailyQuestionCategory, string> = {
  total: "PTS",
  points: "PTS",
  threes: "3PT",
  rebounds: "REB",
  assists: "AST",
  steals: "STL",
  blocks: "BLK",
  turnovers: "TO",
  fouls: "PF",
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Find NBA.com game ID by date and team abbreviations.
 * Date format: "2026-04-14"
 */
export async function findNbaComGameId(
  date: string,
  homeTeamAbbr: string,
  awayTeamAbbr: string
): Promise<string | null> {
  const schedule = await fetchJson<{
    leagueSchedule: { gameDates: NbaCdnScheduleDate[] };
  }>(`${CDN_BASE}/staticData/scheduleLeagueV2.json`);

  if (!schedule?.leagueSchedule?.gameDates) return null;

  // date "2026-04-14" → schedule format "04/14/2026"
  const [y, m, d] = date.split("-");
  const scheduleDate = `${m}/${d}/${y}`;

  for (const gd of schedule.leagueSchedule.gameDates) {
    if (!gd.gameDate.startsWith(scheduleDate)) continue;
    for (const g of gd.games) {
      if (
        g.homeTeam.teamTricode === homeTeamAbbr &&
        g.awayTeam.teamTricode === awayTeamAbbr
      ) {
        return g.gameId;
      }
      // Also check reversed (away/home might differ between APIs)
      if (
        g.homeTeam.teamTricode === awayTeamAbbr &&
        g.awayTeam.teamTricode === homeTeamAbbr
      ) {
        return g.gameId;
      }
    }
  }
  return null;
}

/**
 * Fetch box score for an NBA.com game ID.
 */
export async function fetchBoxScore(nbaComGameId: string) {
  return fetchJson<NbaCdnBoxScore>(
    `${CDN_BASE}/liveData/boxscore/boxscore_${nbaComGameId}.json`
  );
}

/**
 * Get ALL top players (tied for first) for a given stat category in a game.
 * Returns array of { name, value, teamTricode }.
 */
export async function getAllPlayersByStat(
  nbaComGameId: string,
  category: DailyQuestionCategory,
  espnGameId?: string | null
): Promise<{ name: string; value: number; teamTricode: string }[]> {
  // Try ESPN API (more reliable from server)
  if (espnGameId) {
    const results = await getAllPlayersFromEspn(category, espnGameId);
    if (results.length > 0) return results;
  }
  // Fallback to NBA CDN
  const box = await fetchBoxScore(nbaComGameId);
  if (!box?.game) return [];
  const statKey = CATEGORY_TO_STAT[category] as keyof NbaCdnPlayer["statistics"];
  const allPlayers = [
    ...box.game.homeTeam.players.map((p) => ({ ...p, teamTricode: box.game.homeTeam.teamTricode })),
    ...box.game.awayTeam.players.map((p) => ({ ...p, teamTricode: box.game.awayTeam.teamTricode })),
  ];
  return allPlayers.map((p) => {
    const raw = p.statistics?.[statKey] ?? 0;
    return { name: `${p.firstName} ${p.familyName}`, value: typeof raw === "string" ? parseInt(raw) || 0 : raw, teamTricode: p.teamTricode };
  }).filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
}

/**
 * Get ALL top players (tied for first) for a given stat category in a game.
 */
export async function getTopPlayersByStat(
  nbaComGameId: string,
  category: DailyQuestionCategory,
  espnGameId?: string | null
): Promise<{ name: string; value: number; teamTricode: string }[]> {
  // Try NBA CDN first
  const box = await fetchBoxScore(nbaComGameId);
  if (box?.game) {
    const statKey = CATEGORY_TO_STAT[category] as keyof NbaCdnPlayer["statistics"];
    const allPlayers = [
      ...box.game.homeTeam.players.map((p) => ({
        ...p,
        teamTricode: box.game.homeTeam.teamTricode,
      })),
      ...box.game.awayTeam.players.map((p) => ({
        ...p,
        teamTricode: box.game.awayTeam.teamTricode,
      })),
    ];

    let bestValue = -1;
    for (const p of allPlayers) {
      const raw = p.statistics?.[statKey] ?? 0;
      const val = typeof raw === "string" ? parseInt(raw) || 0 : raw;
      if (val > bestValue) bestValue = val;
    }

    if (bestValue > 0) {
      return allPlayers
        .filter((p) => {
          const raw = p.statistics?.[statKey] ?? 0;
          const val = typeof raw === "string" ? parseInt(raw) || 0 : raw;
          return val === bestValue;
        })
        .map((p) => ({
          name: `${p.firstName} ${p.familyName}`,
          value: bestValue,
          teamTricode: p.teamTricode,
        }));
    }
  }

  // Fallback: ESPN API
  return getTopPlayersFromEspn(category, espnGameId);
}

/**
 * Find ESPN game ID by searching the scoreboard for a given date.
 */
export async function findEspnGameId(
  date: string,
  homeTeamAbbr: string,
  awayTeamAbbr: string
): Promise<string | null> {
  // Search both the given date and previous day (UTC vs US timezone offset)
  const d = new Date(date + "T12:00:00Z");
  const prev = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  const dates = [
    date.replace(/-/g, ""),
    prev.toISOString().split("T")[0].replace(/-/g, ""),
  ];

  for (const dateCompact of dates) {
    const data = await fetchJson<{
      events?: { id: string; competitions?: { competitors?: { team?: { abbreviation: string } }[] }[] }[];
    }>(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${dateCompact}`);

    const normalize = (a: string) => a === "PHO" ? "PHX" : a === "BRK" ? "BKN" : a === "GS" ? "GSW" : a === "SA" ? "SAS" : a === "NY" ? "NYK" : a === "NO" ? "NOP" : a;
    for (const ev of data?.events || []) {
      const teams = ev.competitions?.[0]?.competitors?.map((c) => c.team?.abbreviation) || [];
      if (teams.includes(homeTeamAbbr) && teams.includes(awayTeamAbbr)) {
        return ev.id;
      }
      const normTeams = teams.map((t) => normalize(t || ""));
      if (normTeams.includes(normalize(homeTeamAbbr)) && normTeams.includes(normalize(awayTeamAbbr))) {
        return ev.id;
      }
    }
  }
  return null;
}

async function getAllPlayersFromEspn(
  category: DailyQuestionCategory,
  espnGameId: string
): Promise<{ name: string; value: number; teamTricode: string }[]> {
  const data = await fetchJson<{
    boxscore?: { players?: { team: { abbreviation: string }; statistics?: { labels?: string[]; athletes?: { athlete: { displayName: string }; stats?: string[] }[] }[] }[] };
  }>(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnGameId}`);
  if (!data?.boxscore?.players) return [];
  const targetLabel = CATEGORY_TO_ESPN_LABEL[category];
  const results: { name: string; value: number; teamTricode: string }[] = [];
  for (const team of data.boxscore.players) {
    const tricode = team.team.abbreviation;
    for (const sg of team.statistics || []) {
      const labels = sg.labels || ESPN_LABELS;
      const idx = labels.indexOf(targetLabel);
      if (idx < 0) continue;
      for (const ath of sg.athletes || []) {
        const raw = ath.stats?.[idx] || "0";
        const val = parseInt(raw.split("-")[0]) || 0;
        results.push({ name: ath.athlete.displayName, value: val, teamTricode: tricode });
      }
    }
  }
  return results.sort((a, b) => b.value - a.value);
}

async function getTopPlayersFromEspn(
  category: DailyQuestionCategory,
  espnGameId?: string | null
): Promise<{ name: string; value: number; teamTricode: string }[]> {
  if (!espnGameId) return [];

  const data = await fetchJson<{
    boxscore?: {
      players?: {
        team: { abbreviation: string };
        statistics?: {
          labels?: string[];
          athletes?: {
            athlete: { displayName: string };
            stats?: string[];
          }[];
        }[];
      }[];
    };
  }>(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${espnGameId}`);

  if (!data?.boxscore?.players) return [];

  const targetLabel = CATEGORY_TO_ESPN_LABEL[category];
  const results: { name: string; value: number; teamTricode: string }[] = [];

  for (const team of data.boxscore.players) {
    const tricode = team.team.abbreviation;
    for (const sg of team.statistics || []) {
      const labels = sg.labels || ESPN_LABELS;
      const idx = labels.indexOf(targetLabel);
      if (idx < 0) continue;

      for (const ath of sg.athletes || []) {
        const raw = ath.stats?.[idx] || "0";
        // Handle "4-8" format (made-attempted) → take first number
        const val = parseInt(raw.split("-")[0]) || 0;
        if (val > 0) {
          results.push({ name: ath.athlete.displayName, value: val, teamTricode: tricode });
        }
      }
    }
  }

  if (results.length === 0) return [];
  const best = Math.max(...results.map((r) => r.value));
  return results.filter((r) => r.value === best);
}

/** Backward-compat: single top player */
export async function getTopPlayerByStat(
  nbaComGameId: string,
  category: DailyQuestionCategory
): Promise<{ name: string; value: number; teamTricode: string } | null> {
  const tops = await getTopPlayersByStat(nbaComGameId, category);
  return tops[0] ?? null;
}

/**
 * Get the last finished game ID for a team from the schedule.
 */
async function findLastFinishedGameForTeam(
  teamTricode: string
): Promise<string | null> {
  const schedule = await fetchJson<{
    leagueSchedule: { gameDates: NbaCdnScheduleDate[] };
  }>(`${CDN_BASE}/staticData/scheduleLeagueV2.json`);

  if (!schedule?.leagueSchedule?.gameDates) return null;

  // Walk backwards through dates to find last finished game for this team
  const allGames: { gameId: string; dateStr: string }[] = [];
  for (const gd of schedule.leagueSchedule.gameDates) {
    for (const g of gd.games) {
      if (
        (g.homeTeam.teamTricode === teamTricode ||
          g.awayTeam.teamTricode === teamTricode) &&
        g.gameStatusText.startsWith("Final")
      ) {
        allGames.push({ gameId: g.gameId, dateStr: gd.gameDate });
      }
    }
  }

  if (allGames.length === 0) return null;
  return allGames[allGames.length - 1].gameId;
}

/**
 * Get real roster + stats for a team from their last finished game.
 * Returns players sorted by minutes played (starters first).
 */
export async function getTeamLiveRoster(
  teamTricode: string
): Promise<LivePlayer[]> {
  const gameId = await findLastFinishedGameForTeam(teamTricode);
  if (!gameId) return [];

  const box = await fetchBoxScore(gameId);
  if (!box?.game) return [];

  const team =
    box.game.homeTeam.teamTricode === teamTricode
      ? box.game.homeTeam
      : box.game.awayTeam.teamTricode === teamTricode
        ? box.game.awayTeam
        : null;

  if (!team) return [];

  return team.players
    .filter((p) => p.played === "1")
    .map((p) => {
      const minStr = String(p.statistics?.minutes || "PT00M");
      const minMatch = minStr.match(/PT(\d+)M/);
      const minutes = minMatch ? parseInt(minMatch[1]) : 0;
      return {
        nba_id: p.personId,
        name: `${p.firstName} ${p.familyName}`,
        teamTricode,
        starter: p.starter === "1",
        minutes,
        stats: p.statistics,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

/**
 * Get all games for a given date from the NBA schedule.
 */
export async function getGamesForDate(date: string): Promise<NbaCdnScheduleGame[]> {
  const schedule = await fetchJson<{
    leagueSchedule: { gameDates: NbaCdnScheduleDate[] };
  }>(`${CDN_BASE}/staticData/scheduleLeagueV2.json`);

  if (!schedule?.leagueSchedule?.gameDates) return [];

  const [y, m, d] = date.split("-");
  const scheduleDate = `${m}/${d}/${y}`;

  for (const gd of schedule.leagueSchedule.gameDates) {
    if (gd.gameDate.startsWith(scheduleDate)) {
      return gd.games;
    }
  }
  return [];
}
