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

  const totalPoints = isFinished && prediction
    ? (prediction.points_earned || 0) + seriesBonuses.reduce((s, b) => s + b.points, 0)
    : 0;

  const actualWinnerId =
    isFinished && game.home_score != null && game.away_score != null
      ? game.home_score > game.away_score ? game.home_team_id : game.away_team_id
      : null;

  const correctPrediction = isFinished && prediction && prediction.points_earned > 0;
  const canSelect = isUpcoming && !locked && !saving;
  const homeAbbr = game.home_team?.abbreviation || "?";
  const awayAbbr = game.away_team?.abbreviation || "?";

  return (
    <div className={`rounded-2xl overflow-hidden ring-1 transition-all duration-200 ${
      correctPrediction
        ? "ring-success/40 shadow-[0_0_20px_rgba(0,230,118,0.08)]"
        : isFinished
        ? "ring-border"
        : locked
        ? "ring-border opacity-50"
        : "ring-border hover:ring-accent/50"
    }`}>
      {/* Top accent */}
      {!isFinished && !locked && (
        <div className="h-[2px] bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
      )}
      {correctPrediction && (
        <div className="h-[2px] bg-gradient-to-r from-success/0 via-success to-success/0" />
      )}

      {/* Row 1: Match info */}
      <div className="bg-card px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <img src={getTeamLogoUrl(game.home_team_id)} alt="" className="w-5 h-5" />
            <span className="text-xs font-bold">{homeAbbr}</span>
            <span className="text-[10px] text-foreground-tertiary mx-0.5">vs</span>
            <span className="text-xs font-bold">{awayAbbr}</span>
            <img src={getTeamLogoUrl(game.away_team_id)} alt="" className="w-5 h-5" />
          </div>
          {isFinished && (
            <span className="text-sm font-black tabular-nums">
              <span className={game.home_score! > game.away_score! ? "text-foreground" : "text-foreground-tertiary"}>{game.home_score}</span>
              <span className="text-foreground-tertiary mx-0.5">:</span>
              <span className={game.away_score! > game.home_score! ? "text-foreground" : "text-foreground-tertiary"}>{game.away_score}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {game.round === "play_in" && (
            <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-md uppercase">Play-In</span>
          )}
          {game.game_number && game.round !== "play_in" && (
            <span className="text-[9px] font-medium text-foreground-tertiary bg-surface px-1.5 py-0.5 rounded-md">Игра {game.game_number}</span>
          )}
          <span className="text-[10px] text-foreground-tertiary">{formatGameDate(game.game_date)}</span>
          {isFinished && totalPoints > 0 && (
            <span className="score-badge text-[11px]">+{totalPoints}</span>
          )}
          {isFinished && prediction && totalPoints === 0 && (
            <X size={12} className="text-danger" />
          )}
          {saved && <Check size={12} className="text-success" />}
        </div>
      </div>

      {/* Row 2: Team selection */}
      <div className="flex border-t border-border">
        <TeamBtn
          teamId={game.home_team_id}
          abbr={homeAbbr}
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
          abbr={awayAbbr}
          isSelected={predictedWinnerId === game.away_team_id}
          isWinner={actualWinnerId === game.away_team_id}
          isLoser={actualWinnerId != null && actualWinnerId !== game.away_team_id}
          isFinished={isFinished}
          canSelect={canSelect}
          onClick={() => handlePickWinner(game.away_team_id)}
        />
      </div>

      {/* Timer / Lock */}
      {!isFinished && (
        <div className="bg-surface/50 border-t border-border px-4 py-1.5 flex items-center justify-center gap-2 text-[10px]">
          {!locked ? (
            <Countdown deadline={new Date(new Date(game.game_date).getTime() - 30 * 60 * 1000).toISOString()} />
          ) : (
            <span className="flex items-center gap-1 text-foreground-tertiary"><Lock size={9} /> Приём зак��ыт</span>
          )}
        </div>
      )}
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
      } ${
        isWinner ? "bg-success/5" : ""
      } ${
        isSelected && isFinished && !isWinner ? "bg-danger/5" : ""
      } ${
        isLoser && !isSelected ? "opacity-30" : ""
      }`}
    >
      <img
        src={getTeamLogoUrl(teamId)}
        alt={abbr}
        className={`w-12 h-12 sm:w-14 sm:h-14 object-contain ${isWinner ? "drop-shadow-[0_0_8px_rgba(0,230,118,0.3)]" : ""}`}
      />
      <div className="flex flex-col items-start">
        <span className={`text-sm font-extrabold ${isWinner ? "text-success" : isSelected && !isFinished ? "text-accent" : ""}`}>
          {abbr}
        </span>
        {isSelected && !isFinished && (
          <span className="text-[9px] text-accent font-semibold flex items-center gap-0.5"><Check size={8} /> Выбрано</span>
        )}
        {isWinner && (
          <span className="text-[9px] text-success font-semibold flex items-center gap-0.5"><Trophy size={8} /> Победа</span>
        )}
      </div>
    </button>
  );
}
