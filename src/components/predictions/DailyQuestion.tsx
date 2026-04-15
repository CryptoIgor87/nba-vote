"use client";

import { useState } from "react";
import { getTeamLogoUrl, formatGameDate, isGameLocked } from "@/lib/utils";
import { Lock, Check, Trophy, HelpCircle, Star } from "lucide-react";
import Countdown from "./Countdown";
import type { NbaDailyQuestion, NbaDailyPick, NbaGame, NbaTeam } from "@/lib/types";

const CATEGORY_LABELS: Record<string, string> = {
  points: "очков",
  threes: "трёшек",
  rebounds: "подборов",
  assists: "передач",
  steals: "перехватов",
  blocks: "блоков",
  turnovers: "потерь",
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
    { name: question.player1_name, team_id: question.player1_team_id },
    { name: question.player2_name, team_id: question.player2_team_id },
    { name: question.player3_name, team_id: question.player3_team_id },
    { name: question.player4_name, team_id: question.player4_team_id },
    { name: "other", team_id: null, label: "Другой" },
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

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden col-span-1 sm:col-span-2 lg:col-span-3 ${
        isResolved ? "border-border" : locked ? "border-border opacity-75" : "border-accent/40 card-glow"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border-b border-border">
        <Star size={14} className="text-accent" />
        <span className="text-xs font-bold text-accent uppercase tracking-wide">
          Вопрос дня
        </span>
        <span className="text-xs text-muted ml-auto">
          {formatGameDate(game.game_date)}
        </span>
      </div>

      <div className="px-3 py-3">
        {/* Question text */}
        <div className="flex items-center gap-2 mb-3">
          {game.home_team && (
            <img
              src={getTeamLogoUrl(game.home_team_id)}
              alt={game.home_team.abbreviation}
              className="w-6 h-6"
            />
          )}
          <span className="text-sm font-semibold">
            {game.home_team?.abbreviation} vs {game.away_team?.abbreviation}
          </span>
          {game.away_team && (
            <img
              src={getTeamLogoUrl(game.away_team_id)}
              alt={game.away_team.abbreviation}
              className="w-6 h-6"
            />
          )}
          <span className="text-muted text-xs ml-auto flex items-center gap-1">
            <HelpCircle size={12} />
            Кто наберёт больше {categoryLabel}?
          </span>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-5 gap-2">
          {options.map((opt) => {
            const isSelected = localPick === opt.name;
            const isCorrect = isResolved && question.correct_answer === opt.name;
            const isWrong = isResolved && isSelected && question.correct_answer !== opt.name;
            const canSelect = !locked && !isFinished && !saving;
            const count = pickCounts?.[opt.name] ?? 0;
            const pct = totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0;

            let bg = "bg-surface hover:bg-surface/80";
            if (isCorrect) bg = "bg-success/20 ring-1 ring-success/40 ring-inset";
            else if (isWrong) bg = "bg-danger/10";
            else if (isSelected && !isResolved) bg = "bg-accent/20 ring-1 ring-accent/40 ring-inset";

            return (
              <button
                key={opt.name}
                onClick={() => handlePick(opt.name)}
                disabled={!canSelect}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center ${
                  canSelect ? "cursor-pointer" : "cursor-default"
                } ${bg}`}
              >
                {opt.team_id ? (
                  <img
                    src={getTeamLogoUrl(opt.team_id)}
                    alt=""
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <HelpCircle size={24} className="text-muted" />
                )}
                <span className="text-[11px] font-medium leading-tight min-h-[2rem] flex items-center">
                  {opt.label || opt.name.split(" ").pop()}
                </span>
                {isSelected && !isResolved && (
                  <Check size={12} className="text-accent" />
                )}
                {isCorrect && (
                  <div className="flex items-center gap-0.5">
                    <Trophy size={10} className="text-success" />
                    {question.correct_value != null && (
                      <span className="text-[10px] text-success font-bold">
                        {question.correct_value}
                      </span>
                    )}
                  </div>
                )}
                {isResolved && (
                  <span className="text-[10px] text-muted">{pct}%</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          {!locked && !isFinished && (
            <Countdown
              deadline={new Date(
                new Date(game.game_date).getTime() - 30 * 60 * 1000
              ).toISOString()}
            />
          )}
          {locked && !isFinished && (
            <div className="flex items-center gap-1 text-[10px] text-muted">
              <Lock size={10} />
              Закрыто
            </div>
          )}
          {isResolved && isSelected(localPick, question.correct_answer) && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold">
              <Trophy size={10} />+{pick?.points_earned ?? 1}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold">
              <Check size={10} /> OK
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isSelected(pick: string | null, correct: string | null): boolean {
  return pick != null && correct != null && pick === correct;
}
