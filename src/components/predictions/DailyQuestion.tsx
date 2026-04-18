"use client";

import { useState } from "react";
import { formatGameDate, isGameLocked } from "@/lib/utils";
import { getPlayerHeadshotUrl } from "@/lib/players";
import { Lock, Check, Trophy, HelpCircle } from "lucide-react";
import Countdown from "./Countdown";
import type { NbaDailyQuestion, NbaDailyPick, NbaGame, NbaTeam } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  points: "очков",
  threes: "трёшек",
  assists: "передач",
  rebounds: "подборов",
  turnovers: "потерь",
  fouls: "фолов",
  steals: "перехватов",
  blocks: "блоков",
};

interface Props {
  question: NbaDailyQuestion & {
    game?: NbaGame & { home_team?: NbaTeam; away_team?: NbaTeam };
  };
  pick: NbaDailyPick | null;
  pickCounts: Record<string, number> | null;
  onSave: (questionId: string, option: string) => Promise<boolean>;
}

export default function DailyQuestion({ question, pick, pickCounts, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localPick, setLocalPick] = useState<string | null>(pick?.picked_option ?? null);

  const game = question.game;
  if (!game) return null;

  const locked = isGameLocked(game.game_date, 30);
  const isFinished = game.status === "finished";
  const isResolved = question.status === "resolved";
  const categoryLabel = CATEGORY_LABELS[question.category] || question.category;

  const options = [
    { name: question.player1_name, team_id: question.player1_team_id, nba_id: question.player1_nba_id },
    { name: question.player2_name, team_id: question.player2_team_id, nba_id: question.player2_nba_id },
    { name: question.player3_name, team_id: question.player3_team_id, nba_id: question.player3_nba_id },
    { name: question.player4_name, team_id: question.player4_team_id, nba_id: question.player4_nba_id },
    { name: "other", team_id: null, nba_id: null },
  ];

  const handlePick = async (option: string) => {
    if (locked || isFinished || saving) return;
    setSaving(true);
    const ok = await onSave(question.id, option);
    setSaving(false);
    if (ok) {
      setLocalPick(option);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const totalPicks = pickCounts
    ? Object.values(pickCounts).reduce((s, c) => s + c, 0)
    : 0;

  const isCorrectPick = localPick != null && localPick === question.correct_answer;
  const canSelect = !locked && !isFinished && !saving;

  return (
    <div className={`rounded-2xl overflow-hidden ring-1 transition-all duration-200 ${
      isResolved
        ? isCorrectPick
          ? "ring-success/40 shadow-[0_0_20px_rgba(0,230,118,0.08)]"
          : "ring-border"
        : locked
        ? "ring-border opacity-50"
        : "ring-border hover:ring-accent/50"
    }`}>
      {/* Top accent */}
      {!isResolved && !locked && (
        <div className="h-[2px] bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
      )}
      {isResolved && isCorrectPick && (
        <div className="h-[2px] bg-gradient-to-r from-success/0 via-success to-success/0" />
      )}

      {/* Row 1: Question info */}
      <div className="bg-card px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-accent text-sm">❓</span>
          <span className="text-xs font-bold text-accent">
            Кто больше забьёт {categoryLabel}?
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-foreground-tertiary">
            {game.home_team?.abbreviation} vs {game.away_team?.abbreviation}
          </span>
          {isResolved && isCorrectPick && (
            <span className="score-badge text-[11px]">+{pick?.points_earned ?? 1}</span>
          )}
          {saved && <Check size={12} className="text-success" />}
        </div>
      </div>

      {/* Row 2: Player options */}
      <div className="border-t border-border grid grid-cols-5">
        {options.map((opt, idx) => {
          const isSelected = localPick === opt.name;
          const isCorrect = isResolved && question.correct_answer === opt.name;
          const isWrong = isResolved && isSelected && question.correct_answer !== opt.name;
          const count = pickCounts?.[opt.name] ?? 0;
          const pct = totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0;
          const nbaId = opt.nba_id;

          return (
            <button
              key={opt.name}
              onClick={() => handlePick(opt.name)}
              disabled={!canSelect}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 transition-all duration-150 ${
                idx < 4 ? "border-r border-border" : ""
              } ${
                canSelect ? "cursor-pointer active:scale-90 hover:bg-card-hover" : "cursor-default"
              } ${
                isSelected && !isResolved ? "bg-accent/10" : ""
              } ${
                isCorrect ? "bg-success/8" : ""
              } ${
                isWrong ? "bg-danger/8" : ""
              }`}
            >
              {nbaId ? (
                <img
                  src={getPlayerHeadshotUrl(nbaId)}
                  alt={opt.name}
                  className="w-10 h-8 sm:w-12 sm:h-9 object-cover object-top rounded-md"
                />
              ) : (
                <HelpCircle size={24} className="text-foreground-tertiary" />
              )}
              <span className={`text-[10px] sm:text-[11px] font-semibold leading-tight text-center ${
                isCorrect ? "text-success" : isSelected && !isResolved ? "text-accent" : ""
              }`}>
                {opt.name === "other" ? "Другой" : opt.name.split(" ").pop()}
              </span>
              <div className="h-3 flex items-center">
                {isSelected && !isResolved && (
                  <Check size={9} className="text-accent" />
                )}
                {isCorrect && (
                  <span className="text-[9px] text-success font-bold flex items-center gap-0.5">
                    <Trophy size={7} />
                    {question.correct_value}
                  </span>
                )}
                {isResolved && !isCorrect && (
                  <span className="text-[9px] text-foreground-tertiary">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Timer / Lock */}
      {!isFinished && !isResolved && (
        <div className="bg-surface/50 border-t border-border px-4 py-1.5 flex items-center justify-center text-[10px]">
          {!locked ? (
            <Countdown deadline={new Date(new Date(game.game_date).getTime() - 30 * 60 * 1000).toISOString()} />
          ) : (
            <span className="flex items-center gap-1 text-foreground-tertiary"><Lock size={9} /> Приём закрыт</span>
          )}
        </div>
      )}

      {/* Resolved: correct answer */}
      {isResolved && question.correct_answer && (
        <div className="bg-surface/50 border-t border-border px-4 py-1.5 flex items-center justify-center gap-1 text-[10px]">
          <Trophy size={9} className="text-success" />
          <span className="text-foreground-secondary font-medium">
            {question.correct_answer === "other" ? "Другой" : question.correct_answer}: {question.correct_value} {categoryLabel}
          </span>
        </div>
      )}
    </div>
  );
}
