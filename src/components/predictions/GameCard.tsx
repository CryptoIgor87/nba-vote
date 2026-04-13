"use client";

import { useState } from "react";
import { getTeamLogoUrl, formatGameDate, isGameLocked } from "@/lib/utils";
import { NBA_ARENAS } from "@/lib/arenas";
import { Lock, Check, X, Trophy, MapPin } from "lucide-react";
import Countdown from "./Countdown";
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const locked = isGameLocked(game.game_date, 30);
  const isFinished = game.status === "finished";
  const isUpcoming = game.status === "upcoming";

  // Determine predicted winner from prediction scores
  const predictedWinnerId = prediction
    ? prediction.predicted_home_score > prediction.predicted_away_score
      ? game.home_team_id
      : game.away_team_id
    : null;

  const handlePickWinner = async (winnerId: number) => {
    if (locked || !isUpcoming || saving) return;
    // Save as 1-0 or 0-1 (winner gets 1)
    const homeScore = winnerId === game.home_team_id ? 1 : 0;
    const awayScore = winnerId === game.away_team_id ? 1 : 0;
    setSaving(true);
    const ok = await onSave(game.id, homeScore, awayScore);
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

  const actualWinnerId =
    isFinished && game.home_score != null && game.away_score != null
      ? game.home_score > game.away_score
        ? game.home_team_id
        : game.away_team_id
      : null;

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
        <div className="text-sm font-bold text-foreground">
          {formatGameDate(game.game_date)}
        </div>
        {(() => {
          const arena = NBA_ARENAS[game.home_team_id];
          return arena ? (
            <div className="text-xs text-muted flex items-center justify-center gap-1 mt-0.5">
              <MapPin size={10} />
              {arena.arena}, {arena.city}
            </div>
          ) : null;
        })()}
        {game.game_number && (
          <span className="ml-2 text-sm text-accent font-semibold">
            Игра {game.game_number}
          </span>
        )}
        {!isFinished && !locked && (
          <Countdown
            deadline={new Date(
              new Date(game.game_date).getTime() - 30 * 60 * 1000
            ).toISOString()}
          />
        )}
        {locked && !isFinished && (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Lock size={11} />
            Закрыто
          </span>
        )}
        {isFinished && totalPoints > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-success font-bold">
            <Trophy size={11} />+{totalPoints}
          </span>
        )}
        {saved && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-success font-bold">
            <Check size={11} /> Сохранено
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Teams */}
        <div className="flex items-center justify-between gap-2">
          {/* Home team */}
          <TeamButton
            teamId={game.home_team_id}
            abbreviation={game.home_team?.abbreviation || "?"}
            isSelected={predictedWinnerId === game.home_team_id}
            isWinner={actualWinnerId === game.home_team_id}
            isLoser={actualWinnerId != null && actualWinnerId !== game.home_team_id}
            isFinished={isFinished}
            canSelect={isUpcoming && !locked && !saving}
            onClick={() => handlePickWinner(game.home_team_id)}
          />

          {/* Center: score or VS */}
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
            ) : (
              <span className="text-muted text-lg font-bold">VS</span>
            )}
          </div>

          {/* Away team */}
          <TeamButton
            teamId={game.away_team_id}
            abbreviation={game.away_team?.abbreviation || "?"}
            isSelected={predictedWinnerId === game.away_team_id}
            isWinner={actualWinnerId === game.away_team_id}
            isLoser={actualWinnerId != null && actualWinnerId !== game.away_team_id}
            isFinished={isFinished}
            canSelect={isUpcoming && !locked && !saving}
            onClick={() => handlePickWinner(game.away_team_id)}
          />
        </div>

        {/* Points breakdown for finished games */}
        {isFinished && prediction && pointsBreakdown.length > 0 && (
          <div className="mt-3 border-t border-border pt-3 space-y-1">
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
                    className={p.positive ? "text-foreground" : "text-muted"}
                  >
                    {p.label}
                  </span>
                </span>
                <span
                  className={
                    p.positive ? "text-success font-semibold" : "text-muted"
                  }
                >
                  {p.positive ? `+${p.points}` : "0"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamButton({
  teamId,
  abbreviation,
  isSelected,
  isWinner,
  isLoser,
  isFinished,
  canSelect,
  onClick,
}: {
  teamId: number;
  abbreviation: string;
  isSelected: boolean;
  isWinner: boolean;
  isLoser: boolean;
  isFinished: boolean;
  canSelect: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!canSelect}
      className={`flex flex-col items-center gap-1.5 flex-1 py-3 rounded-xl border-2 transition-all ${
        canSelect ? "cursor-pointer" : "cursor-default"
      } ${
        isSelected && !isFinished
          ? "border-accent bg-accent/10 shadow-sm"
          : isSelected && isFinished && isWinner
          ? "border-success bg-success/10"
          : isSelected && isFinished && !isWinner
          ? "border-danger bg-danger/10"
          : isFinished && isWinner
          ? "border-success/30"
          : isFinished && isLoser
          ? "border-border opacity-40"
          : canSelect
          ? "border-border hover:border-accent/40"
          : "border-border"
      }`}
    >
      <img
        src={getTeamLogoUrl(teamId)}
        alt={abbreviation}
        className="w-14 h-14 object-contain"
      />
      <span className="text-sm font-bold">{abbreviation}</span>
      {isSelected && !isFinished && (
        <Check size={14} className="text-accent" />
      )}
    </button>
  );
}
