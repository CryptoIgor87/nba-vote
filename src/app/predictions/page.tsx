"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import GameCard from "@/components/predictions/GameCard";
import WinnerPicker from "@/components/predictions/WinnerPicker";
import SeriesPrediction from "@/components/predictions/SeriesPrediction";
import DailyQuestion from "@/components/predictions/DailyQuestion";
import type { NbaGame, NbaPrediction, NbaTeam, NbaSeries, NbaDailyQuestion, NbaDailyPick } from "@/lib/types";

interface SeriesWithTeams extends NbaSeries {
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

interface SeriesPred {
  series_id: string;
  predicted_winner_id: number;
  predicted_home_wins: number;
  predicted_away_wins: number;
}

export default function PredictionsPage() {
  const { data: session } = useSession();
  const [games, setGames] = useState<NbaGame[]>([]);
  const [predictions, setPredictions] = useState<NbaPrediction[]>([]);
  const [seriesBonuses, setSeriesBonuses] = useState<
    { series_id: string; bonus_type: string; points: number }[]
  >([]);
  const [teams, setTeams] = useState<NbaTeam[]>([]);
  const [allSeries, setAllSeries] = useState<SeriesWithTeams[]>([]);
  const [seriesPredictions, setSeriesPredictions] = useState<SeriesPred[]>([]);
  const [dailyQuestions, setDailyQuestions] = useState<(NbaDailyQuestion & { game?: NbaGame & { home_team?: NbaTeam; away_team?: NbaTeam } })[]>([]);
  const [dailyPicks, setDailyPicks] = useState<Record<string, NbaDailyPick>>({});
  const [dailyPickCounts, setDailyPickCounts] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Update now every 30 seconds so locks activate in real time
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function load() {
      const [gamesRes, predsRes, teamsRes, bonusesRes, seriesRes, seriesPredsRes, dailyRes] =
        await Promise.all([
          fetch("/api/games"),
          fetch("/api/predictions"),
          fetch("/api/teams"),
          fetch("/api/series-bonuses"),
          fetch("/api/bracket"),
          fetch("/api/series-predictions"),
          fetch("/api/daily-question"),
        ]);

      if (gamesRes.ok) setGames(await gamesRes.json());
      if (predsRes.ok) setPredictions(await predsRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (bonusesRes.ok) setSeriesBonuses(await bonusesRes.json());
      if (seriesRes.ok) setAllSeries(await seriesRes.json());
      if (seriesPredsRes.ok) setSeriesPredictions(await seriesPredsRes.json());
      if (dailyRes.ok) {
        const daily = await dailyRes.json();
        setDailyQuestions(daily.questions || []);
        setDailyPicks(daily.picks || {});
        setDailyPickCounts(daily.pickCounts || {});
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSavePrediction = async (
    gameId: number,
    homeScore: number,
    awayScore: number
  ) => {
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: gameId,
        predicted_home_score: homeScore,
        predicted_away_score: awayScore,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setPredictions((prev) => {
        const existing = prev.findIndex((p) => p.game_id === gameId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
      return true;
    }

    const error = await res.json();
    alert(error.error || "Ошибка");
    return false;
  };

  const handleSaveSeriesPrediction = async (
    seriesId: string,
    winnerId: number,
    homeWins: number,
    awayWins: number
  ) => {
    const res = await fetch("/api/series-predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        series_id: seriesId,
        predicted_winner_id: winnerId,
        predicted_home_wins: homeWins,
        predicted_away_wins: awayWins,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setSeriesPredictions((prev) => {
        const existing = prev.findIndex((p) => p.series_id === seriesId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        }
        return [...prev, data];
      });
      return true;
    }

    const error = await res.json();
    alert(error.error || "Ошибка");
    return false;
  };

  const handleSaveDailyPick = async (questionId: string, option: string) => {
    const res = await fetch("/api/daily-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, picked_option: option }),
    });

    if (res.ok) {
      const data = await res.json();
      setDailyPicks((prev) => ({ ...prev, [questionId]: data }));
      return true;
    }

    const error = await res.json();
    alert(error.error || "Ошибка");
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  const closeMinutes = 30;

  // Only show the next upcoming game per series/matchup
  const allOpenGames = games
    .filter((g) => {
      if (g.status !== "upcoming") return false;
      const lockTime = new Date(new Date(g.game_date).getTime() - closeMinutes * 60 * 1000);
      return now < lockTime;
    })
    .sort((a, b) => a.game_date.localeCompare(b.game_date));

  // Group by series_id (or by home+away teams for play-in)
  const seen = new Set<string>();
  const openGames = allOpenGames.filter((g) => {
    const key = g.series_id || `${Math.min(g.home_team_id, g.away_team_id)}-${Math.max(g.home_team_id, g.away_team_id)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Get playoff series where betting is still open
  const playoffSeries = allSeries
    .filter((s) => {
      if (s.round === "play_in" || !s.home_team || !s.away_team || !s.team_home_id || !s.team_away_id) return false;
      if (s.status !== "upcoming") return false;
      // Check if first game already started
      const firstGame = games
        .filter((g) => g.series_id === s.id)
        .sort((a, b) => a.game_date.localeCompare(b.game_date))[0];
      if (firstGame && new Date(firstGame.game_date) <= now) return false;
      return true;
    })
    .sort((a, b) => {
      const aGame = games.filter((g) => g.series_id === a.id).sort((x, y) => x.game_date.localeCompare(y.game_date))[0];
      const bGame = games.filter((g) => g.series_id === b.id).sort((x, y) => x.game_date.localeCompare(y.game_date))[0];
      // For series without games yet, use the earliest first-round game as fallback
      const fallback = games.filter((g) => g.round === "first_round").sort((x, y) => x.game_date.localeCompare(y.game_date))[0]?.game_date || "z";
      const aDate = aGame?.game_date || fallback;
      const bDate = bGame?.game_date || fallback;
      return aDate.localeCompare(bDate);
    });

  return (
    <div>

      {/* Tournament winner - show for all users (new users get 24h window) */}
      <WinnerPicker
        teams={teams}
        firstGameDate={games.length > 0
          ? games.reduce((min, g) => g.game_date < min ? g.game_date : min, games[0].game_date)
          : undefined}
      />

      {/* Series predictions */}
      {playoffSeries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Прогнозы на серии</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playoffSeries.map((s) => {
              // Find earliest game in this series
              const seriesGames = games
                .filter((g) => g.series_id === s.id)
                .sort((a, b) => a.game_date.localeCompare(b.game_date));
              const firstGameDate = seriesGames[0]?.game_date;

              return (
                <SeriesPrediction
                  key={s.id}
                  series={s}
                  prediction={seriesPredictions.find(
                    (p) => p.series_id === s.id
                  )}
                  onSave={handleSaveSeriesPrediction}
                  firstGameDate={firstGameDate}
                />
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Прогнозы на матчи</h2>

      {/* Games list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {openGames.map((game) => {
          const prediction = predictions.find((p) => p.game_id === game.id);
          const gameSeriesBonuses = game.series_id
            ? seriesBonuses.filter((b) => b.series_id === game.series_id)
            : [];

          const dq = dailyQuestions.find((q) => q.game_id === game.id);

          return (
            <React.Fragment key={game.id}>
              <GameCard
                game={game}
                prediction={prediction}
                seriesBonuses={gameSeriesBonuses}
                onSave={handleSavePrediction}
              />
              {dq && (
                <DailyQuestion
                  question={dq}
                  pick={(dailyPicks[dq.id] as NbaDailyPick) ?? null}
                  pickCounts={dailyPickCounts[dq.id] ?? null}
                  onSave={handleSaveDailyPick}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {openGames.length === 0 && (
        <p className="text-center text-muted py-10">
          Нет матчей для отображения
        </p>
      )}
    </div>
  );
}
