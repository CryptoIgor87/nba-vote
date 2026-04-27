"use client";

import { useState } from "react";
import { formatGameDate, isGameLocked } from "@/lib/utils";
import { getPlayerHeadshotUrl } from "@/lib/players";
import { Lock, Check, Trophy, HelpCircle } from "lucide-react";
import Countdown from "./Countdown";
import type { NbaDailyQuestion, NbaDailyPick, NbaGame, NbaTeam } from "@/lib/types";

const CATEGORY_LABELS: Record<string, { verb: string; stat: string }> = {
  total: { verb: "", stat: "Тотал матча" },
  points: { verb: "забьёт", stat: "очков" },
  threes: { verb: "забьёт", stat: "трёшек" },
  assists: { verb: "сделает", stat: "передач" },
  rebounds: { verb: "соберёт", stat: "подборов" },
  turnovers: { verb: "совершит", stat: "потерь" },
  fouls: { verb: "совершит", stat: "фолов" },
  steals: { verb: "сделает", stat: "перехватов" },
  blocks: { verb: "сделает", stat: "блоков" },
};

interface Props {
  question: NbaDailyQuestion & { game?: NbaGame & { home_team?: NbaTeam; away_team?: NbaTeam } };
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
  const cat = CATEGORY_LABELS[question.category] || { verb: "наберёт", stat: question.category };
  const canSelect = !locked && !isFinished && !saving;
  const isCorrectPick = localPick != null && localPick === question.correct_answer;
  const totalPicks = pickCounts ? Object.values(pickCounts).reduce((s, c) => s + c, 0) : 0;

  const allSameTeam =
    question.player1_team_id === question.player2_team_id &&
    question.player2_team_id === question.player3_team_id &&
    question.player3_team_id === question.player4_team_id;

  const options = [
    { name: question.player1_name, nba_id: question.player1_nba_id },
    { name: question.player2_name, nba_id: question.player2_nba_id },
    { name: question.player3_name, nba_id: question.player3_nba_id },
    { name: question.player4_name, nba_id: question.player4_nba_id },
    ...(!allSameTeam ? [{ name: "other" as const, nba_id: null as number | null }] : []),
  ];

  const handlePick = async (option: string) => {
    if (!canSelect) return;
    setSaving(true);
    const ok = await onSave(question.id, option);
    setSaving(false);
    if (ok) { setLocalPick(option); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className={`rounded-2xl overflow-hidden ring-1 transition-all duration-200 h-full flex flex-col ${
      isResolved ? isCorrectPick ? "ring-success/40" : "ring-border" : locked ? "ring-border opacity-50" : "ring-border hover:ring-accent/50"
    }`}>
      {/* Row 1: info */}
      <div className="bg-surface/60 px-3 py-2 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-accent font-bold">
            {question.category === "total"
              ? `🏀 ${cat.stat} ${game.home_team?.abbreviation}-${game.away_team?.abbreviation}?`
              : `❓ Кто больше ${cat.verb} ${cat.stat}?`}
          </span>
          {isResolved && question.correct_answer && (
            <span className="text-foreground-secondary">
              — {question.correct_answer === "other" ? "Другой" : question.correct_answer} ({question.correct_value})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isFinished && !isResolved && !locked && (
            <Countdown deadline={new Date(new Date(game.game_date).getTime() - 30 * 60 * 1000).toISOString()} />
          )}
          {locked && !isFinished && <Lock size={9} className="text-foreground-tertiary" />}
          {isResolved && isCorrectPick && <span className="score-badge text-[10px]">+{pick?.points_earned ?? 1}</span>}
          {saved && <Check size={12} className="text-success" />}
        </div>
      </div>

      {/* Row 2: options */}
      <div className={`grid ${allSameTeam ? "grid-cols-4" : "grid-cols-5"} bg-card stats-pattern flex-1`}>
        {options.map((opt, idx) => {
          const isSelected = localPick === opt.name;
          const isCorrect = isResolved && question.correct_answer === opt.name;
          const isWrong = isResolved && isSelected && question.correct_answer !== opt.name;
          const count = pickCounts?.[opt.name] ?? 0;
          const pct = totalPicks > 0 ? Math.round((count / totalPicks) * 100) : 0;

          return (
            <button
              key={opt.name}
              onClick={() => handlePick(opt.name)}
              disabled={!canSelect}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 transition-all duration-150 ${
                idx < 4 ? "border-r border-border" : ""
              } ${canSelect ? "cursor-pointer active:scale-90 hover:bg-card-hover" : "cursor-default"} ${
                isSelected && !isResolved ? "bg-accent/10" : ""
              } ${isCorrect ? "bg-success/8" : ""} ${isWrong ? "bg-danger/8" : ""}`}
            >
              {question.category === "total" ? (
                <span className={`text-sm sm:text-base font-black tabular-nums ${
                  isCorrect ? "text-success" : isSelected && !isResolved ? "text-accent" : ""
                }`}>
                  {opt.name}
                </span>
              ) : (
                <>
                  {opt.nba_id ? (
                    <img src={getPlayerHeadshotUrl(opt.nba_id)} alt={opt.name}
                      className="w-10 h-8 sm:w-12 sm:h-9 object-cover object-top rounded-md" />
                  ) : (
                    <HelpCircle size={24} className="text-foreground-tertiary" />
                  )}
                  <span className={`text-[10px] sm:text-[11px] font-semibold leading-tight text-center ${
                    isCorrect ? "text-success" : isSelected && !isResolved ? "text-accent" : ""
                  }`}>
                    {opt.name === "other" ? "Другой" : opt.name.split(" ").pop()}
                  </span>
                </>
              )}
              <div className="h-3 flex items-center">
                {isSelected && !isResolved && <Check size={9} className="text-accent" />}
                {isCorrect && <span className="text-[9px] text-success font-bold"><Trophy size={7} className="inline" /> {question.correct_value}</span>}
                {isResolved && !isCorrect && <span className="text-[9px] text-foreground-tertiary">{pct}%</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
