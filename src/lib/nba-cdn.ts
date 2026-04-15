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
  points: "points",
  threes: "threePointersMade",
  rebounds: "reboundsTotal",
  assists: "assists",
  steals: "steals",
  blocks: "blocks",
  turnovers: "turnovers",
  fouls: "foulsPersonal",
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
 * Get the top player for a given stat category in a game.
 * Returns { name, value, teamTricode } or null.
 */
export async function getTopPlayerByStat(
  nbaComGameId: string,
  category: DailyQuestionCategory
): Promise<{ name: string; value: number; teamTricode: string } | null> {
  const box = await fetchBoxScore(nbaComGameId);
  if (!box?.game) return null;

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

  let best: (typeof allPlayers)[number] | null = null;
  let bestValue = -1;

  for (const p of allPlayers) {
    const raw = p.statistics?.[statKey] ?? 0;
    const val = typeof raw === "string" ? parseInt(raw) || 0 : raw;
    if (val > bestValue) {
      bestValue = val;
      best = p;
    }
  }

  if (!best) return null;

  return {
    name: `${best.firstName} ${best.familyName}`,
    value: bestValue,
    teamTricode: best.teamTricode,
  };
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
