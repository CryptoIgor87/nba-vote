"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X } from "lucide-react";
import { getTeamLogoUrl, formatGameDate, getRoundLabel } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  display_name: string | null;
  image: string | null;
  avatar_url: string | null;
}

interface GameHistory {
  game: {
    id: number;
    game_date: string;
    home_team_id: number;
    away_team_id: number;
    home_score: number | null;
    away_score: number | null;
    status: string;
    round: string | null;
    home_team?: { abbreviation: string };
    away_team?: { abbreviation: string };
  };
  actual_winner_id: number | null;
  picks: {
    user: User | undefined;
    picked_team_id: number;
    correct: boolean | null;
    points: number;
  }[];
}

export default function HistoryPage() {
  const [data, setData] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 py-2"
        >
          <ArrowLeft size={16} /> Рейтинг
        </Link>
        <p className="text-center text-muted py-10">Пока нет завершённых матчей</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/leaderboard"
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 py-2"
      >
        <ArrowLeft size={16} /> Рейтинг
      </Link>

      <h1 className="text-2xl font-bold mb-6">Сводная таблица</h1>

      <div className="space-y-4">
        {data.map((item) => {
          const { game, actual_winner_id, picks } = item;
          const isFinished = game.status === "finished";

          return (
            <div
              key={game.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Game header */}
              <div className="bg-surface px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={getTeamLogoUrl(game.home_team_id)}
                    alt=""
                    className="w-7 h-7"
                  />
                  <span className="text-sm font-bold">
                    {game.home_team?.abbreviation}
                  </span>
                  {isFinished ? (
                    <span className="text-sm font-black mx-1">
                      {game.home_score} - {game.away_score}
                    </span>
                  ) : (
                    <span className="text-xs text-muted mx-1">VS</span>
                  )}
                  <span className="text-sm font-bold">
                    {game.away_team?.abbreviation}
                  </span>
                  <img
                    src={getTeamLogoUrl(game.away_team_id)}
                    alt=""
                    className="w-7 h-7"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-muted">
                    {formatGameDate(game.game_date)}
                  </div>
                  {game.round && (
                    <div className="text-[10px] text-accent font-semibold">
                      {getRoundLabel(game.round)}
                    </div>
                  )}
                </div>
              </div>

              {/* Picks */}
              {picks.length === 0 ? (
                <div className="px-4 py-3 text-xs text-muted">
                  Никто не сделал прогноз
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {picks.map((pick, i) => {
                    const avatar =
                      pick.user?.avatar_url || pick.user?.image;
                    const name =
                      pick.user?.display_name ||
                      pick.user?.name ||
                      "Игрок";
                    const pickedTeamAbbr =
                      pick.picked_team_id === game.home_team_id
                        ? game.home_team?.abbreviation
                        : game.away_team?.abbreviation;

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-2.5 ${
                          isFinished
                            ? pick.correct
                              ? "bg-success/5"
                              : "bg-danger/5"
                            : ""
                        }`}
                      >
                        {/* Avatar */}
                        <Link
                          href={`/user/${pick.user?.id}`}
                          className="shrink-0"
                        >
                          <div className="w-7 h-7 rounded-full bg-surface overflow-hidden border border-border">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted text-[9px] font-bold">
                                {name[0]}
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Name */}
                        <Link
                          href={`/user/${pick.user?.id}`}
                          className="text-sm font-semibold hover:text-accent transition-colors flex-1 min-w-0 truncate"
                        >
                          {name}
                        </Link>

                        {/* Pick */}
                        <div className="flex items-center gap-2 shrink-0">
                          <img
                            src={getTeamLogoUrl(pick.picked_team_id)}
                            alt=""
                            className="w-5 h-5"
                          />
                          <span className="text-xs font-bold w-8">
                            {pickedTeamAbbr}
                          </span>
                          {isFinished &&
                            (pick.correct ? (
                              <span className="text-xs text-success font-bold">
                                +{pick.points}
                              </span>
                            ) : (
                              <X size={12} className="text-danger" />
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
