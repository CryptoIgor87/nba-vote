"use client";

import { useState } from "react";
import { formatGameDate, isGameLocked } from "@/lib/utils";
import { getPlayerHeadshotUrl, getPlayerNbaId } from "@/lib/players";
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
    { name: "other", team_id: null },
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

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden ${
        isResolved ? "border-border" : locked ? "border-border opacity-75" : "border-border card-glow"
      }`}
    >
      {/* Left panel + options like GameCard layout */}
      <div className="flex items-stretch">
        {/* Left: match info */}
        <div
          className={`w-28 sm:w-36 shrink-0 flex flex-col items-center justify-center px-2 py-3 text-center ${
            isFinished ? "bg-surface" : "bg-accent/10"
          }`}
        >
          <div className="flex items-center gap-1 mb-1">
            <Star size={10} className="text-accent" />
            <span className="text-[9px] font-bold text-accent uppercase">Вопрос дня</span>
          </div>
          <div className="text-[11px] sm:text-xs font-semibold text-foreground leading-tight">
            {formatGameDate(game.game_date)}
          </div>
          <div className="text-[10px] text-muted mt-0.5 leading-tight">
            {game.home_team?.abbreviation} vs {game.away_team?.abbreviation}
          </div>
          <div className="text-[10px] text-accent font-bold mt-1 leading-tight">
            Кто больше {categoryLabel}?
          </div>
          {!locked && !isFinished && (
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
          {isResolved && isCorrectPick && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <Trophy size={10} />+{pick?.points_earned ?? 1}
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-1 text-[10px] text-success font-bold mt-1">
              <Check size={10} /> OK
            </div>
          )}
        </div>

        {/* Right: 5 player options */}
        <div className="flex-1 grid grid-cols-5 divide-x divide-border">
          {options.map((opt) => {
            const isSelected = localPick === opt.name;
            const isCorrect = isResolved && question.correct_answer === opt.name;
            const isWrong = isResolved && isSelected && question.correct_answer !== opt.name;
            const canSelect = !locked && !isFinished && !saving;
            const count = pickCounts?.[opt.name] ?? 0;
            const pct = totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0;
            const nbaId = opt.name !== "other" ? getPlayerNbaId(opt.name) : null;

            let bg = "";
            if (isSelected && !isResolved) bg = "bg-accent/20 ring-1 ring-accent/40 ring-inset";
            else if (isCorrect) bg = "bg-success/10";
            else if (isWrong) bg = "bg-danger/10";

            return (
              <button
                key={opt.name}
                onClick={() => handlePick(opt.name)}
                disabled={!canSelect}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-all ${
                  canSelect ? "cursor-pointer hover:bg-surface" : "cursor-default"
                } ${bg}`}
              >
                {nbaId ? (
                  <img
                    src={getPlayerHeadshotUrl(nbaId)}
                    alt={opt.name}
                    className="w-10 h-8 sm:w-12 sm:h-9 object-cover object-top rounded"
                  />
                ) : (
                  <HelpCircle size={24} className="text-muted" />
                )}
                <span className="text-[10px] sm:text-[11px] font-medium leading-tight text-center">
                  {opt.name === "other" ? "Другой" : opt.name.split(" ").pop()}
                </span>
                <div className="h-3 flex items-center">
                  {isSelected && !isResolved && (
                    <Check size={10} className="text-accent" />
                  )}
                  {isCorrect && (
                    <span className="text-[9px] text-success font-bold flex items-center gap-0.5">
                      <Trophy size={8} />
                      {question.correct_value}
                    </span>
                  )}
                  {isResolved && !isCorrect && (
                    <span className="text-[9px] text-muted">{pct}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
