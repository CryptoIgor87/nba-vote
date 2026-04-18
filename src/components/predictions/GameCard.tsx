"use client";

import { useState } from "react";
import { getTeamLogoUrl, formatGameDate, isGameLocked } from "@/lib/utils";
import { Lock, Check, X, Trophy } from "lucide-react";
import Countdown from "./Countdown";
import type { NbaGame, NbaPrediction } from "@/lib/types";

interface Props {
  game: NbaGame;
  prediction?: NbaPrediction;
  seriesBonuses: { bonus_type: string; points: number }[];
  onSave: (gameId: number, homeScore: number, awayScore: number) => Promise<boolean>;
}

export default function GameCard({ game, prediction, seriesBonuses, onSave }: Props) {
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
    setSaving(true);
    const ok = await onSave(game.id, winnerId === game.home_team_id ? 1 : 0, winnerId === game.away_team_id ? 1 : 0);
    setSaving(false);
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const totalPoints = isFinished && prediction
    ? (prediction.points_earned || 0) + seriesBonuses.reduce((s, b) => s + b.points, 0)
    : 0;

  const actualWinnerId =
    isFinished && game.home_score != null && game.away_score != null
      ? game.home_score > game.away_score ? game.home_team_id : game.away_team_id
      : null;

  const correctPrediction = isFinished && prediction && prediction.points_earned > 0;
  const canSelect = isUpcoming && !locked && !saving;

  return (
    <div className={`rounded-2xl overflow-hidden ring-1 transition-all duration-200 ${
      correctPrediction ? "ring-success/40" : isFinished ? "ring-border" : locked ? "ring-border opacity-50" : "ring-border hover:ring-accent/50"
    }`}>
      {/* Row 1: info bar */}
      <div className="bg-surface/60 px-3 py-2 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-foreground-secondary font-medium">{formatGameDate(game.game_date)}</span>
          {game.round === "play_in" && (
            <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-md">PLAY-IN</span>
          )}
          {game.game_number && game.round !== "play_in" && (
            <span className="text-foreground-tertiary">Игра {game.game_number}</span>
          )}
          {isFinished && (
            <span className="font-black tabular-nums text-xs">
              <span className={game.home_score! > game.away_score! ? "text-foreground" : "text-foreground-tertiary"}>{game.home_score}</span>
              <span className="text-foreground-tertiary">:</span>
              <span className={game.away_score! > game.home_score! ? "text-foreground" : "text-foreground-tertiary"}>{game.away_score}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isFinished && !locked && (
            <Countdown deadline={new Date(new Date(game.game_date).getTime() - 30 * 60 * 1000).toISOString()} />
          )}
          {locked && !isFinished && (
            <span className="flex items-center gap-1 text-foreground-tertiary"><Lock size={9} /></span>
          )}
          {isFinished && totalPoints > 0 && <span className="score-badge text-[10px]">+{totalPoints}</span>}
          {isFinished && prediction && totalPoints === 0 && <X size={12} className="text-danger" />}
          {saved && <Check size={12} className="text-success" />}
        </div>
      </div>

      {/* Row 2: team picks */}
      <div className="flex bg-card">
        <TeamBtn
          teamId={game.home_team_id}
          abbr={game.home_team?.abbreviation || "?"}
          isSelected={predictedWinnerId === game.home_team_id}
          isWinner={actualWinnerId === game.home_team_id}
          isLoser={actualWinnerId != null && actualWinnerId !== game.home_team_id}
          isFinished={isFinished}
          canSelect={canSelect}
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
          canSelect={canSelect}
          onClick={() => handlePickWinner(game.away_team_id)}
        />
      </div>
    </div>
  );
}

function TeamBtn({
  teamId, abbr, isSelected, isWinner, isLoser, isFinished, canSelect, onClick,
}: {
  teamId: number; abbr: string; isSelected: boolean; isWinner: boolean; isLoser: boolean;
  isFinished: boolean; canSelect: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!canSelect}
      className={`flex-1 flex items-center justify-center gap-3 py-4 transition-all duration-150 ${
        canSelect ? "cursor-pointer active:scale-95 hover:bg-card-hover" : "cursor-default"
      } ${
        isSelected && !isFinished ? "bg-accent/10" : ""
      } ${isWinner ? "bg-success/5" : ""} ${
        isSelected && isFinished && !isWinner ? "bg-danger/5" : ""
      } ${isLoser && !isSelected ? "opacity-30" : ""}`}
    >
      <img src={getTeamLogoUrl(teamId)} alt={abbr}
        className={`w-11 h-11 sm:w-12 sm:h-12 object-contain ${isWinner ? "drop-shadow-[0_0_8px_rgba(0,230,118,0.3)]" : ""}`}
      />
      <div className="flex flex-col items-start gap-0.5">
        <span className={`text-sm font-extrabold ${isWinner ? "text-success" : isSelected && !isFinished ? "text-accent" : ""}`}>{abbr}</span>
        {isSelected && !isFinished && <span className="text-[9px] text-accent font-semibold"><Check size={8} className="inline" /> Выбрано</span>}
        {isWinner && isSelected && <span className="text-[9px] text-success font-semibold"><Trophy size={8} className="inline" /> Угадал</span>}
        {!isWinner && isSelected && isFinished && <span className="text-[9px] text-danger font-semibold"><X size={8} className="inline" /> Нет</span>}
      </div>
    </button>
  );
}
