"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy, Crown, Target, Flame, Crosshair, TrendingUp, Zap, Plus, Minus,
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy size={24} className="text-accent" />
          Рейтинг
        </h1>
        <Link
          href="/history"
          className="text-sm text-muted hover:text-accent transition-colors font-medium"
        >
          Сводная таблица &rarr;
        </Link>
      </div>

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
                className={`group block rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                  rank === 1
                    ? "bg-gradient-to-r from-accent/10 via-card to-card border border-accent/30 shadow-md hover:shadow-lg"
                    : rank <= 3
                    ? "bg-card border border-accent/20 shadow-sm hover:shadow-md"
                    : "bg-card border border-border hover:border-border shadow-sm hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {rank === 1 ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-md">
                        <span className="text-sm font-black text-white">1</span>
                      </div>
                    ) : rank === 2 ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-sm">
                        <span className="text-sm font-black text-white">2</span>
                      </div>
                    ) : rank === 3 ? (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-sm">
                        <span className="text-sm font-black text-white">3</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-foreground-tertiary">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-surface overflow-hidden shrink-0 ${
                    rank === 1 ? "ring-2 ring-accent/50" : "ring-1 ring-border"
                  }`}>
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-foreground-tertiary text-sm font-bold">
                        {name[0]}
                      </div>
                    )}
                  </div>

                  {/* Name + predictions */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm sm:text-base truncate group-hover:text-accent transition-colors">{name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="text-[11px] text-foreground-tertiary">
                        {entry.total_predictions} прогнозов
                      </span>
                      {wp && wpTeam && (
                        <span className="text-[11px] text-foreground-tertiary flex items-center gap-1">
                          <Crown size={9} className="text-accent" />
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
                    <div className={`text-xl sm:text-2xl font-black tabular-nums ${
                      rank === 1 ? "text-gradient" : "text-accent"
                    }`}>
                      {entry.total_points}
                    </div>
                    <p className="text-[10px] text-foreground-tertiary">баллов</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Event feed */}
      {events.length > 0 && <EventFeed events={events} />}
    </div>
  );
}

function EventFeed({ events }: { events: FeedEvent[] }) {
  const [olderOpen, setOlderOpen] = useState(false);
  const todayStr = new Date().toDateString();

  const todayEvents = events.filter((e) => new Date(e.created_at).toDateString() === todayStr);
  const olderEvents = events.filter((e) => new Date(e.created_at).toDateString() !== todayStr);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Zap size={20} className="text-accent" />
        Лента событий
      </h2>
      <div className="space-y-2">
        {todayEvents.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
        {todayEvents.length === 0 && olderEvents.length > 0 && !olderOpen && (
          <p className="text-sm text-muted py-2">Сегодня пока нет событий</p>
        )}
        {olderEvents.length > 0 && (
          <button
            onClick={() => setOlderOpen(!olderOpen)}
            className="flex items-center justify-between w-full px-3 py-1.5 bg-surface rounded-lg text-xs font-bold text-muted"
          >
            <span>Ранее ({olderEvents.length})</span>
            {olderOpen ? <Minus size={14} /> : <Plus size={14} />}
          </button>
        )}
        {olderOpen && olderEvents.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: FeedEvent }) {
  const IconComp = ICON_MAP[event.icon] || Zap;
  const avatar = event.user?.avatar_url || event.user?.image;
  const date = new Date(event.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const userName = event.user?.display_name || event.user?.name || "Игрок";
  const rawText = event.title.replace(userName, "").trim();
  const pointsMatch = rawText.match(/(\+\d+)$/);
  const eventText = pointsMatch ? rawText.replace(pointsMatch[1], "").trim() : rawText;
  const pointsText = pointsMatch ? pointsMatch[1] : null;

  return (
    <div className="flex items-center gap-3 bg-card border border-border-subtle rounded-xl px-4 py-3 shadow-sm">
      <Link href={`/user/${event.user_id}`} className="shrink-0">
        <div className="w-8 h-8 rounded-full bg-surface overflow-hidden border border-border">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-xs font-bold">
              {userName[0]}
            </div>
          )}
        </div>
      </Link>
      <IconComp size={16} className="text-accent shrink-0" />
      <p className="text-sm flex-1 min-w-0">
        <Link href={`/user/${event.user_id}`} className="font-display font-bold uppercase hover:text-accent transition-colors">
          {userName}
        </Link>{" "}
        <span className="text-foreground-secondary">{eventText}</span>
        {pointsText && <span className="text-success font-bold ml-1">{pointsText}</span>}
      </p>
      <span className="text-xs text-muted shrink-0">{date}</span>
    </div>
  );
}
