import type { DailyQuestionCategory } from "./types";

const CDN_BASE = "https://cdn.nba.com/static/json";

interface NbaCdnPlayer {
  firstName: string;
  familyName: string;
  statistics: {
    points: number;
    threePointersMade: number;
    reboundsTotal: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
  };
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

const CATEGORY_TO_STAT: Record<DailyQuestionCategory, keyof NbaCdnPlayer["statistics"]> = {
  points: "points",
  threes: "threePointersMade",
  rebounds: "reboundsTotal",
  assists: "assists",
  steals: "steals",
  blocks: "blocks",
  turnovers: "turnovers",
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

  const statKey = CATEGORY_TO_STAT[category];
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
    const val = p.statistics?.[statKey] ?? 0;
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
