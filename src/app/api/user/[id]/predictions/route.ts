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
    const s = allSeries?.find((x) => x.id === sp.series_id);
    if (!s) return false;
    if (s.status !== "upcoming") return true;
    // For upcoming series, show only if first game is locked
    const seriesGames = games?.filter((g) =>
      (g.home_team_id === s.team_home_id && g.away_team_id === s.team_away_id) ||
      (g.home_team_id === s.team_away_id && g.away_team_id === s.team_home_id)
    ) || [];
    return seriesGames.some((g) => {
      const lockTime = new Date(new Date(g.game_date).getTime() - closeMinutes * 60 * 1000);
      return now >= lockTime;
    });
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

  // General bonuses (streaks, sniper, upset)
  const { data: bonuses } = await supabase
    .from("nba_bonuses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  // Calculate stats
  const finishedGames = games?.filter((g) => g.status === "finished") || [];
  const predsForFinished = visiblePredictions?.filter((p) =>
    finishedGames.some((g) => g.id === p.game_id)
  ) || [];
  const correctPreds = predsForFinished.filter((p) => p.points_earned > 0);

  // Daily question picks — only show where the game is locked
  const { data: allDailyPicks } = await supabase
    .from("nba_daily_picks")
    .select("*, question:nba_daily_questions!nba_daily_picks_question_id_fkey(*)")
    .eq("user_id", userId);

  const dailyPicks = allDailyPicks?.filter((dp) => {
    const q = dp.question as { game_id: number } | null;
    if (!q) return false;
    const game = games?.find((g) => g.id === q.game_id);
    if (!game) return false;
    const lockTime = new Date(new Date(game.game_date).getTime() - closeMinutes * 60 * 1000);
    return now >= lockTime;
  });

  // Streak calculation (game predictions + daily questions)
  const gamePredStreaks = (predictions || [])
    .map((p) => {
      const game = finishedGames.find((g) => g.id === p.game_id);
      if (!game) return null;
      return { game_date: game.game_date, correct: p.points_earned > 0 };
    })
    .filter(Boolean);

  const dailyStreaks = (dailyPicks || [])
    .filter((dp) => (dp.question as { status: string })?.status === "resolved")
    .map((dp) => {
      const q = dp.question as { game_id: number };
      const game = finishedGames.find((g) => g.id === q?.game_id);
      if (!game) return null;
      return { game_date: game.game_date, correct: dp.points_earned > 0 };
    })
    .filter(Boolean);

  const predsInOrder = [...gamePredStreaks, ...dailyStreaks]
    .sort((a, b) => a!.game_date.localeCompare(b!.game_date));

  let maxStreak = 0;
  let currentStreak = 0;
  for (const p of predsInOrder) {
    if (p!.correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 0;
  }

  const dailyPoints = dailyPicks?.reduce((s, p) => s + (p.points_earned || 0), 0) || 0;
  const resolvedDailyPicks = dailyPicks?.filter((dp) =>
    (dp.question as { status: string })?.status === "resolved"
  ) || [];
  const correctDailyPicks = resolvedDailyPicks.filter((dp) => dp.points_earned > 0);

  const totalPredictions = predsForFinished.length + resolvedDailyPicks.length;
  const totalCorrect = correctPreds.length + correctDailyPicks.length;

  const stats = {
    totalPredictions,
    correctPredictions: totalCorrect,
    accuracy: totalPredictions > 0
      ? Math.round((totalCorrect / totalPredictions) * 100)
      : 0,
    maxStreak,
    currentStreak,
    gamePoints: predsForFinished.reduce((s, p) => s + (p.points_earned || 0), 0),
    seriesBonusPoints: seriesBonuses?.reduce((s, b) => s + b.points, 0) || 0,
    generalBonusPoints: bonuses?.reduce((s, b) => s + b.points, 0) || 0,
    streakBonusPoints: bonuses?.filter(b => b.bonus_type === "streak").reduce((s, b) => s + b.points, 0) || 0,
    streakBonusCount: bonuses?.filter(b => b.bonus_type === "streak").length || 0,
    otherBonusPoints: bonuses?.filter(b => b.bonus_type !== "streak").reduce((s, b) => s + b.points, 0) || 0,
    winnerPoints: winnerPrediction?.points_earned || 0,
    dailyQuestionPoints: dailyPoints,
  };

  return NextResponse.json({
    user,
    predictions: visiblePredictions,
    seriesPredictions: visibleSeriesPreds,
    seriesBonuses,
    bonuses,
    winnerPrediction,
    dailyPicks,
    games: enrichedGames,
    series: allSeries,
    teams: teams,
    stats,
  });
}
