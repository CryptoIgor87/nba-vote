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

  const correctPrediction = isFinished && prediction && prediction.points_earned > 0;
  const wrongPrediction = isFinished && prediction && prediction.points_earned === 0;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
        isFinished
          ? correctPrediction
            ? "winner-glow"
            : "border border-border"
          : locked
          ? "border border-border opacity-60"
          : "card-glow"
      }`}
    >
      {/* Gradient top accent */}
      {!isFinished && !locked && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}

      <div className="flex items-stretch bg-card">
        {/* Left: match info panel */}
        <div
          className={`w-[100px] sm:w-[130px] shrink-0 flex flex-col items-center justify-center px-2 py-4 text-center relative ${
            isFinished
              ? correctPrediction
                ? "bg-success/5"
                : "bg-surface"
              : "bg-gradient-to-b from-accent/8 to-transparent"
          }`}
        >
          <div className="text-[11px] sm:text-xs font-semibold text-foreground leading-tight">
            {formatGameDate(game.game_date)}
          </div>
          {(() => {
            const arena = NBA_ARENAS[game.home_team_id];
            return arena ? (
              <div className="text-[9px] sm:text-[10px] text-foreground-tertiary flex items-center gap-0.5 mt-0.5">
                <MapPin size={8} />
                {arena.city}
              </div>
            ) : null;
          })()}
          {game.round === "play_in" ? (
            <div className="text-[10px] text-accent font-bold mt-1 tracking-wider uppercase">
              Play-In
            </div>
          ) : game.game_number ? (
            <div className="text-[10px] text-accent font-bold mt-1">
              Игра {game.game_number}
            </div>
          ) : null}
          {isFinished && (
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-xl font-black tabular-nums ${game.home_score! > game.away_score! ? "text-foreground" : "text-foreground-tertiary"}`}>
                {game.home_score}
              </span>
              <span className="text-foreground-tertiary text-[10px] font-bold">:</span>
              <span className={`text-xl font-black tabular-nums ${game.away_score! > game.home_score! ? "text-foreground" : "text-foreground-tertiary"}`}>
                {game.away_score}
              </span>
            </div>
          )}
          {!isFinished && !locked && (
            <div className="mt-2">
              <Countdown
                deadline={new Date(
                  new Date(game.game_date).getTime() - 30 * 60 * 1000
                ).toISOString()}
              />
            </div>
          )}
          {locked && !isFinished && (
            <div className="flex items-center gap-1 text-[10px] text-foreground-tertiary mt-2">
              <Lock size={10} />
              Закрыто
            </div>
          )}
          {isFinished && totalPoints > 0 && (
            <div className="score-badge mt-2">+{totalPoints}</div>
          )}
          {saved && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-2">
              <Check size={10} /> Принято
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-border" />

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
        <div className="border-t border-border bg-surface/50 px-3 py-2 flex gap-4 text-[11px]">
          {pointsBreakdown.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {p.positive ? (
                <Check size={10} className="text-success" />
              ) : (
                <X size={10} className="text-danger" />
              )}
              <span className={p.positive ? "text-foreground-secondary" : "text-foreground-tertiary"}>
                {p.label}
              </span>
              <span className={p.positive ? "text-success font-bold" : "text-foreground-tertiary"}>
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
  let extra = "";

  if (isSelected && !isFinished) {
    bg = "bg-accent/10";
    extra = "ring-2 ring-inset ring-accent/50";
  } else if (isSelected && isWinner) {
    bg = "bg-success/8";
  } else if (isSelected && !isWinner && isFinished) {
    bg = "bg-danger/8";
  } else if (isLoser) {
    extra = "loser-fade";
  }

  return (
    <button
      onClick={onClick}
      disabled={!canSelect}
      className={`flex-1 flex flex-col items-center justify-center gap-2 py-5 transition-all duration-200 ${
        canSelect ? "cursor-pointer active:scale-90 hover:bg-card-hover" : "cursor-default"
      } ${bg} ${extra}`}
    >
      <div className="relative">
        <img
          src={getTeamLogoUrl(teamId)}
          alt={abbr}
          className={`w-12 h-12 sm:w-14 sm:h-14 object-contain transition-transform duration-200 ${
            canSelect ? "group-hover:scale-110" : ""
          } ${isWinner ? "drop-shadow-[0_0_8px_rgba(0,230,118,0.3)]" : ""}`}
        />
        {isSelected && !isFinished && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-md">
            <Check size={10} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <span className={`text-xs font-bold tracking-wide ${
        isWinner ? "text-success" : isLoser ? "text-foreground-tertiary" : ""
      }`}>
        {abbr}
      </span>
    </button>
  );
}
