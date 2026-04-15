// Top NBA players from playoff/play-in teams (2025-26 season)
// position: G = guard, F = forward, C = center
// tags: scorer, shooter, playmaker, rebounder, defender, rim_protector
export type PlayerPosition = "G" | "F" | "C";
export type PlayerTag = "scorer" | "shooter" | "playmaker" | "rebounder" | "defender" | "rim_protector";

export interface NbaPlayer {
  name: string;
  team: string;
  team_id: number;
  pos: PlayerPosition;
  tags: PlayerTag[];
  star: number; // 1-5: 5 = MVP candidate, 4 = All-Star, 3 = starter, 2 = rotation, 1 = bench
}

export const NBA_PLAYERS: NbaPlayer[] = [
  // Top MVP candidates (star: 5)
  { name: "Nikola Jokic", team: "DEN", team_id: 8, pos: "C", tags: ["scorer", "playmaker", "rebounder"], star: 5 },
  { name: "Shai Gilgeous-Alexander", team: "OKC", team_id: 21, pos: "G", tags: ["scorer", "playmaker"], star: 5 },
  { name: "Luka Doncic", team: "LAL", team_id: 14, pos: "G", tags: ["scorer", "playmaker", "shooter"], star: 5 },
  { name: "Jayson Tatum", team: "BOS", team_id: 2, pos: "F", tags: ["scorer", "shooter"], star: 5 },
  { name: "Giannis Antetokounmpo", team: "MIL", team_id: 17, pos: "F", tags: ["scorer", "rebounder", "defender"], star: 5 },
  { name: "Anthony Edwards", team: "MIN", team_id: 18, pos: "G", tags: ["scorer", "shooter"], star: 5 },
  // All-Stars (star: 4)
  { name: "Donovan Mitchell", team: "CLE", team_id: 6, pos: "G", tags: ["scorer", "shooter"], star: 4 },
  { name: "Jalen Brunson", team: "NYK", team_id: 20, pos: "G", tags: ["scorer", "playmaker"], star: 4 },
  { name: "Kevin Durant", team: "PHX", team_id: 24, pos: "F", tags: ["scorer", "shooter"], star: 4 },
  { name: "Stephen Curry", team: "GSW", team_id: 10, pos: "G", tags: ["scorer", "shooter", "playmaker"], star: 5 },
  { name: "LeBron James", team: "LAL", team_id: 14, pos: "F", tags: ["scorer", "playmaker", "rebounder"], star: 5 },
  { name: "Anthony Davis", team: "LAL", team_id: 14, pos: "C", tags: ["scorer", "rebounder", "rim_protector", "defender"], star: 5 },
  { name: "Trae Young", team: "ATL", team_id: 1, pos: "G", tags: ["scorer", "playmaker", "shooter"], star: 4 },
  { name: "Scottie Barnes", team: "TOR", team_id: 28, pos: "F", tags: ["playmaker", "defender", "rebounder"], star: 4 },
  { name: "James Harden", team: "LAC", team_id: 13, pos: "G", tags: ["scorer", "playmaker", "shooter"], star: 4 },
  { name: "Kawhi Leonard", team: "LAC", team_id: 13, pos: "F", tags: ["scorer", "defender"], star: 4 },
  { name: "Alperen Sengun", team: "HOU", team_id: 11, pos: "C", tags: ["scorer", "playmaker", "rebounder"], star: 4 },
  { name: "Jalen Green", team: "HOU", team_id: 11, pos: "G", tags: ["scorer", "shooter"], star: 3 },
  { name: "Paolo Banchero", team: "ORL", team_id: 22, pos: "F", tags: ["scorer", "playmaker"], star: 4 },
  { name: "Tyrese Maxey", team: "PHI", team_id: 23, pos: "G", tags: ["scorer", "shooter"], star: 4 },
  { name: "Joel Embiid", team: "PHI", team_id: 23, pos: "C", tags: ["scorer", "rebounder", "rim_protector"], star: 5 },
  { name: "Devin Booker", team: "PHX", team_id: 24, pos: "G", tags: ["scorer", "shooter"], star: 4 },
  // Strong starters (star: 3)
  { name: "Jaylen Brown", team: "BOS", team_id: 2, pos: "G", tags: ["scorer", "defender"], star: 4 },
  { name: "Derrick White", team: "BOS", team_id: 2, pos: "G", tags: ["defender", "shooter"], star: 3 },
  { name: "Darius Garland", team: "CLE", team_id: 6, pos: "G", tags: ["playmaker", "shooter"], star: 3 },
  { name: "Evan Mobley", team: "CLE", team_id: 6, pos: "C", tags: ["defender", "rim_protector", "rebounder"], star: 4 },
  { name: "Jarrett Allen", team: "CLE", team_id: 6, pos: "C", tags: ["rebounder", "rim_protector", "defender"], star: 3 },
  { name: "Karl-Anthony Towns", team: "NYK", team_id: 20, pos: "C", tags: ["scorer", "shooter", "rebounder"], star: 4 },
  { name: "Mikal Bridges", team: "NYK", team_id: 20, pos: "F", tags: ["defender", "shooter"], star: 3 },
  { name: "OG Anunoby", team: "NYK", team_id: 20, pos: "F", tags: ["defender"], star: 3 },
  { name: "Jamal Murray", team: "DEN", team_id: 8, pos: "G", tags: ["scorer", "shooter", "playmaker"], star: 4 },
  { name: "Aaron Gordon", team: "DEN", team_id: 8, pos: "F", tags: ["defender", "rebounder"], star: 3 },
  { name: "Michael Porter Jr.", team: "DEN", team_id: 8, pos: "F", tags: ["scorer", "shooter", "rebounder"], star: 3 },
  { name: "Rudy Gobert", team: "MIN", team_id: 18, pos: "C", tags: ["rebounder", "rim_protector", "defender"], star: 3 },
  { name: "Julius Randle", team: "MIN", team_id: 18, pos: "F", tags: ["scorer", "rebounder"], star: 3 },
  { name: "Dejounte Murray", team: "ATL", team_id: 1, pos: "G", tags: ["playmaker", "defender"], star: 3 },
  { name: "Jalen Johnson", team: "ATL", team_id: 1, pos: "F", tags: ["scorer", "rebounder"], star: 3 },
  { name: "LaMelo Ball", team: "CHA", team_id: 4, pos: "G", tags: ["playmaker", "shooter", "scorer"], star: 4 },
  { name: "Brandon Miller", team: "CHA", team_id: 4, pos: "F", tags: ["scorer", "shooter"], star: 3 },
  { name: "Jimmy Butler", team: "MIA", team_id: 16, pos: "F", tags: ["scorer", "playmaker", "defender"], star: 4 },
  { name: "Bam Adebayo", team: "MIA", team_id: 16, pos: "C", tags: ["defender", "rebounder", "playmaker"], star: 4 },
  { name: "Tyler Herro", team: "MIA", team_id: 16, pos: "G", tags: ["scorer", "shooter"], star: 3 },
  { name: "Norman Powell", team: "LAC", team_id: 13, pos: "G", tags: ["scorer", "shooter"], star: 3 },
  { name: "Ivica Zubac", team: "LAC", team_id: 13, pos: "C", tags: ["rebounder", "rim_protector"], star: 3 },
  { name: "Draymond Green", team: "GSW", team_id: 10, pos: "F", tags: ["playmaker", "defender", "rebounder"], star: 3 },
  { name: "Andrew Wiggins", team: "GSW", team_id: 10, pos: "F", tags: ["scorer", "defender"], star: 3 },
  { name: "Jonathan Kuminga", team: "GSW", team_id: 10, pos: "F", tags: ["scorer", "defender"], star: 3 },
  { name: "Franz Wagner", team: "ORL", team_id: 22, pos: "F", tags: ["scorer", "playmaker"], star: 4 },
  { name: "Jalen Suggs", team: "ORL", team_id: 22, pos: "G", tags: ["defender", "scorer"], star: 3 },
  { name: "Anfernee Simons", team: "POR", team_id: 25, pos: "G", tags: ["scorer", "shooter"], star: 3 },
  { name: "Scoot Henderson", team: "POR", team_id: 25, pos: "G", tags: ["playmaker", "scorer"], star: 3 },
  { name: "RJ Barrett", team: "TOR", team_id: 28, pos: "F", tags: ["scorer"], star: 3 },
  { name: "Immanuel Quickley", team: "TOR", team_id: 28, pos: "G", tags: ["shooter", "playmaker"], star: 3 },
  { name: "Damian Lillard", team: "MIL", team_id: 17, pos: "G", tags: ["scorer", "shooter", "playmaker"], star: 4 },
  { name: "Khris Middleton", team: "MIL", team_id: 17, pos: "F", tags: ["scorer", "shooter"], star: 3 },
  { name: "Brook Lopez", team: "MIL", team_id: 17, pos: "C", tags: ["rim_protector", "shooter"], star: 3 },
  { name: "Fred VanVleet", team: "HOU", team_id: 11, pos: "G", tags: ["playmaker", "shooter", "defender"], star: 3 },
  { name: "Jabari Smith Jr.", team: "HOU", team_id: 11, pos: "F", tags: ["shooter", "defender", "rebounder"], star: 3 },
  { name: "Amen Thompson", team: "HOU", team_id: 11, pos: "G", tags: ["defender", "playmaker"], star: 3 },
  { name: "Chet Holmgren", team: "OKC", team_id: 21, pos: "C", tags: ["rim_protector", "shooter", "rebounder"], star: 4 },
  { name: "Jalen Williams", team: "OKC", team_id: 21, pos: "F", tags: ["scorer", "playmaker", "defender"], star: 4 },
  { name: "Austin Reaves", team: "LAL", team_id: 14, pos: "G", tags: ["playmaker", "shooter"], star: 3 },
  { name: "Bradley Beal", team: "PHX", team_id: 24, pos: "G", tags: ["scorer", "shooter"], star: 3 },
];

// Filter players suitable for a given stat category
import type { DailyQuestionCategory } from "./types";

const CATEGORY_FILTERS: Record<DailyQuestionCategory, (p: NbaPlayer) => boolean> = {
  points: (p) => p.tags.includes("scorer"),
  threes: (p) => p.tags.includes("shooter"),
  rebounds: (p) => p.pos === "C" || p.pos === "F" || p.tags.includes("rebounder"),
  assists: (p) => p.tags.includes("playmaker"),
  steals: (p) => p.tags.includes("defender") && p.pos !== "C",
  blocks: (p) => p.tags.includes("rim_protector") || p.tags.includes("defender"),
  turnovers: (p) => p.tags.includes("playmaker") || p.tags.includes("scorer"),
};

/**
 * Get players for a team suitable for the given category,
 * sorted by star rating (highest first).
 * Always returns at least 2 players (falls back to all team players).
 */
export function getPlayersForCategory(
  teamId: number,
  category: DailyQuestionCategory
): NbaPlayer[] {
  const filter = CATEGORY_FILTERS[category];
  const teamPlayers = NBA_PLAYERS.filter((p) => p.team_id === teamId);
  const filtered = teamPlayers.filter(filter);
  const pool = filtered.length >= 2 ? filtered : teamPlayers;
  // Sort by star rating descending — top players first
  return [...pool].sort((a, b) => b.star - a.star);
}

/**
 * Pick 2 players from a sorted pool with star-weighted randomness.
 * First pick: always from top-2 by star rating.
 * Second pick: random from the rest.
 */
export function pickTwoWeighted(players: NbaPlayer[]): NbaPlayer[] {
  if (players.length <= 2) return players;
  // First pick: one of the top players (star >= highest - 1)
  const maxStar = players[0].star;
  const topTier = players.filter((p) => p.star >= maxStar - 1);
  const first = topTier[Math.floor(Math.random() * topTier.length)];
  // Second pick: random from the rest
  const rest = players.filter((p) => p !== first);
  const second = rest[Math.floor(Math.random() * rest.length)];
  return [first, second];
}
