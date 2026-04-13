"use client";

import { useState } from "react";
import { getTeamLogoUrl, formatGameDate, isGameLocked } from "@/lib/utils";
import { Lock, Check, X, Trophy } from "lucide-react";
import type { NbaGame, NbaPrediction } from "@/lib/types";

interface Props {
  game: NbaGame;
  prediction?: NbaPrediction;
  seriesBonuses: { bonus_type: string; points: number }[];
  onSave: (
    gameId: number,
    homeScore: number,
    awayScore: number
  ) => Promise<boolean>;
}

export default function GameCard({
  game,
  prediction,
  seriesBonuses,
  onSave,
}: Props) {
  const [homeScore, setHomeScore] = useState(
    prediction?.predicted_home_score?.toString() ?? ""
  );
  const [awayScore, setAwayScore] = useState(
    prediction?.predicted_away_score?.toString() ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = isGameLocked(game.game_date, 30);
  const isFinished = game.status === "finished";
  const isUpcoming = game.status === "upcoming";

  const handleSave = async () => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0 || h === a) {
      alert("Введите корректный счёт (не может быть ничьей)");
      return;
    }
    setSaving(true);
    const ok = await onSave(game.id, h, a);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Points breakdown for finished games
  const pointsBreakdown: { label: string; points: number; positive: boolean }[] =
    [];

  if (isFinished && prediction) {
    if (prediction.points_earned > 0) {
      pointsBreakdown.push({
        label: "Победитель",
        points: prediction.points_earned,
        positive: true,
      });
    } else {
      pointsBreakdown.push({
        label: "Победитель",
        points: 0,
        positive: false,
      });
    }

    for (const bonus of seriesBonuses) {
      if (bonus.bonus_type === "series_exact") {
        pointsBreakdown.push({
          label: "Серия (точный счёт)",
          points: bonus.points,
          positive: true,
        });
      } else if (bonus.bonus_type === "series_winner") {
        pointsBreakdown.push({
          label: "Серия (победитель)",
          points: bonus.points,
          positive: true,
        });
      }
    }
  }

  const totalPoints = pointsBreakdown.reduce((s, p) => s + p.points, 0);

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden ${
        isFinished
          ? "border-border"
          : locked
          ? "border-border opacity-75"
          : "border-accent/20"
      }`}
    >
      {/* Date header */}
      <div
        className={`text-center py-2 px-4 ${
          isFinished ? "bg-surface" : "bg-accent/10"
        }`}
      >
        <span className="text-sm font-bold text-foreground">
          {formatGameDate(game.game_date)}
        </span>
        {game.game_number && (
          <span className="ml-2 text-sm text-accent font-semibold">
            Игра {game.game_number}
          </span>
        )}
        {locked && !isFinished && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted">
            <Lock size={11} />
            Закрыто
          </span>
        )}
        {isFinished && totalPoints > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-success font-bold">
            <Trophy size={11} />+{totalPoints}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Teams and scores */}
        <div className="flex items-center justify-between gap-2">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1 flex-1">
            {game.home_team && (
              <img
                src={getTeamLogoUrl(game.home_team_id)}
                alt={game.home_team.abbreviation}
                className="w-14 h-14 object-contain"
              />
            )}
            <span className="text-sm font-bold">
              {game.home_team?.abbreviation || game.home_team_id}
            </span>
          </div>

          {/* Score / Input */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            {isFinished ? (
              <div className="flex items-center gap-3 text-2xl font-black">
                <span
                  className={
                    game.home_score! > game.away_score!
                      ? "text-success"
                      : "text-muted"
                  }
                >
                  {game.home_score}
                </span>
                <span className="text-muted text-lg">:</span>
                <span
                  className={
                    game.away_score! > game.home_score!
                      ? "text-success"
                      : "text-muted"
                  }
                >
                  {game.away_score}
                </span>
              </div>
            ) : isUpcoming && !locked ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-14 h-11 text-center bg-background border-2 border-border rounded-xl text-base font-bold focus:outline-none focus:border-accent"
                  placeholder="0"
                />
                <span className="text-muted text-lg font-bold">:</span>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-14 h-11 text-center bg-background border-2 border-border rounded-xl text-base font-bold focus:outline-none focus:border-accent"
                  placeholder="0"
                />
              </div>
            ) : (
              <div className="text-muted text-lg font-bold">VS</div>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1 flex-1">
            {game.away_team && (
              <img
                src={getTeamLogoUrl(game.away_team_id)}
                alt={game.away_team.abbreviation}
                className="w-14 h-14 object-contain"
              />
            )}
            <span className="text-sm font-bold">
              {game.away_team?.abbreviation || game.away_team_id}
            </span>
          </div>
        </div>

        {/* Save button */}
        {isUpcoming && !locked && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleSave}
              disabled={saving || !homeScore || !awayScore}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {saved ? (
                <>
                  <Check size={14} /> Сохранено
                </>
              ) : saving ? (
                "Сохраняю..."
              ) : prediction ? (
                "Обновить"
              ) : (
                "Сохранить"
              )}
            </button>
          </div>
        )}

        {/* Prediction result for finished games */}
        {isFinished && prediction && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted">Ваш прогноз:</span>
              <span className="text-sm font-bold">
                {prediction.predicted_home_score} :{" "}
                {prediction.predicted_away_score}
              </span>
            </div>

            {pointsBreakdown.length > 0 && (
              <div className="space-y-1">
                {pointsBreakdown.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1">
                      {p.positive ? (
                        <Check size={12} className="text-success" />
                      ) : (
                        <X size={12} className="text-danger" />
                      )}
                      <span
                        className={
                          p.positive ? "text-foreground" : "text-muted"
                        }
                      >
                        {p.label}
                      </span>
                    </span>
                    <span
                      className={
                        p.positive
                          ? "text-success font-semibold"
                          : "text-muted"
                      }
                    >
                      {p.positive ? `+${p.points}` : "0"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Show prediction for locked but not finished */}
        {!isFinished && locked && prediction && (
          <div className="mt-3 border-t border-border pt-2 text-sm text-muted text-center font-medium">
            Ваш прогноз: {prediction.predicted_home_score} :{" "}
            {prediction.predicted_away_score}
          </div>
        )}
      </div>
    </div>
  );
}
