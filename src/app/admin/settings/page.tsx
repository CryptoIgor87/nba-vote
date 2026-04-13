"use client";

import { useEffect, useState } from "react";
import { Settings, Save } from "lucide-react";
import type { NbaSetting } from "@/lib/types";

const LABELS: Record<string, string> = {
  points_correct_winner: "Баллы за победителя матча",
  points_correct_series_winner: "Баллы за победителя серии",
  points_correct_series_score: "Баллы за точный счёт серии",
  points_tournament_winner: "Баллы за победителя турнира",
  points_upset_bonus: "Бонус за апсет (нижний сид выиграл)",
  points_streak_3: "Бонус за стрик 3 подряд",
  points_streak_5: "Бонус за стрик 5 подряд",
  points_streak_7: "Бонус за стрик 7 подряд",
  points_sniper: "Бонус Снайпер (все матчи серии)",
  betting_close_minutes: "Закрытие прогнозов (минуты до матча)",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<NbaSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setSettings(await res.json());
      setLoading(false);
    }
    load();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) =>
      prev.map((s) =>
        s.key === key ? { ...s, value: parseInt(value) || 0 } : s
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: settings.map((s) => ({ key: s.key, value: s.value })),
      }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings size={24} className="text-accent" />
        Настройки
      </h1>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        {settings.map((setting) => (
          <div key={setting.key}>
            <label className="block text-sm font-medium mb-1">
              {LABELS[setting.key] || setting.key}
            </label>
            {setting.description && (
              <p className="text-xs text-muted mb-1">{setting.description}</p>
            )}
            <input
              type="number"
              min="0"
              value={setting.value}
              onChange={(e) => handleChange(setting.key, e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
            />
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {saved ? "Сохранено!" : saving ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
