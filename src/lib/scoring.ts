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
  const pointsSeriesScore = settings.points_correct_series_score ?? 6;
  const pointsTournamentWinner = settings.points_tournament_winner ?? 10;
  const pointsUpset = settings.points_upset_bonus ?? 3;
  const pointsStreak3 = settings.points_streak_3 ?? 1;
  const pointsStreak5 = settings.points_streak_5 ?? 3;
  const pointsStreak7 = settings.points_streak_7 ?? 5;
  const pointsSniper = settings.points_sniper ?? 3;

  // Load all data
  const { data: finishedGames } = await supabase
    .from("nba_games")
    .select("*")
    .eq("status", "finished")
    .order("game_date", { ascending: true });

  const { data: allPredictions } = await supabase
    .from("nba_predictions")
    .select("*");

  const { data: users } = await supabase.from("nba_users").select("id");
  const { data: allSeries } = await supabase.from("nba_series").select("*");

  if (!finishedGames || !allPredictions || !users) return;

  // 1. Per-game points
  for (const prediction of allPredictions) {
    const game = finishedGames.find((g) => g.id === prediction.game_id);
    if (!game) {
      if (prediction.points_earned !== 0) {
        await supabase
          .from("nba_predictions")
          .update({ points_earned: 0 })
          .eq("id", prediction.id);
      }
      continue;
    }

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

  // 2. Series bonuses (winner, exact score, upset, sniper)
  const finishedSeries = (allSeries || []).filter(
    (s) => s.status === "finished" && s.round !== "play_in"
  );

  // Clear old bonuses and recalculate
  await supabase.from("nba_series_bonuses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("nba_bonuses").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const series of finishedSeries) {
    if (!series.winner_id) continue;

    const seriesGames = finishedGames.filter(
      (g) => g.series_id === series.id
    );
    if (seriesGames.length === 0) continue;

    // Is this an upset? (away team won = lower seed upset)
    const isUpset = series.winner_id === series.team_away_id;

    for (const user of users) {
      const userPredictions = allPredictions.filter(
        (p) =>
          p.user_id === user.id &&
          seriesGames.some((g) => g.id === p.game_id)
      );

      if (userPredictions.length === 0) continue;

      // Count predicted wins
      let predictedHomeWins = 0;
      let predictedAwayWins = 0;
      let correctInSeries = 0;

      for (const pred of userPredictions) {
        const game = seriesGames.find((g) => g.id === pred.game_id);
        if (!game) continue;

        const actualWinner =
          game.home_score > game.away_score
            ? game.home_team_id
            : game.away_team_id;
        const predictedWinner =
          pred.predicted_home_score > pred.predicted_away_score
            ? game.home_team_id
            : game.away_team_id;

        if (predictedWinner === series.team_home_id) predictedHomeWins++;
        else predictedAwayWins++;

        if (actualWinner === predictedWinner) correctInSeries++;
      }

      const userPredictedWinner =
        predictedHomeWins > predictedAwayWins
          ? series.team_home_id
          : predictedAwayWins > predictedHomeWins
          ? series.team_away_id
          : null;

      if (userPredictedWinner === series.winner_id) {
        // Check exact score
        const actualScore = `${series.home_wins}-${series.away_wins}`;
        const userScore =
          series.winner_id === series.team_home_id
            ? `${predictedHomeWins}-${predictedAwayWins}`
            : `${predictedAwayWins}-${predictedHomeWins}`;

        const isExact = actualScore === userScore;

        // Series winner/exact bonus
        await supabase.from("nba_series_bonuses").insert({
          user_id: user.id,
          series_id: series.id,
          bonus_type: isExact ? "series_exact" : "series_winner",
          points: isExact ? pointsSeriesScore : pointsSeriesWinner,
        });

        // Upset bonus
        if (isUpset) {
          await supabase.from("nba_bonuses").insert({
            user_id: user.id,
            bonus_type: "upset",
            points: pointsUpset,
            description: `Апсет: предсказал победу нижнего сида`,
            context: series.id,
          });
        }
      }

      // Sniper bonus: guessed ALL games in the series correctly
      if (
        correctInSeries === seriesGames.length &&
        seriesGames.length >= 4
      ) {
        await supabase.from("nba_bonuses").insert({
          user_id: user.id,
          bonus_type: "sniper",
          points: pointsSniper,
          description: `Снайпер: все ${seriesGames.length} матчей серии угаданы`,
          context: series.id,
        });
      }
    }
  }

  // 3. Streak bonuses
  for (const user of users) {
    const userPreds = allPredictions
      .filter((p) => p.user_id === user.id)
      .map((p) => {
        const game = finishedGames.find((g) => g.id === p.game_id);
        if (!game) return null;
        const actualWinner =
          game.home_score > game.away_score
            ? game.home_team_id
            : game.away_team_id;
        const predictedWinner =
          p.predicted_home_score > p.predicted_away_score
            ? game.home_team_id
            : game.away_team_id;
        return {
          game_date: game.game_date,
          correct: actualWinner === predictedWinner,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.game_date.localeCompare(b!.game_date));

    // Find max streak
    let maxStreak = 0;
    let currentStreak = 0;

    for (const pred of userPreds) {
      if (pred!.correct) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // Award streak bonuses (only highest applicable)
    if (maxStreak >= 7) {
      await supabase.from("nba_bonuses").insert({
        user_id: user.id,
        bonus_type: "streak",
        points: pointsStreak7,
        description: `Стрик ${maxStreak} угаданных подряд`,
      });
    } else if (maxStreak >= 5) {
      await supabase.from("nba_bonuses").insert({
        user_id: user.id,
        bonus_type: "streak",
        points: pointsStreak5,
        description: `Стрик ${maxStreak} угаданных подряд`,
      });
    } else if (maxStreak >= 3) {
      await supabase.from("nba_bonuses").insert({
        user_id: user.id,
        bonus_type: "streak",
        points: pointsStreak3,
        description: `Стрик ${maxStreak} угаданных подряд`,
      });
    }
  }

  // 4. Tournament winner
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

  // 5. Rebuild leaderboard
  await rebuildLeaderboard();

  // 6. Generate events
  await generateEvents();
}

async function rebuildLeaderboard() {
  const { data: users } = await supabase.from("nba_users").select("id");
  if (!users) return;

  for (const user of users) {
    const { data: predictions } = await supabase
      .from("nba_predictions")
      .select("points_earned")
      .eq("user_id", user.id);

    const gamePoints =
      predictions?.reduce((sum, p) => sum + (p.points_earned || 0), 0) ?? 0;
    const correctWinners =
      predictions?.filter((p) => p.points_earned > 0).length ?? 0;
    const totalPredictions = predictions?.length ?? 0;

    const { data: seriesBonuses } = await supabase
      .from("nba_series_bonuses")
      .select("points")
      .eq("user_id", user.id);

    const seriesPoints =
      seriesBonuses?.reduce((sum, b) => sum + b.points, 0) ?? 0;
    const correctSeries = seriesBonuses?.length ?? 0;

    // General bonuses (streaks, sniper, upset)
    const { data: bonuses } = await supabase
      .from("nba_bonuses")
      .select("points")
      .eq("user_id", user.id);

    const bonusPoints =
      bonuses?.reduce((sum, b) => sum + b.points, 0) ?? 0;

    const { data: winnerPred } = await supabase
      .from("nba_winner_predictions")
      .select("points_earned")
      .eq("user_id", user.id)
      .single();

    const winnerPoints = winnerPred?.points_earned ?? 0;

    const totalPoints =
      gamePoints + seriesPoints + bonusPoints + winnerPoints;

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

async function generateEvents() {
  const { data: users } = await supabase.from("nba_users").select("id, name, display_name");
  const { data: existingEvents } = await supabase.from("nba_events").select("user_id, event_type");
  if (!users) return;

  const hasEvent = (userId: string, type: string) =>
    existingEvents?.some((e) => e.user_id === userId && e.event_type === type) ?? false;

  async function addEvent(userId: string, type: string, title: string, icon: string) {
    if (hasEvent(userId, type)) return;
    await supabase.from("nba_events").insert({ user_id: userId, event_type: type, title, icon });
  }

  for (const user of users) {
    const name = user.display_name || user.name || "Игрок";

    // Predictions count
    const { data: preds } = await supabase
      .from("nba_predictions")
      .select("points_earned")
      .eq("user_id", user.id);

    const total = preds?.length ?? 0;
    const correct = preds?.filter((p) => p.points_earned > 0).length ?? 0;

    // First prediction
    if (total >= 1) {
      await addEvent(user.id, "first_prediction", `${name} сделал первый прогноз`, "target");
    }

    // First point
    if (correct >= 1) {
      await addEvent(user.id, "first_point", `${name} набрал первый балл!`, "trophy");
    }

    // Milestones
    if (correct >= 10) {
      await addEvent(user.id, "correct_10", `${name} угадал 10 матчей`, "target");
    }
    if (correct >= 20) {
      await addEvent(user.id, "correct_20", `${name} угадал 20 матчей`, "target");
    }
    if (correct >= 30) {
      await addEvent(user.id, "correct_30", `${name} угадал 30 матчей!`, "target");
    }

    // Accuracy
    if (total >= 10) {
      const accuracy = Math.round((correct / total) * 100);
      if (accuracy >= 80) {
        await addEvent(user.id, "accuracy_80", `${name} - точность прогнозов выше 80%!`, "crosshair");
      }
    }

    // Streak
    const { data: finishedGames } = await supabase
      .from("nba_games")
      .select("id, home_team_id, away_team_id, home_score, away_score, game_date")
      .eq("status", "finished")
      .order("game_date", { ascending: true });

    let maxStreak = 0;
    let currentStreak = 0;
    const userPreds = preds?.map((p) => {
      const g = finishedGames?.find((g) => g.id === (p as unknown as { game_id: number }).game_id);
      return g ? { correct: p.points_earned > 0 } : null;
    }).filter(Boolean) || [];

    for (const p of userPreds) {
      if (p!.correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else currentStreak = 0;
    }

    if (maxStreak >= 3) {
      await addEvent(user.id, `streak_${maxStreak >= 7 ? 7 : maxStreak >= 5 ? 5 : 3}`,
        `${name} - стрик ${maxStreak} угаданных подряд!`, "flame");
    }

    // Bonuses
    const { data: bonuses } = await supabase
      .from("nba_bonuses")
      .select("bonus_type")
      .eq("user_id", user.id);

    if (bonuses?.some((b) => b.bonus_type === "sniper")) {
      await addEvent(user.id, "sniper", `${name} получил бонус Снайпер!`, "crosshair");
    }
    if (bonuses?.some((b) => b.bonus_type === "upset")) {
      await addEvent(user.id, "upset", `${name} предсказал апсет!`, "trending-up");
    }
  }

  // Leaderboard position changes
  const { data: leaderboard } = await supabase
    .from("nba_leaderboard")
    .select("user_id, total_points")
    .order("total_points", { ascending: false });

  if (leaderboard && leaderboard.length > 0) {
    for (let i = 0; i < Math.min(3, leaderboard.length); i++) {
      const entry = leaderboard[i];
      if (entry.total_points === 0) continue;
      const user = users.find((u) => u.id === entry.user_id);
      const name = user?.display_name || user?.name || "Игрок";
      const place = i + 1;
      const placeText = place === 1 ? "1-е место" : place === 2 ? "2-е место" : "3-е место";
      const emoji = place === 1 ? "crown" : "trophy";
      await addEvent(entry.user_id, `place_${place}`, `${name} занимает ${placeText} в рейтинге!`, emoji);
    }
  }
}
