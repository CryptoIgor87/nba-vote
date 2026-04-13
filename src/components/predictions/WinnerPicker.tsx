"use client";

import { useEffect, useState } from "react";
import { getTeamLogoUrl } from "@/lib/utils";
import { Trophy } from "lucide-react";
import type { NbaTeam } from "@/lib/types";

export default function WinnerPicker({ teams }: { teams: NbaTeam[] }) {
  const [winnerPrediction, setWinnerPrediction] = useState<{
    team_id: number;
    points_earned: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/winner");
      if (res.ok) {
        const data = await res.json();
        setWinnerPrediction(data);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!selectedTeam) return;
    setSaving(true);
    const res = await fetch("/api/winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: selectedTeam }),
    });

    if (res.ok) {
      const data = await res.json();
      setWinnerPrediction(data);
      setIsOpen(false);
    } else {
      const error = await res.json();
      alert(error.error || "Ошибка");
    }
    setSaving(false);
  };

  if (loading) return null;

  const selectedTeamData = teams.find(
    (t) => t.id === (winnerPrediction?.team_id || selectedTeam)
  );

  if (winnerPrediction) {
    return (
      <div className="bg-card border border-accent/30 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-accent" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Победитель турнира</p>
            <div className="flex items-center gap-2 mt-1">
              {selectedTeamData && (
                <img
                  src={getTeamLogoUrl(selectedTeamData.id)}
                  alt={selectedTeamData.abbreviation}
                  className="w-6 h-6"
                />
              )}
              <span className="text-sm">
                {selectedTeamData?.full_name || "—"}
              </span>
            </div>
          </div>
          {winnerPrediction.points_earned > 0 && (
            <span className="text-success font-bold text-lg">
              +{winnerPrediction.points_earned}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-accent/30 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-accent" />
          <div>
            <p className="text-sm font-semibold">Победитель турнира</p>
            <p className="text-xs text-muted">
              +10 баллов. Ставка делается один раз.
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
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                  selectedTeam === team.id
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-muted"
                }`}
              >
                <img
                  src={getTeamLogoUrl(team.id)}
                  alt={team.abbreviation}
                  className="w-8 h-8"
                />
                <span className="text-xs font-medium truncate w-full text-center">
                  {team.abbreviation}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              onClick={() => {
                setIsOpen(false);
                setSelectedTeam(null);
              }}
              className="px-3 py-1.5 text-sm text-muted hover:text-foreground"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedTeam || saving}
              className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? "Сохраняю..." : "Подтвердить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
