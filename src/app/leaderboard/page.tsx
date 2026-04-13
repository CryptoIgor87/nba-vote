"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy, Crown, Target, Flame, Crosshair, TrendingUp, Zap,
} from "lucide-react";
import { getTeamLogoUrl } from "@/lib/utils";
import type { LeaderboardEntry, NbaTeam } from "@/lib/types";

interface WinnerPred {
  user_id: string;
  team_id: number;
  points_earned: number;
}

interface FeedEvent {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  icon: string;
  created_at: string;
  user?: {
    id: string;
    name: string | null;
    display_name: string | null;
    image: string | null;
    avatar_url: string | null;
  };
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  trophy: Trophy,
  target: Target,
  flame: Flame,
  crosshair: Crosshair,
  "trending-up": TrendingUp,
  crown: Crown,
  zap: Zap,
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [winnerPreds, setWinnerPreds] = useState<WinnerPred[]>([]);
  const [teams, setTeams] = useState<NbaTeam[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [lbRes, wpRes, teamsRes, eventsRes] = await Promise.all([
        fetch("/api/leaderboard"),
        fetch("/api/all-winner-predictions"),
        fetch("/api/teams"),
        fetch("/api/events"),
      ]);
      if (lbRes.ok) setEntries(await lbRes.json());
      if (wpRes.ok) setWinnerPreds(await wpRes.json());
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
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

      {/* Event feed */}
      {events.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap size={20} className="text-accent" />
            Лента событий
          </h2>
          <div className="space-y-2">
            {events.map((event) => {
              const IconComp = ICON_MAP[event.icon] || Zap;
              const avatar = event.user?.avatar_url || event.user?.image;
              const date = new Date(event.created_at).toLocaleDateString(
                "ru-RU",
                { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
              );

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-surface overflow-hidden shrink-0 border border-border">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-xs font-bold">
                        {(event.user?.display_name || event.user?.name || "?")[0]}
                      </div>
                    )}
                  </div>

                  {/* Icon */}
                  <IconComp size={16} className="text-accent shrink-0" />

                  {/* Text */}
                  <p className="text-sm flex-1 min-w-0">{event.title}</p>

                  {/* Date */}
                  <span className="text-xs text-muted shrink-0">{date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
