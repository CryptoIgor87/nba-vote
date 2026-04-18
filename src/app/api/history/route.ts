import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: allGames } = await supabase
    .from("nba_games")
    .select("*")
    .order("game_date", { ascending: false });

  const { data: settings } = await supabase
    .from("nba_settings")
    .select("value")
    .eq("key", "betting_close_minutes")
    .single();
  const closeMinutes = settings?.value ?? 30;
  const now = new Date();

  // Games where betting is closed
  const games = allGames?.filter((g) => {
    if (g.status !== "upcoming") return true;
    const lockTime = new Date(new Date(g.game_date).getTime() - closeMinutes * 60 * 1000);
    return now >= lockTime;
  }) || [];

  const { data: teams } = await supabase.from("nba_teams").select("*");
  const teamsMap = new Map(teams?.map((t) => [t.id, t]));

  // Game predictions
  const gameIds = games.map((g) => g.id);
  const { data: predictions } = gameIds.length > 0
    ? await supabase.from("nba_predictions").select("*").in("game_id", gameIds)
    : { data: [] };

  // Series predictions (for finished/active series)
  const { data: allSeriesRaw } = await supabase
    .from("nba_series")
    .select("*")
    .order("created_at", { ascending: false });

  // Only show series where at least one game has started (locked)
  const allSeries = (allSeriesRaw || []).filter((s) => {
    if (s.status !== "upcoming") return true;
    const seriesGames = games.filter((g) =>
      (g.home_team_id === s.team_home_id && g.away_team_id === s.team_away_id) ||
      (g.home_team_id === s.team_away_id && g.away_team_id === s.team_home_id)
    );
    return seriesGames.some((g) => {
      const lockTime = new Date(new Date(g.game_date).getTime() - closeMinutes * 60 * 1000);
      return now >= lockTime;
    });
  });

  const { data: seriesPredictions } = await supabase
    .from("nba_series_predictions")
    .select("*");

  const { data: users } = await supabase
    .from("nba_users")
    .select("id, name, display_name, image, avatar_url");

  const usersMap = new Map(users?.map((u) => [u.id, u]));

  // Build game predictions map
  const gamePreds: Record<number, Record<string, { picked_team_id: number; correct: boolean | null; points: number }>> = {};
  for (const game of games) {
    gamePreds[game.id] = {};
    const actualWinner =
      game.status === "finished" && game.home_score != null
        ? game.home_score > game.away_score ? game.home_team_id : game.away_team_id
        : null;
    const gp = predictions?.filter((p) => p.game_id === game.id) || [];
    for (const p of gp) {
      const pickedWinner = p.predicted_home_score > p.predicted_away_score ? game.home_team_id : game.away_team_id;
      gamePreds[game.id][p.user_id] = {
        picked_team_id: pickedWinner,
        correct: actualWinner ? pickedWinner === actualWinner : null,
        points: p.points_earned,
      };
    }
  }

  // Build series predictions map
  const seriesPreds: Record<string, Record<string, { picked_winner_id: number; score: string }>> = {};
  for (const s of allSeries || []) {
    seriesPreds[s.id] = {};
    const sp = seriesPredictions?.filter((p) => p.series_id === s.id) || [];
    for (const p of sp) {
      seriesPreds[s.id][p.user_id] = {
        picked_winner_id: p.predicted_winner_id,
        score: `${p.predicted_home_wins}-${p.predicted_away_wins}`,
      };
    }
  }

  const enrichedGames = games.map((g) => ({
    ...g,
    home_team: teamsMap.get(g.home_team_id),
    away_team: teamsMap.get(g.away_team_id),
  }));

  const enrichedSeries = (allSeries || []).map((s) => ({
    ...s,
    home_team: teamsMap.get(s.team_home_id),
    away_team: teamsMap.get(s.team_away_id),
  }));

  // Daily questions where betting is closed (game started) or resolved
  const { data: allDailyQuestions } = await supabase
    .from("nba_daily_questions")
    .select("*, game:nba_games!nba_daily_questions_game_id_fkey(status, game_date, home_team_id, away_team_id)")
    .order("question_date", { ascending: false });

  const visibleDailyQuestions = (allDailyQuestions || []).filter((q) => {
    const game = q.game as { status: string; game_date: string } | null;
    if (!game) return false;
    if (game.status !== "upcoming") return true;
    const lockTime = new Date(new Date(game.game_date).getTime() - closeMinutes * 60 * 1000);
    return now >= lockTime;
  });

  const { data: dailyPicks } = visibleDailyQuestions.length > 0
    ? await supabase
        .from("nba_daily_picks")
        .select("*")
        .in("question_id", visibleDailyQuestions.map((q) => q.id))
    : { data: [] };

  // Map: question_id -> user_id -> { picked_option, points }
  const dailyPicksMap: Record<string, Record<string, { picked_option: string; points: number }>> = {};
  for (const q of visibleDailyQuestions) {
    dailyPicksMap[q.id] = {};
    const picks = dailyPicks?.filter((p) => p.question_id === q.id) || [];
    for (const p of picks) {
      dailyPicksMap[q.id][p.user_id] = {
        picked_option: p.picked_option,
        points: p.points_earned,
      };
    }
  }

  return NextResponse.json({
    games: enrichedGames,
    series: enrichedSeries,
    users: users || [],
    gamePredictions: gamePreds,
    seriesPredictions: seriesPreds,
    dailyQuestions: visibleDailyQuestions,
    dailyPicks: dailyPicksMap,
  });
}
