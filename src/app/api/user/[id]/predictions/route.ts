import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  // Get user info
  const { data: user } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url")
    .eq("id", userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get all games
  const { data: games } = await supabase
    .from("nba_games")
    .select("*")
    .order("game_date", { ascending: true });

  const { data: teams } = await supabase.from("nba_teams").select("*");
  const teamsMap = new Map(teams?.map((t) => [t.id, t]));

  // Get user predictions - only for games that have started or finished
  const { data: predictions } = await supabase
    .from("nba_predictions")
    .select("*")
    .eq("user_id", userId);

  // Filter: only show predictions for games where betting is closed
  const now = new Date();
  const { data: settings } = await supabase
    .from("nba_settings")
    .select("value")
    .eq("key", "betting_close_minutes")
    .single();
  const closeMinutes = settings?.value ?? 30;

  const visiblePredictions = predictions?.filter((pred) => {
    const game = games?.find((g) => g.id === pred.game_id);
    if (!game) return false;
    const gameDate = new Date(game.game_date);
    const lockTime = new Date(gameDate.getTime() - closeMinutes * 60 * 1000);
    return now >= lockTime;
  });

  // Get series predictions - only for series where at least one game started
  const { data: seriesPredictions } = await supabase
    .from("nba_series_predictions")
    .select("*")
    .eq("user_id", userId);

  const { data: allSeries } = await supabase.from("nba_series").select("*");

  const visibleSeriesPreds = seriesPredictions?.filter((sp) => {
    const series = allSeries?.find((s) => s.id === sp.series_id);
    if (!series) return false;
    // Show if series is active or finished
    return series.status !== "upcoming";
  });

  // Winner prediction - show if any game has started
  const anyStarted = games?.some((g) => g.status !== "upcoming");
  let winnerPrediction = null;
  let mvpPrediction = null;

  if (anyStarted) {
    const { data: wp } = await supabase
      .from("nba_winner_predictions")
      .select("*")
      .eq("user_id", userId)
      .single();
    winnerPrediction = wp;

    const { data: mp } = await supabase
      .from("nba_mvp_predictions")
      .select("*")
      .eq("user_id", userId)
      .single();
    mvpPrediction = mp;
  }

  // Enrich games with teams
  const enrichedGames = games?.map((g) => ({
    ...g,
    home_team: teamsMap.get(g.home_team_id),
    away_team: teamsMap.get(g.away_team_id),
  }));

  // Series bonuses
  const { data: seriesBonuses } = await supabase
    .from("nba_series_bonuses")
    .select("*")
    .eq("user_id", userId);

  return NextResponse.json({
    user,
    predictions: visiblePredictions,
    seriesPredictions: visibleSeriesPreds,
    seriesBonuses,
    winnerPrediction,
    mvpPrediction,
    games: enrichedGames,
    series: allSeries,
    teams: teams,
  });
}
