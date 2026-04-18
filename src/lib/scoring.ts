import { supabase } from "./supabase";
import { getTopPlayersByStat } from "./nba-cdn";
import type { DailyQuestionCategory, NbaSetting } from "./types";

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

  // Load daily picks for streak calculation
  const { data: allDailyPicks } = await supabase
    .from("nba_daily_picks")
    .select("*, question:nba_daily_questions!nba_daily_picks_question_id_fkey(game_id, status, correct_answer)");

  // 3. Streak bonuses (game predictions + daily questions)
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
      .filter(Boolean);

    // Add resolved daily picks to the streak
    const userDailyPicks = (allDailyPicks || [])
      .filter((dp) => dp.user_id === user.id && (dp.question as unknown as { status: string })?.status === "resolved")
      .map((dp) => {
        const q = dp.question as { game_id: number; status: string; correct_answer: string | null };
        const game = finishedGames.find((g) => g.id === q?.game_id);
        if (!game) return null;
        return {
          game_date: game.game_date,
          correct: dp.points_earned > 0,
        };
      })
      .filter(Boolean);

    const allStreakItems = [...userPreds, ...userDailyPicks]
      .sort((a, b) => a!.game_date.localeCompare(b!.game_date));

    // Find all streaks and award bonus for each one that hits a threshold
    let currentStreak = 0;
    const streaks: number[] = [];

    for (const pred of allStreakItems) {
      if (pred!.correct) {
        currentStreak++;
      } else {
        if (currentStreak >= 3) streaks.push(currentStreak);
        currentStreak = 0;
      }
    }
    // Don't forget the trailing streak (still active)
    if (currentStreak >= 3) streaks.push(currentStreak);

    // Award bonus for each qualifying streak (highest tier per streak)
    for (const streak of streaks) {
      if (streak >= 7) {
        await supabase.from("nba_bonuses").insert({
          user_id: user.id,
          bonus_type: "streak",
          points: pointsStreak7,
          description: `Стрик ${streak} угаданных подряд`,
        });
      } else if (streak >= 5) {
        await supabase.from("nba_bonuses").insert({
          user_id: user.id,
          bonus_type: "streak",
          points: pointsStreak5,
          description: `Стрик ${streak} угаданных подряд`,
        });
      } else {
        await supabase.from("nba_bonuses").insert({
          user_id: user.id,
          bonus_type: "streak",
          points: pointsStreak3,
          description: `Стрик ${streak} угаданных подряд`,
        });
      }
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

  // 5. Resolve daily questions
  const pointsDailyQuestion = settings.points_daily_question ?? 1;
  await resolveDailyQuestions(pointsDailyQuestion);

  // 6. Rebuild leaderboard
  await rebuildLeaderboard();

  // 7. Generate events
  await generateEvents();

  // 8. Check achievements
  await checkAchievements();
}

async function resolveDailyQuestions(pointsDailyQuestion: number) {
  // Find active questions where the game is finished
  const { data: activeQuestions } = await supabase
    .from("nba_daily_questions")
    .select("*, game:nba_games!nba_daily_questions_game_id_fkey(status)")
    .eq("status", "active");

  if (!activeQuestions) return;

  for (const q of activeQuestions) {
    const game = q.game as { status: string } | null;
    if (game?.status !== "finished") continue;
    if (!q.nba_game_id) continue;

    // Get ALL top players (handles ties)
    const tops = await getTopPlayersByStat(
      q.nba_game_id,
      q.category as DailyQuestionCategory
    );
    if (tops.length === 0) continue;

    const topValue = tops[0].value;
    const topNames = tops.map((t) => t.name);

    // Determine correct answers — any of the tied leaders, or "other" if none are in options
    const playerNames = [q.player1_name, q.player2_name, q.player3_name, q.player4_name];
    const correctOptions = playerNames.filter((name) => topNames.includes(name));
    // If none of the 4 options are among the leaders, "other" is correct
    if (correctOptions.length === 0) correctOptions.push("other");

    // Store the first correct answer for display
    const correctAnswer = correctOptions[0];

    // Update question
    await supabase
      .from("nba_daily_questions")
      .update({
        correct_answer: correctAnswer,
        correct_value: topValue,
        status: "resolved",
      })
      .eq("id", q.id);

    // Award points to anyone who picked ANY correct option
    for (const opt of correctOptions) {
      await supabase
        .from("nba_daily_picks")
        .update({ points_earned: pointsDailyQuestion })
        .eq("question_id", q.id)
        .eq("picked_option", opt);
    }

    // Zero out wrong picks
    const { data: allPicks } = await supabase
      .from("nba_daily_picks")
      .select("id, picked_option")
      .eq("question_id", q.id);

    for (const pick of allPicks || []) {
      if (!correctOptions.includes(pick.picked_option)) {
        await supabase
          .from("nba_daily_picks")
          .update({ points_earned: 0 })
          .eq("id", pick.id);
      }
    }
  }
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
    // Count all predictions: matches + series + winner
    const { count: seriesPredCount } = await supabase
      .from("nba_series_predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: winnerPredCount } = await supabase
      .from("nba_winner_predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: dailyPickCount } = await supabase
      .from("nba_daily_picks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const totalPredictions = (predictions?.length ?? 0) + (seriesPredCount ?? 0) + (winnerPredCount ?? 0) + (dailyPickCount ?? 0);

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

    // Daily question points
    const { data: dailyPicks } = await supabase
      .from("nba_daily_picks")
      .select("points_earned")
      .eq("user_id", user.id);

    const dailyPoints =
      dailyPicks?.reduce((sum, p) => sum + (p.points_earned || 0), 0) ?? 0;

    const totalPoints =
      gamePoints + seriesPoints + bonusPoints + winnerPoints + dailyPoints;

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
  const settings = await getSettings();
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
      .select("game_id, points_earned")
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

    // Streak (games + daily questions)
    const { data: finishedGames } = await supabase
      .from("nba_games")
      .select("id, home_team_id, away_team_id, home_score, away_score, game_date")
      .eq("status", "finished")
      .order("game_date", { ascending: true });

    const { data: userDailyPicks } = await supabase
      .from("nba_daily_picks")
      .select("points_earned, question:nba_daily_questions!nba_daily_picks_question_id_fkey(game_id, status)")
      .eq("user_id", user.id);

    let maxStreak = 0;
    let currentStreak = 0;
    const gamePredItems = preds?.map((p) => {
      const g = finishedGames?.find((g) => g.id === p.game_id);
      return g ? { game_date: g.game_date, correct: p.points_earned > 0 } : null;
    }).filter(Boolean) || [];

    const dailyItems = (userDailyPicks || [])
      .filter((dp) => (dp.question as unknown as { status: string })?.status === "resolved")
      .map((dp) => {
        const q = dp.question as unknown as { game_id: number };
        const g = finishedGames?.find((g) => g.id === q?.game_id);
        return g ? { game_date: g.game_date, correct: dp.points_earned > 0 } : null;
      })
      .filter(Boolean);

    const allItems = [...gamePredItems, ...dailyItems]
      .sort((a, b) => a!.game_date.localeCompare(b!.game_date));

    for (const p of allItems) {
      if (p!.correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else currentStreak = 0;
    }

    if (maxStreak >= 3) {
      const streakPts = maxStreak >= 7 ? (settings.points_streak_7 ?? 5) : maxStreak >= 5 ? (settings.points_streak_5 ?? 3) : (settings.points_streak_3 ?? 1);
      await addEvent(user.id, `streak_${maxStreak >= 7 ? 7 : maxStreak >= 5 ? 5 : 3}`,
        `${name} - стрик ${maxStreak} угаданных подряд! +${streakPts}`, "flame");
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

}

async function checkAchievements() {
  const { data: users } = await supabase.from("nba_users").select("id");
  if (!users) return;

  async function unlock(userId: string, achievementId: string) {
    await supabase.from("nba_user_achievements").upsert(
      { user_id: userId, achievement_id: achievementId },
      { onConflict: "user_id,achievement_id" }
    );
  }

  const { data: finishedGames } = await supabase
    .from("nba_games")
    .select("*")
    .eq("status", "finished")
    .order("game_date", { ascending: true });

  const { data: leaderboard } = await supabase
    .from("nba_leaderboard")
    .select("user_id, total_points")
    .order("total_points", { ascending: false });

  for (const user of users) {
    const { data: preds } = await supabase
      .from("nba_predictions")
      .select("game_id, points_earned")
      .eq("user_id", user.id);

    const totalPreds = preds?.length ?? 0;
    const correctPreds = preds?.filter((p) => p.points_earned > 0).length ?? 0;

    // Predictions count
    if (totalPreds >= 1) await unlock(user.id, "rookie");
    if (totalPreds >= 10) await unlock(user.id, "regular");
    if (totalPreds >= 30) await unlock(user.id, "dedicated");

    // Correct predictions
    if (correctPreds >= 1) await unlock(user.id, "first_blood");
    if (correctPreds >= 10) await unlock(user.id, "sharpshooter");
    if (correctPreds >= 25) await unlock(user.id, "oracle");

    // Accuracy
    if (totalPreds >= 10) {
      const accuracy = correctPreds / totalPreds;
      if (accuracy >= 0.75) await unlock(user.id, "prophet");
      if (totalPreds >= 15 && accuracy >= 0.85) await unlock(user.id, "nostradamus");
    }

    // Streaks (games + daily questions)
    let maxStreak = 0;
    let currentStreak = 0;
    const predsWithGames = (preds || [])
      .map((p) => {
        const g = finishedGames?.find((g) => g.id === p.game_id);
        return g ? { date: g.game_date, correct: p.points_earned > 0 } : null;
      })
      .filter(Boolean);

    const { data: achDailyPicks } = await supabase
      .from("nba_daily_picks")
      .select("points_earned, question:nba_daily_questions!nba_daily_picks_question_id_fkey(game_id, status)")
      .eq("user_id", user.id);

    const achDailyItems = (achDailyPicks || [])
      .filter((dp) => (dp.question as unknown as { status: string })?.status === "resolved")
      .map((dp) => {
        const q = dp.question as unknown as { game_id: number };
        const g = finishedGames?.find((g) => g.id === q?.game_id);
        return g ? { date: g.game_date, correct: dp.points_earned > 0 } : null;
      })
      .filter(Boolean);

    const achAllItems = [...predsWithGames, ...achDailyItems]
      .sort((a, b) => a!.date.localeCompare(b!.date));

    for (const p of achAllItems) {
      if (p!.correct) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
      else currentStreak = 0;
    }

    if (maxStreak >= 3) await unlock(user.id, "hot_hand");
    if (maxStreak >= 5) await unlock(user.id, "on_fire");
    if (maxStreak >= 7) await unlock(user.id, "unstoppable");
    if (maxStreak >= 10) await unlock(user.id, "legendary");

    // Series bonuses
    const { data: seriesBonuses } = await supabase
      .from("nba_series_bonuses")
      .select("bonus_type")
      .eq("user_id", user.id);

    if (seriesBonuses?.some((b) => b.bonus_type === "series_winner" || b.bonus_type === "series_exact")) {
      await unlock(user.id, "series_master");
    }
    if (seriesBonuses?.some((b) => b.bonus_type === "series_exact")) {
      await unlock(user.id, "exact_science");
    }

    // Sniper / Upset bonuses
    const { data: bonuses } = await supabase
      .from("nba_bonuses")
      .select("bonus_type")
      .eq("user_id", user.id);

    if (bonuses?.some((b) => b.bonus_type === "sniper")) await unlock(user.id, "sniper");

    const upsetCount = bonuses?.filter((b) => b.bonus_type === "upset").length ?? 0;
    if (upsetCount >= 1) await unlock(user.id, "upset_king");
    if (upsetCount >= 2) await unlock(user.id, "double_upset");

    // Leaderboard position — only meaningful with enough data
    const finishedCount = finishedGames?.length ?? 0;
    const participantCount = leaderboard?.filter((l) => l.total_points > 0).length ?? 0;
    if (leaderboard && finishedCount >= 10 && participantCount >= 5) {
      const rank = leaderboard.findIndex((l) => l.user_id === user.id);
      const points = leaderboard[rank]?.total_points ?? 0;
      if (rank >= 0 && rank < 3 && points > 0) await unlock(user.id, "podium");
      if (rank === 0 && points > 0) await unlock(user.id, "champion");
    }
    if (leaderboard) {
      const rank = leaderboard.findIndex((l) => l.user_id === user.id);
      const points = leaderboard[rank]?.total_points ?? 0;
      if (points >= 20) await unlock(user.id, "point_hunter");
      if (points >= 50) await unlock(user.id, "half_century");
    }

    // Chat messages
    const { count: msgCount } = await supabase
      .from("nba_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((msgCount ?? 0) >= 5) await unlock(user.id, "chatterbox");

    // Tournament winner
    const { data: wp } = await supabase
      .from("nba_winner_predictions")
      .select("points_earned")
      .eq("user_id", user.id)
      .single();
    if (wp?.points_earned > 0) await unlock(user.id, "fortune_teller");
  }
}
