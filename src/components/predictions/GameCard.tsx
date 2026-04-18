"use client";

import { useState } from "react";
import { getTeamLogoUrl, formatGameDate, isGameLocked } from "@/lib/utils";
import { NBA_ARENAS } from "@/lib/arenas";
import { Lock, Check, X, Trophy, MapPin, Zap } from "lucide-react";
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
  const [justPicked, setJustPicked] = useState<number | null>(null);

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
    setJustPicked(winnerId);
    const homeScore = winnerId === game.home_team_id ? 1 : 0;
    const awayScore = winnerId === game.away_team_id ? 1 : 0;
    setSaving(true);
    const ok = await onSave(game.id, homeScore, awayScore);
    setSaving(false);
    setTimeout(() => setJustPicked(null), 600);
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
    <div
      className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
        correctPrediction
          ? "ring-1 ring-success/40 shadow-[0_0_24px_rgba(0,230,118,0.08)]"
          : isFinished
          ? "ring-1 ring-border"
          : locked
          ? "ring-1 ring-border opacity-50"
          : "ring-1 ring-border hover:ring-accent/60 hover:shadow-[0_0_32px_rgba(255,106,0,0.1)]"
      }`}
    >
      {/* Top gradient bar */}
      {!isFinished && !locked && (
        <div className="h-[3px] bg-gradient-to-r from-transparent via-accent to-transparent" />
      )}
      {correctPrediction && (
        <div className="h-[3px] bg-gradient-to-r from-transparent via-success to-transparent" />
      )}

      <div className="bg-card p-4 sm:p-5">
        {/* Meta line */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[11px] text-foreground-tertiary">
            <span className="font-medium text-foreground-secondary">{formatGameDate(game.game_date)}</span>
            {(() => {
              const arena = NBA_ARENAS[game.home_team_id];
              return arena ? (
                <span className="flex items-center gap-0.5 hidden sm:flex">
                  <MapPin size={9} /> {arena.city}
                </span>
              ) : null;
            })()}
          </div>
          <div>
            {game.round === "play_in" ? (
              <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Play-In</span>
            ) : game.game_number ? (
              <span className="text-[10px] font-bold text-foreground-tertiary bg-surface px-2 py-0.5 rounded-full">Игра {game.game_number}</span>
            ) : null}
          </div>
        </div>

        {/* VS Layout */}
        <div className="flex items-center justify-between gap-2">
          {/* Home team */}
          <TeamSide
            teamId={game.home_team_id}
            abbr={homeAbbr}
            score={isFinished ? game.home_score : null}
            isSelected={predictedWinnerId === game.home_team_id}
            isWinner={actualWinnerId === game.home_team_id}
            isLoser={actualWinnerId != null && actualWinnerId !== game.home_team_id}
            isFinished={isFinished}
            canSelect={canSelect}
            justPicked={justPicked === game.home_team_id}
            onClick={() => handlePickWinner(game.home_team_id)}
          />

          {/* Center */}
          <div className="flex flex-col items-center gap-1 shrink-0 w-16 sm:w-20">
            {isFinished ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-lg sm:text-xl font-black tabular-nums ${game.home_score! > game.away_score! ? "text-foreground" : "text-foreground-tertiary"}`}>
                    {game.home_score}
                  </span>
                  <span className="text-foreground-tertiary text-xs">:</span>
                  <span className={`text-lg sm:text-xl font-black tabular-nums ${game.away_score! > game.home_score! ? "text-foreground" : "text-foreground-tertiary"}`}>
                    {game.away_score}
                  </span>
                </div>
                {totalPoints > 0 ? (
                  <span className="score-badge text-xs">+{totalPoints}</span>
                ) : prediction ? (
                  <X size={14} className="text-danger" />
                ) : null}
              </>
            ) : (
              <>
                <span className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">vs</span>
                {!locked ? (
                  <Countdown
                    deadline={new Date(
                      new Date(game.game_date).getTime() - 30 * 60 * 1000
                    ).toISOString()}
                  />
                ) : (
                  <div className="flex items-center gap-1 text-[10px] text-foreground-tertiary">
                    <Lock size={9} /> Закрыто
                  </div>
                )}
                {saved && (
                  <div className="flex items-center gap-1 text-[10px] text-success font-bold">
                    <Check size={9} /> OK
                  </div>
                )}
              </>
            )}
          </div>

          {/* Away team */}
          <TeamSide
            teamId={game.away_team_id}
            abbr={awayAbbr}
            score={isFinished ? game.away_score : null}
            isSelected={predictedWinnerId === game.away_team_id}
            isWinner={actualWinnerId === game.away_team_id}
            isLoser={actualWinnerId != null && actualWinnerId !== game.away_team_id}
            isFinished={isFinished}
            canSelect={canSelect}
            justPicked={justPicked === game.away_team_id}
            onClick={() => handlePickWinner(game.away_team_id)}
          />
        </div>
      </div>
    </div>
  );
}

function TeamSide({
  teamId, abbr, score, isSelected, isWinner, isLoser, isFinished, canSelect, justPicked, onClick,
}: {
  teamId: number; abbr: string; score: number | null;
  isSelected: boolean; isWinner: boolean; isLoser: boolean;
  isFinished: boolean; canSelect: boolean; justPicked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!canSelect}
      className={`flex-1 flex flex-col items-center gap-2 py-3 sm:py-4 rounded-xl transition-all duration-200 ${
        canSelect ? "cursor-pointer active:scale-90" : "cursor-default"
      } ${
        isSelected && !isFinished
          ? "bg-accent/10 ring-2 ring-accent/40"
          : canSelect
          ? "hover:bg-surface"
          : ""
      } ${isLoser ? "opacity-30 grayscale-[50%]" : ""} ${
        justPicked ? "animate-[bounce_0.5s_ease-in-out]" : ""
      }`}
    >
      <div className="relative">
        <img
          src={getTeamLogoUrl(teamId)}
          alt={abbr}
          className={`w-14 h-14 sm:w-16 sm:h-16 object-contain transition-all duration-300 ${
            isWinner ? "drop-shadow-[0_0_12px_rgba(0,230,118,0.4)]" : ""
          }`}
        />
        {isSelected && !isFinished && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-accent to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-[scale-in_0.3s_ease-out]">
            <Check size={10} className="text-white" strokeWidth={3} />
          </div>
        )}
        {isWinner && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-success to-emerald-400 rounded-full flex items-center justify-center shadow-lg">
            <Trophy size={9} className="text-white" />
          </div>
        )}
      </div>
      <span className={`text-sm font-extrabold tracking-wide ${
        isWinner ? "text-success" : isSelected && !isFinished ? "text-accent" : ""
      }`}>
        {abbr}
      </span>
    </button>
  );
}
