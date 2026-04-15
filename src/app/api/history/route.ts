import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get games where betting is closed (started, in progress, or finished)
  const { data: allGames } = await supabase
    .from("nba_games")
    .select("*")
    .order("game_date", { ascending: true });

  const { data: settings } = await supabase
    .from("nba_settings")
    .select("value")
    .eq("key", "betting_close_minutes")
    .single();
  const closeMinutes = settings?.value ?? 30;
  const now = new Date();

  // Include games where betting is closed (time passed) OR game started/finished
  const games = allGames?.filter((g) => {
    if (g.status !== "upcoming") return true;
    const lockTime = new Date(new Date(g.game_date).getTime() - closeMinutes * 60 * 1000);
    return now >= lockTime;
  }) || [];

  if (games.length === 0) {
    return NextResponse.json({ games: [], users: [], predictions: {} });
  }

  const { data: teams } = await supabase.from("nba_teams").select("*");
  const teamsMap = new Map(teams?.map((t) => [t.id, t]));

  const gameIds = games.map((g) => g.id);
  const { data: predictions } = await supabase
    .from("nba_predictions")
    .select("*")
    .in("game_id", gameIds);

  const { data: users } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url");

  // Build predictions map: { gameId: { userId: pick } }
  const predsMap: Record<number, Record<string, { picked_team_id: number; correct: boolean | null; points: number }>> = {};

  for (const game of games) {
    predsMap[game.id] = {};
    const actualWinner =
      game.status === "finished" && game.home_score != null
        ? game.home_score > game.away_score
          ? game.home_team_id
          : game.away_team_id
        : null;

    const gamePreds = predictions?.filter((p) => p.game_id === game.id) || [];
    for (const p of gamePreds) {
      const pickedWinner =
        p.predicted_home_score > p.predicted_away_score
          ? game.home_team_id
          : game.away_team_id;
      predsMap[game.id][p.user_id] = {
        picked_team_id: pickedWinner,
        correct: actualWinner ? pickedWinner === actualWinner : null,
        points: p.points_earned,
      };
    }
  }

  const enrichedGames = games.map((g) => ({
    ...g,
    home_team: teamsMap.get(g.home_team_id),
    away_team: teamsMap.get(g.away_team_id),
  }));

  return NextResponse.json({
    games: enrichedGames,
    users: users || [],
    predictions: predsMap,
  });
}
