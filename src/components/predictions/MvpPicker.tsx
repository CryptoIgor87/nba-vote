"use client";

import { useEffect, useState } from "react";
import { Star, Search } from "lucide-react";
import { getTeamLogoUrl } from "@/lib/utils";
import { NBA_PLAYERS } from "@/lib/players";

export default function MvpPicker() {
  const [mvpPrediction, setMvpPrediction] = useState<{
    player_name: string;
    team_id: number;
    points_earned: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mvp")
      .then((r) => r.json())
      .then((data) => {
        setMvpPrediction(data);
        setLoading(false);
      });
  }, []);

  const filteredPlayers = search
    ? NBA_PLAYERS.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.team.toLowerCase().includes(search.toLowerCase())
      )
    : NBA_PLAYERS;

  const handleSelect = async (player: (typeof NBA_PLAYERS)[0]) => {
    setSaving(true);
    const res = await fetch("/api/mvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: player.name,
        team_id: player.team_id,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setMvpPrediction(data);
      setIsOpen(false);
    } else {
      const error = await res.json();
      alert(error.error || "Ошибка");
    }
    setSaving(false);
  };

  if (loading) return null;

  if (mvpPrediction) {
    const team = NBA_PLAYERS.find(
      (p) => p.name === mvpPrediction.player_name
    );
    return (
      <div className="bg-card border border-accent/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <Star size={20} className="text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold">MVP Финала</p>
            <div className="flex items-center gap-2 mt-1">
              {team && (
                <img
                  src={getTeamLogoUrl(team.team_id)}
                  alt={team.team}
                  className="w-5 h-5"
                />
              )}
              <span className="text-sm font-medium">
                {mvpPrediction.player_name}
              </span>
            </div>
          </div>
          {mvpPrediction.points_earned > 0 ? (
            <span className="text-success font-bold text-lg">
              +{mvpPrediction.points_earned}
            </span>
          ) : (
            <button
              onClick={() => {
                setMvpPrediction(null);
                setIsOpen(true);
              }}
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              Изменить
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-accent/30 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star size={20} className="text-accent" />
          <div>
            <p className="text-sm font-semibold">MVP Финала</p>
            <p className="text-xs text-muted">
              +5 баллов. Ставка делается один раз.
            </p>
          </div>
        </div>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
          >
            Выбрать
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-4">
          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск игрока..."
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>

          {/* Players list */}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredPlayers.map((player) => (
              <button
                key={player.name}
                onClick={() => handleSelect(player)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-left disabled:opacity-50"
              >
                <img
                  src={getTeamLogoUrl(player.team_id)}
                  alt={player.team}
                  className="w-6 h-6"
                />
                <span className="text-sm font-medium flex-1">
                  {player.name}
                </span>
                <span className="text-xs text-muted">{player.team}</span>
              </button>
            ))}
            {filteredPlayers.length === 0 && (
              <p className="text-center text-muted text-sm py-4">
                Игрок не найден
              </p>
            )}
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setIsOpen(false);
                setSearch("");
              }}
              className="px-3 py-1.5 text-sm text-muted hover:text-foreground"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
