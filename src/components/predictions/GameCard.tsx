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
    // Game winner
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

    // Series bonuses (show on last game of finished series)
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
      className={`bg-card border rounded-xl p-4 ${
        isFinished
          ? "border-border"
          : locked
          ? "border-border opacity-75"
          : "border-accent/20"
      }`}
    >
      {/* Header: date + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted">
          {formatGameDate(game.game_date)}
          {game.game_number && (
            <span className="ml-2 text-accent">Игра {game.game_number}</span>
          )}
        </span>
        {locked && !isFinished && (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Lock size={12} />
            Закрыто
          </span>
        )}
        {isFinished && totalPoints > 0 && (
          <span className="flex items-center gap-1 text-xs text-success font-semibold">
            <Trophy size={12} />+{totalPoints}
          </span>
        )}
      </div>

      {/* Teams and scores */}
      <div className="flex items-center gap-4">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1">
          {game.home_team && (
            <img
              src={getTeamLogoUrl(game.home_team_id)}
              alt={game.home_team.abbreviation}
              className="w-8 h-8 object-contain"
            />
          )}
          <span className="text-sm font-semibold">
            {game.home_team?.abbreviation || game.home_team_id}
          </span>
        </div>

        {/* Score / Input */}
        <div className="flex items-center gap-2">
          {isFinished ? (
            <div className="text-center">
              <div className="flex items-center gap-2 text-lg font-bold">
                <span
                  className={
                    game.home_score! > game.away_score!
                      ? "text-success"
                      : "text-muted"
                  }
                >
                  {game.home_score}
                </span>
                <span className="text-muted">:</span>
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
            </div>
          ) : isUpcoming && !locked ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="200"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="w-12 h-9 text-center bg-background border border-border rounded-lg text-sm font-semibold focus:outline-none focus:border-accent"
                placeholder="0"
              />
              <span className="text-muted text-sm">:</span>
              <input
                type="number"
                min="0"
                max="200"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="w-12 h-9 text-center bg-background border border-border rounded-lg text-sm font-semibold focus:outline-none focus:border-accent"
                placeholder="0"
              />
            </div>
          ) : (
            <div className="text-muted text-sm">—</div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-semibold">
            {game.away_team?.abbreviation || game.away_team_id}
          </span>
          {game.away_team && (
            <img
              src={getTeamLogoUrl(game.away_team_id)}
              alt={game.away_team.abbreviation}
              className="w-8 h-8 object-contain"
            />
          )}
        </div>
      </div>

      {/* Save button */}
      {isUpcoming && !locked && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving || !homeScore || !awayScore}
            className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
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
            <span className="text-xs font-semibold">
              {prediction.predicted_home_score} :{" "}
              {prediction.predicted_away_score}
            </span>
          </div>

          {/* Points breakdown */}
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
                    <span className={p.positive ? "text-foreground" : "text-muted"}>
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
        <div className="mt-3 border-t border-border pt-2 text-xs text-muted text-center">
          Ваш прогноз: {prediction.predicted_home_score} :{" "}
          {prediction.predicted_away_score}
        </div>
      )}
    </div>
  );
}
