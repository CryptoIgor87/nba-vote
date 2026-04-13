"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/leaderboard");
      if (res.ok) setEntries(await res.json());
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trophy size={24} className="text-accent" />
        Рейтинг
      </h1>

      {entries.length === 0 ? (
        <p className="text-center text-muted py-10">
          Пока нет данных. Сделайте первые прогнозы!
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const user = entry.user;
            const avatar = user?.avatar_url || user?.image;
            const name = user?.display_name || user?.name || "Игрок";

            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  rank <= 3
                    ? "bg-card border-accent/30"
                    : "bg-card border-border"
                }`}
              >
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
                <div className="w-10 h-10 rounded-full bg-background overflow-hidden shrink-0">
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

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{name}</p>
                  <p className="text-xs text-muted">
                    {entry.total_predictions} прогнозов ·{" "}
                    {entry.correct_winners} угаданных
                  </p>
                </div>

                {/* Points */}
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold text-accent">
                    {entry.total_points}
                  </p>
                  <p className="text-xs text-muted">баллов</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
