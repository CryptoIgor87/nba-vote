import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifySecret } from "@/lib/api-utils";
import { findNbaComGameId } from "@/lib/nba-cdn";
import { getPlayersForCategory, pickTwoWeighted } from "@/lib/players";
import type { DailyQuestionCategory, NbaGame, NbaTeam } from "@/lib/types";

const CATEGORIES: DailyQuestionCategory[] = [
  "points",
  "threes",
  "rebounds",
  "assists",
  "steals",
  "blocks",
  "turnovers",
];

// Round priority — higher is more interesting
const ROUND_PRIORITY: Record<string, number> = {
  finals: 5,
  conference_finals: 4,
  conference_semis: 3,
  first_round: 2,
  play_in: 1,
};

async function generateForDate(dateStr: string) {
  // Check if question already exists
  const { data: existing } = await supabase
    .from("nba_daily_questions")
    .select("id")
    .eq("question_date", dateStr)
    .single();

  if (existing) return { date: dateStr, status: "exists", id: existing.id };

  // Find games for this date
  const { data: dayGames } = await supabase
    .from("nba_games")
    .select(
      "*, home_team:nba_teams!nba_games_home_team_id_fkey(*), away_team:nba_teams!nba_games_away_team_id_fkey(*)"
    )
    .gte("game_date", `${dateStr}T00:00:00`)
    .lte("game_date", `${dateStr}T23:59:59`)
    .order("game_date");

  if (!dayGames || dayGames.length === 0) {
    return { date: dateStr, status: "no_games" };
  }

  // Pick the most interesting game
  const gamesWithPriority = dayGames.map((g: NbaGame) => ({
    ...g,
    priority: ROUND_PRIORITY[g.round || "play_in"] || 0,
  }));
  gamesWithPriority.sort((a, b) => b.priority - a.priority);
  const maxPriority = gamesWithPriority[0].priority;
  const topGames = gamesWithPriority.filter((g) => g.priority === maxPriority);
  const game = topGames[Math.floor(Math.random() * topGames.length)];

  const homeTeam = game.home_team as NbaTeam;
  const awayTeam = game.away_team as NbaTeam;

  // Pick random category
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  // Pick 2 players from each team, filtered by category relevance
  const homePlayers = getPlayersForCategory(homeTeam.id, category);
  const awayPlayers = getPlayersForCategory(awayTeam.id, category);
  const homeSelected = pickTwoWeighted(homePlayers);
  const awaySelected = pickTwoWeighted(awayPlayers);

  if (homeSelected.length < 2 || awaySelected.length < 2) {
    return { date: dateStr, status: "not_enough_players" };
  }

  // Try to find NBA.com game ID
  const nbaGameId = await findNbaComGameId(
    dateStr,
    homeTeam.abbreviation,
    awayTeam.abbreviation
  );

  const { data: question, error } = await supabase
    .from("nba_daily_questions")
    .insert({
      game_id: game.id,
      question_date: dateStr,
      category,
      player1_name: homeSelected[0].name,
      player1_team_id: homeTeam.id,
      player2_name: homeSelected[1].name,
      player2_team_id: homeTeam.id,
      player3_name: awaySelected[0].name,
      player3_team_id: awayTeam.id,
      player4_name: awaySelected[1].name,
      player4_team_id: awayTeam.id,
      nba_game_id: nbaGameId,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    date: dateStr,
    status: "created",
    game: `${homeTeam.abbreviation} vs ${awayTeam.abbreviation}`,
    category,
    players: [
      homeSelected[0].name,
      homeSelected[1].name,
      awaySelected[0].name,
      awaySelected[1].name,
    ],
    id: question.id,
  };
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!verifySecret(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all upcoming game dates (next 7 days)
    const now = new Date();
    const results = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const result = await generateForDate(dateStr);
      results.push(result);
    }

    return NextResponse.json({
      message: "Questions generated",
      results,
    });
  } catch (e) {
    console.error("Generate question error:", e);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
