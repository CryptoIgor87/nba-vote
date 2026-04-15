"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, X, Minus } from "lucide-react";
import { getTeamLogoUrl, formatGameDate, getRoundLabel } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  display_name: string | null;
  image: string | null;
  avatar_url: string | null;
}

interface Game {
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
}

interface Pick {
  picked_team_id: number;
  correct: boolean | null;
  points: number;
}

interface HistoryData {
  games: Game[];
  users: User[];
  predictions: Record<number, Record<string, Pick>>;
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => (r.ok ? r.json() : null))
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

  if (!data || data.games.length === 0) {
    return (
      <div className="max-w-5xl mx-auto">
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 py-2"
        >
          <ArrowLeft size={16} /> Рейтинг
        </Link>
        <p className="text-center text-muted py-10">
          Пока нет событий с закрытыми прогнозами
        </p>
      </div>
    );
  }

  const { games, users, predictions } = data;

  // Only show users who have at least one prediction
  const activeUsers = users.filter((u) =>
    games.some((g) => predictions[g.id]?.[u.id])
  );

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4 px-4">
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 text-sm text-muted hover:text-foreground py-2"
        >
          <ArrowLeft size={16} /> Рейтинг
        </Link>
        <h1 className="text-xl font-bold">Сводная таблица</h1>
        <div />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          {/* Header: user avatars */}
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left text-xs text-muted font-semibold min-w-[140px]">
                Матч
              </th>
              {activeUsers.map((user) => {
                const avatar = user.avatar_url || user.image;
                const name = user.display_name || user.name || "?";
                return (
                  <th key={user.id} className="px-1 py-2 text-center min-w-[52px]">
                    <Link
                      href={`/user/${user.id}`}
                      className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface overflow-hidden border border-border mx-auto">
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
                      <span className="text-[9px] text-muted font-medium truncate max-w-[50px] block">
                        {name.split(" ")[0]}
                      </span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body: one row per game */}
          <tbody>
            {games.map((game) => {
              const isFinished = game.status === "finished";

              return (
                <tr key={game.id} className="border-t border-border">
                  {/* Game info - sticky left */}
                  <td className="sticky left-0 z-10 bg-card px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={getTeamLogoUrl(game.home_team_id)}
                        alt=""
                        className="w-5 h-5"
                      />
                      {isFinished ? (
                        <span className="text-xs font-black">
                          {game.home_score}-{game.away_score}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted">vs</span>
                      )}
                      <img
                        src={getTeamLogoUrl(game.away_team_id)}
                        alt=""
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="text-[9px] text-muted mt-0.5 leading-tight">
                      {formatGameDate(game.game_date)}
                      {game.round && (
                        <span className="ml-1 text-accent">
                          {game.round === "play_in" ? "PI" : "R1"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* User picks */}
                  {activeUsers.map((user) => {
                    const pick = predictions[game.id]?.[user.id];

                    if (!pick) {
                      return (
                        <td key={user.id} className="px-1 py-2 text-center">
                          <Minus size={12} className="text-border mx-auto" />
                        </td>
                      );
                    }

                    const pickedAbbr =
                      pick.picked_team_id === game.home_team_id
                        ? game.home_team?.abbreviation
                        : game.away_team?.abbreviation;

                    return (
                      <td
                        key={user.id}
                        className={`px-1 py-2 text-center ${
                          isFinished
                            ? pick.correct
                              ? "bg-success/10"
                              : "bg-danger/10"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <img
                            src={getTeamLogoUrl(pick.picked_team_id)}
                            alt=""
                            className="w-5 h-5"
                          />
                          <span className="text-[9px] font-bold">
                            {pickedAbbr}
                          </span>
                          {isFinished &&
                            (pick.correct ? (
                              <span className="text-[9px] text-success font-bold">
                                +{pick.points}
                              </span>
                            ) : (
                              <X size={9} className="text-danger" />
                            ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
