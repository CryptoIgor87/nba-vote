"use client";

import { useState } from "react";
import { getTeamLogoUrl, getRoundLabel } from "@/lib/utils";
import { Check } from "lucide-react";
import type { NbaSeries, NbaTeam } from "@/lib/types";

interface SeriesWithTeams extends NbaSeries {
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

interface SeriesPred {
  series_id: string;
  predicted_winner_id: number;
  predicted_home_wins: number;
  predicted_away_wins: number;
}

const SCORE_OPTIONS = [
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
];

export default function SeriesPrediction({
  series,
  prediction,
  onSave,
}: {
  series: SeriesWithTeams;
  prediction?: SeriesPred;
  onSave: (
    seriesId: string,
    winnerId: number,
    homeWins: number,
    awayWins: number
  ) => Promise<boolean>;
}) {
  const { home_team, away_team } = series;
  const [selectedWinner, setSelectedWinner] = useState<number | null>(
    prediction?.predicted_winner_id ?? null
  );
  const [selectedScore, setSelectedScore] = useState<string | null>(
    prediction
      ? `${prediction.predicted_home_wins}-${prediction.predicted_away_wins}`
      : null
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!home_team || !away_team) return null;

  // Check if series already started (any game not upcoming)
  const isLocked = series.status !== "upcoming";

  const handleSave = async () => {
    if (!selectedWinner || !selectedScore) return;
    const [h, a] = selectedScore.split("-").map(Number);
    setSaving(true);
    const ok = await onSave(series.id, selectedWinner, h, a);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  // Generate score options based on selected winner
  const scoreOptions = selectedWinner
    ? SCORE_OPTIONS.map(([w, l]) => {
        if (selectedWinner === home_team.id) return { home: w, away: l };
        return { home: l, away: w };
      })
    : [];

  return (
    <div
      className={`bg-card border rounded-xl p-4 ${
        prediction ? "border-success/20" : "border-accent/20"
      }`}
    >
      <div className="text-xs text-muted font-semibold mb-3">
        {getRoundLabel(series.round)} — Прогноз на серию
      </div>

      {/* Team selection */}
      <div className="flex gap-2 mb-3">
        {[home_team, away_team].map((team) => (
          <button
            key={team.id}
            onClick={() => {
              if (isLocked) return;
              setSelectedWinner(team.id);
              setSelectedScore(null);
            }}
            disabled={isLocked}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 transition-all ${
              selectedWinner === team.id
                ? "border-accent bg-accent/10"
                : "border-border hover:border-muted"
            } ${isLocked ? "opacity-60 cursor-default" : "cursor-pointer"}`}
          >
            <img
              src={getTeamLogoUrl(team.id)}
              alt={team.abbreviation}
              className="w-8 h-8"
            />
            <span className="text-sm font-bold">{team.abbreviation}</span>
          </button>
        ))}
      </div>

      {/* Score selection */}
      {selectedWinner && (
        <div className="flex gap-2 mb-3">
          {scoreOptions.map((s) => {
            const key = `${s.home}-${s.away}`;
            return (
              <button
                key={key}
                onClick={() => !isLocked && setSelectedScore(key)}
                disabled={isLocked}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedScore === key
                    ? "bg-accent text-white"
                    : "bg-surface text-foreground hover:bg-card-hover"
                } ${isLocked ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                {s.home}—{s.away}
              </button>
            );
          })}
        </div>
      )}

      {/* Save / Status */}
      {!isLocked && selectedWinner && selectedScore && !prediction && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          {saved ? (
            <>
              <Check size={14} /> Сохранено
            </>
          ) : saving ? (
            "Сохраняю..."
          ) : (
            "Сохранить прогноз на серию"
          )}
        </button>
      )}

      {prediction && (
        <div className="text-center text-xs text-success font-medium flex items-center justify-center gap-1">
          <Check size={12} />
          Прогноз сохранён:{" "}
          {prediction.predicted_winner_id === home_team.id
            ? home_team.abbreviation
            : away_team.abbreviation}{" "}
          {prediction.predicted_home_wins}—{prediction.predicted_away_wins}
        </div>
      )}
    </div>
  );
}
