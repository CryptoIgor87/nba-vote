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

  const predictedWinnerId = prediction
    ? prediction.predicted_home_score > prediction.predicted_away_score
      ? game.home_team_id
      : game.away_team_id
    : null;

  const handlePickWinner = async (winnerId: number) => {
    if (locked || !isUpcoming || saving) return;
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

  const pointsBreakdown: { label: string; points: number; positive: boolean }[] = [];

  if (isFinished && prediction) {
    pointsBreakdown.push({
      label: "Победитель",
      points: prediction.points_earned,
      positive: prediction.points_earned > 0,
    });
    for (const bonus of seriesBonuses) {
      pointsBreakdown.push({
        label: bonus.bonus_type === "series_exact" ? "Серия (точный счёт)" : "Серия (победитель)",
        points: bonus.points,
        positive: true,
      });
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
      className={`bg-card border rounded-xl overflow-hidden ${
        isFinished ? "border-border" : locked ? "border-border opacity-75" : "border-border card-glow"
      }`}
    >
      <div className="flex items-stretch">
        {/* Left: match info */}
        <div
          className={`w-28 sm:w-36 shrink-0 flex flex-col items-center justify-center px-2 py-3 text-center court-pattern ${
            isFinished ? "bg-surface" : "bg-accent/10"
          }`}
        >
          <div className="text-[11px] sm:text-xs font-semibold text-foreground leading-tight">
            {formatGameDate(game.game_date)}
          </div>
          {(() => {
            const arena = NBA_ARENAS[game.home_team_id];
            return arena ? (
              <div className="text-[9px] sm:text-[10px] text-muted flex items-center gap-0.5 mt-0.5">
                <MapPin size={8} />
                {arena.city}
              </div>
            ) : null;
          })()}
          {game.round === "play_in" ? (
            <div className="text-[10px] text-accent font-bold mt-0.5">
              Play-In
            </div>
          ) : game.game_number ? (
            <div className="text-[10px] text-accent font-bold mt-0.5">
              Игра {game.game_number}
            </div>
          ) : null}
          {isFinished && (
            <div className="text-lg font-black mt-1 flex items-center gap-1.5">
              <span className={game.home_score! > game.away_score! ? "text-success" : "text-muted"}>
                {game.home_score}
              </span>
              <span className="text-muted text-xs">:</span>
              <span className={game.away_score! > game.home_score! ? "text-success" : "text-muted"}>
                {game.away_score}
              </span>
            </div>
          )}
          {!isFinished && !locked && (
            <div className="mt-1">
              <Countdown
                deadline={new Date(
                  new Date(game.game_date).getTime() - 30 * 60 * 1000
                ).toISOString()}
              />
            </div>
          )}
          {locked && !isFinished && (
            <div className="flex items-center gap-1 text-[10px] text-muted mt-1">
              <Lock size={10} />
              Закрыто
            </div>
          )}
          {isFinished && totalPoints > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-0.5">
              <Trophy size={10} />+{totalPoints}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-0.5">
              <Check size={10} /> OK
            </div>
          )}
        </div>

        {/* Right: team picks */}
        <div className="flex-1 flex items-stretch">
          <TeamBtn
            teamId={game.home_team_id}
            abbr={game.home_team?.abbreviation || "?"}
            isSelected={predictedWinnerId === game.home_team_id}
            isWinner={actualWinnerId === game.home_team_id}
            isLoser={actualWinnerId != null && actualWinnerId !== game.home_team_id}
            isFinished={isFinished}
            canSelect={isUpcoming && !locked && !saving}
            onClick={() => handlePickWinner(game.home_team_id)}
          />
          <div className="w-px bg-border" />
          <TeamBtn
            teamId={game.away_team_id}
            abbr={game.away_team?.abbreviation || "?"}
            isSelected={predictedWinnerId === game.away_team_id}
            isWinner={actualWinnerId === game.away_team_id}
            isLoser={actualWinnerId != null && actualWinnerId !== game.away_team_id}
            isFinished={isFinished}
            canSelect={isUpcoming && !locked && !saving}
            onClick={() => handlePickWinner(game.away_team_id)}
          />
        </div>
      </div>

      {/* Points breakdown */}
      {isFinished && prediction && pointsBreakdown.length > 0 && (
        <div className="border-t border-border px-3 py-2 flex gap-4 text-[11px]">
          {pointsBreakdown.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {p.positive ? (
                <Check size={10} className="text-success" />
              ) : (
                <X size={10} className="text-danger" />
              )}
              <span className={p.positive ? "text-foreground" : "text-muted"}>
                {p.label}
              </span>
              <span className={p.positive ? "text-success font-bold" : "text-muted"}>
                {p.positive ? `+${p.points}` : "0"}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamBtn({
  teamId,
  abbr,
  isSelected,
  isWinner,
  isLoser,
  isFinished,
  canSelect,
  onClick,
}: {
  teamId: number;
  abbr: string;
  isSelected: boolean;
  isWinner: boolean;
  isLoser: boolean;
  isFinished: boolean;
  canSelect: boolean;
  onClick: () => void;
}) {
  let bg = "";
  if (isSelected && !isFinished) bg = "bg-accent/20 ring-1 ring-accent/40 ring-inset";
  else if (isSelected && isWinner) bg = "bg-success/10";
  else if (isSelected && !isWinner && isFinished) bg = "bg-danger/10";
  else if (isWinner && isFinished) bg = "";
  else if (isLoser) bg = "opacity-40";

  return (
    <button
      onClick={onClick}
      disabled={!canSelect}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all ${
        canSelect ? "cursor-pointer hover:bg-surface" : "cursor-default"
      } ${bg}`}
    >
      <img
        src={getTeamLogoUrl(teamId)}
        alt={abbr}
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
      />
      <span className={`text-xs font-bold ${isWinner ? "text-success" : ""}`}>
        {abbr}
      </span>
      <div className="h-3">
        {isSelected && !isFinished && (
          <Check size={12} className="text-accent" />
        )}
      </div>
    </button>
  );
}
