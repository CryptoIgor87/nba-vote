"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import GameCard from "@/components/predictions/GameCard";
import WinnerPicker from "@/components/predictions/WinnerPicker";
import { getRoundLabel } from "@/lib/utils";
import type { NbaGame, NbaPrediction, NbaTeam } from "@/lib/types";

export default function PredictionsPage() {
  const { data: session } = useSession();
  const [games, setGames] = useState<NbaGame[]>([]);
  const [predictions, setPredictions] = useState<NbaPrediction[]>([]);
  const [seriesBonuses, setSeriesBonuses] = useState<
    { series_id: string; bonus_type: string; points: number }[]
  >([]);
  const [teams, setTeams] = useState<NbaTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRound, setActiveRound] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const [gamesRes, predsRes, teamsRes, bonusesRes] = await Promise.all([
        fetch("/api/games"),
        fetch("/api/predictions"),
        fetch("/api/teams"),
        fetch("/api/series-bonuses"),
      ]);

      if (gamesRes.ok) setGames(await gamesRes.json());
      if (predsRes.ok) setPredictions(await predsRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (bonusesRes.ok) setSeriesBonuses(await bonusesRes.json());
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  const rounds = [...new Set(games.map((g) => g.round).filter(Boolean))];
  const filteredGames =
    activeRound === "all"
      ? games
      : games.filter((g) => g.round === activeRound);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Мои прогнозы</h1>

      {/* Tournament winner prediction */}
      <WinnerPicker teams={teams} />

      {/* Round tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveRound("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeRound === "all"
              ? "bg-accent text-white"
              : "bg-card text-muted hover:text-foreground"
          }`}
        >
          Все
        </button>
        {rounds.map((round) => (
          <button
            key={round}
            onClick={() => setActiveRound(round!)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeRound === round
                ? "bg-accent text-white"
                : "bg-card text-muted hover:text-foreground"
            }`}
          >
            {getRoundLabel(round!)}
          </button>
        ))}
      </div>

      {/* Games list */}
      <div className="space-y-3">
        {filteredGames.map((game) => {
          const prediction = predictions.find((p) => p.game_id === game.id);
          const gameSeriesBonuses = game.series_id
            ? seriesBonuses.filter((b) => b.series_id === game.series_id)
            : [];

          return (
            <GameCard
              key={game.id}
              game={game}
              prediction={prediction}
              seriesBonuses={gameSeriesBonuses}
              onSave={handleSavePrediction}
            />
          );
        })}
      </div>

      {filteredGames.length === 0 && (
        <p className="text-center text-muted py-10">
          Нет матчей для отображения
        </p>
      )}
    </div>
  );
}
