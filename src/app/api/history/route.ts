import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get finished/in-progress games
  const { data: games } = await supabase
    .from("nba_games")
    .select("*")
    .neq("status", "upcoming")
    .order("game_date", { ascending: false });

  if (!games || games.length === 0) {
    return NextResponse.json([]);
  }

  const { data: teams } = await supabase.from("nba_teams").select("*");
  const teamsMap = new Map(teams?.map((t) => [t.id, t]));

  // Get all predictions for these games
  const gameIds = games.map((g) => g.id);
  const { data: predictions } = await supabase
    .from("nba_predictions")
    .select("*")
    .in("game_id", gameIds);

  // Get all users
  const { data: users } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url");

  const usersMap = new Map(users?.map((u) => [u.id, u]));

  // Build per-game summary
  const result = games.map((game) => {
    const gamePreds = predictions?.filter((p) => p.game_id === game.id) || [];

    const actualWinner =
      game.status === "finished" && game.home_score != null
        ? game.home_score > game.away_score
          ? game.home_team_id
          : game.away_team_id
        : null;

    const userPicks = gamePreds.map((p) => {
      const pickedWinner =
        p.predicted_home_score > p.predicted_away_score
          ? game.home_team_id
          : game.away_team_id;
      return {
        user: usersMap.get(p.user_id),
        picked_team_id: pickedWinner,
        correct: actualWinner ? pickedWinner === actualWinner : null,
        points: p.points_earned,
      };
    });

    return {
      game: {
        ...game,
        home_team: teamsMap.get(game.home_team_id),
        away_team: teamsMap.get(game.away_team_id),
      },
      actual_winner_id: actualWinner,
      picks: userPicks,
    };
  });

  return NextResponse.json(result);
}
