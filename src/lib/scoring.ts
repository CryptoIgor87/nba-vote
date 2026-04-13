import { supabase } from "./supabase";
import type { NbaSetting } from "./types";

export async function getSettings(): Promise<Record<string, number>> {
  const { data } = await supabase.from("nba_settings").select("*");
  const map: Record<string, number> = {};
  data?.forEach((s: NbaSetting) => {
    map[s.key] = s.value;
  });
  return map;
}

export async function recalculateScores() {
  const settings = await getSettings();
  const pointsWinner = settings.points_correct_winner ?? 1;
  const pointsSeriesWinner = settings.points_correct_series_winner ?? 2;
  const pointsSeriesScore = settings.points_correct_series_score ?? 4;
  const pointsTournamentWinner = settings.points_tournament_winner ?? 10;

  // 1. Calculate per-game points
  const { data: finishedGames } = await supabase
    .from("nba_games")
    .select("*")
    .eq("status", "finished");

  const { data: allPredictions } = await supabase
    .from("nba_predictions")
    .select("*");

  if (!finishedGames || !allPredictions) return;

  for (const prediction of allPredictions) {
    const game = finishedGames.find((g) => g.id === prediction.game_id);
    if (!game) {
      // Game not finished yet — reset to 0
      if (prediction.points_earned !== 0) {
        await supabase
          .from("nba_predictions")
          .update({ points_earned: 0 })
          .eq("id", prediction.id);
      }
      continue;
    }

    // Check if predicted winner correctly
    const actualWinner =
      game.home_score > game.away_score
        ? game.home_team_id
        : game.away_team_id;
    const predictedWinner =
      prediction.predicted_home_score > prediction.predicted_away_score
        ? game.home_team_id
        : game.away_team_id;

    const points = actualWinner === predictedWinner ? pointsWinner : 0;

    if (prediction.points_earned !== points) {
      await supabase
        .from("nba_predictions")
        .update({ points_earned: points })
        .eq("id", prediction.id);
    }
  }

  // 2. Calculate series bonuses
  const { data: finishedSeries } = await supabase
    .from("nba_series")
    .select("*")
    .eq("status", "finished")
    .not("round", "eq", "play_in"); // Play-in has no series bonus

  if (finishedSeries) {
    // Get all users
    const { data: users } = await supabase.from("nba_users").select("id");

    for (const series of finishedSeries) {
      if (!series.winner_id) continue;

      // Get all games in this series
      const { data: seriesGames } = await supabase
        .from("nba_games")
        .select("*")
        .eq("series_id", series.id)
        .eq("status", "finished");

      if (!seriesGames || seriesGames.length === 0) continue;

      for (const user of users || []) {
        // Get user's predictions for games in this series
        const gameIds = seriesGames.map((g) => g.id);
        const userPredictions = allPredictions.filter(
          (p) =>
            p.user_id === user.id && gameIds.includes(p.game_id)
        );

        if (userPredictions.length === 0) continue;

        // Count predicted wins for each team
        let predictedHomeWins = 0;
        let predictedAwayWins = 0;

        for (const pred of userPredictions) {
          const game = seriesGames.find((g) => g.id === pred.game_id);
          if (!game) continue;

          const predictedWinner =
            pred.predicted_home_score > pred.predicted_away_score
              ? game.home_team_id
              : game.away_team_id;

          if (predictedWinner === series.team_home_id) predictedHomeWins++;
          else predictedAwayWins++;
        }

        // Did user predict the right series winner?
        const userPredictedWinner =
          predictedHomeWins > predictedAwayWins
            ? series.team_home_id
            : predictedAwayWins > predictedHomeWins
            ? series.team_away_id
            : null;

        if (userPredictedWinner === series.winner_id) {
          // Check if exact series score matches
          const actualScore = `${series.home_wins}-${series.away_wins}`;
          const userScore =
            series.winner_id === series.team_home_id
              ? `${predictedHomeWins}-${predictedAwayWins}`
              : `${predictedAwayWins}-${predictedHomeWins}`;

          const isExact = actualScore === userScore;

          // Clear old bonuses for this series
          await supabase
            .from("nba_series_bonuses")
            .delete()
            .eq("user_id", user.id)
            .eq("series_id", series.id);

          if (isExact) {
            // Exact series score — award higher bonus
            await supabase.from("nba_series_bonuses").insert({
              user_id: user.id,
              series_id: series.id,
              bonus_type: "series_exact",
              points: pointsSeriesScore,
            });
          } else {
            // Just correct winner
            await supabase.from("nba_series_bonuses").insert({
              user_id: user.id,
              series_id: series.id,
              bonus_type: "series_winner",
              points: pointsSeriesWinner,
            });
          }
        } else {
          // Wrong or no prediction — remove bonuses
          await supabase
            .from("nba_series_bonuses")
            .delete()
            .eq("user_id", user.id)
            .eq("series_id", series.id);
        }
      }
    }
  }

  // 3. Check tournament winner
  const { data: finalsSeries } = await supabase
    .from("nba_series")
    .select("*")
    .eq("round", "finals")
    .eq("status", "finished")
    .single();

  if (finalsSeries?.winner_id) {
    const { data: winnerPredictions } = await supabase
      .from("nba_winner_predictions")
      .select("*");

    for (const wp of winnerPredictions || []) {
      const points =
        wp.team_id === finalsSeries.winner_id ? pointsTournamentWinner : 0;
      if (wp.points_earned !== points) {
        await supabase
          .from("nba_winner_predictions")
          .update({ points_earned: points })
          .eq("id", wp.id);
      }
    }
  }

  // 4. Rebuild leaderboard
  await rebuildLeaderboard();
}

async function rebuildLeaderboard() {
  const { data: users } = await supabase.from("nba_users").select("id");
  if (!users) return;

  for (const user of users) {
    // Game prediction points
    const { data: predictions } = await supabase
      .from("nba_predictions")
      .select("points_earned")
      .eq("user_id", user.id);

    const gamePoints =
      predictions?.reduce((sum, p) => sum + (p.points_earned || 0), 0) ?? 0;
    const correctWinners =
      predictions?.filter((p) => p.points_earned > 0).length ?? 0;
    const totalPredictions = predictions?.length ?? 0;

    // Series bonuses
    const { data: bonuses } = await supabase
      .from("nba_series_bonuses")
      .select("points")
      .eq("user_id", user.id);

    const seriesPoints =
      bonuses?.reduce((sum, b) => sum + b.points, 0) ?? 0;
    const correctSeries = bonuses?.length ?? 0;

    // Tournament winner
    const { data: winnerPred } = await supabase
      .from("nba_winner_predictions")
      .select("points_earned")
      .eq("user_id", user.id)
      .single();

    const winnerPoints = winnerPred?.points_earned ?? 0;

    const totalPoints = gamePoints + seriesPoints + winnerPoints;

    await supabase.from("nba_leaderboard").upsert(
      {
        user_id: user.id,
        total_points: totalPoints,
        correct_winners: correctWinners,
        correct_series: correctSeries,
        total_predictions: totalPredictions,
      },
      { onConflict: "user_id" }
    );
  }
}
