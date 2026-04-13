"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Crown, Star } from "lucide-react";
import { getTeamLogoUrl } from "@/lib/utils";
import type { LeaderboardEntry, NbaTeam } from "@/lib/types";

interface WinnerPred {
  user_id: string;
  team_id: number;
  points_earned: number;
}

interface MvpPred {
  user_id: string;
  player_name: string;
  team_id: number;
  points_earned: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [winnerPreds, setWinnerPreds] = useState<WinnerPred[]>([]);
  const [mvpPreds, setMvpPreds] = useState<MvpPred[]>([]);
  const [teams, setTeams] = useState<NbaTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [lbRes, wpRes, mvpRes, teamsRes] = await Promise.all([
        fetch("/api/leaderboard"),
        fetch("/api/all-winner-predictions"),
        fetch("/api/all-mvp-predictions"),
        fetch("/api/teams"),
      ]);
      if (lbRes.ok) setEntries(await lbRes.json());
      if (wpRes.ok) setWinnerPreds(await wpRes.json());
      if (mvpRes.ok) setMvpPreds(await mvpRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trophy size={24} className="text-accent" />
        Рейтинг
      </h1>

      {entries.length === 0 ? (
        <p className="text-center text-muted py-10">
          Пока нет участников. Зарегистрируйтесь и сделайте первые прогнозы!
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const user = entry.user;
            const avatar = user?.avatar_url || user?.image;
            const name = user?.display_name || user?.name || "Игрок";
            const wp = winnerPreds.find((w) => w.user_id === entry.user_id);
            const mp = mvpPreds.find((m) => m.user_id === entry.user_id);
            const wpTeam = wp ? teamsMap.get(wp.team_id) : null;

            return (
              <Link
                href={`/user/${entry.user_id}`}
                key={entry.user_id}
                className={`block p-4 rounded-xl border transition-colors hover:border-accent/40 ${
                  rank <= 3
                    ? "bg-card border-accent/30"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {rank === 1 ? (
                      <span className="text-2xl">🥇</span>
                    ) : rank === 2 ? (
                      <span className="text-2xl">🥈</span>
                    ) : rank === 3 ? (
                      <span className="text-2xl">🥉</span>
                    ) : (
                      <span className="text-lg font-bold text-muted">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-surface overflow-hidden shrink-0 border border-border">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-sm font-bold">
                        {name[0]}
                      </div>
                    )}
                  </div>

                  {/* Name + predictions */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-muted">
                        {entry.total_predictions} прогнозов
                      </span>
                      {wp && wpTeam && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Crown size={10} className="text-accent" />
                          <img
                            src={getTeamLogoUrl(wp.team_id)}
                            alt={wpTeam.abbreviation}
                            className="w-3.5 h-3.5"
                          />
                          {wpTeam.abbreviation}
                        </span>
                      )}
                      {mp && (
                        <span className="text-xs text-muted flex items-center gap-1">
                          <Star size={10} className="text-accent" />
                          {mp.player_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-accent">
                      {entry.total_points}
                    </p>
                    <p className="text-xs text-muted">баллов</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
