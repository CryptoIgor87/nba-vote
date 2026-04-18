"use client";

import { useState } from "react";
import { getTeamLogoUrl, getRoundLabel } from "@/lib/utils";
import { Check } from "lucide-react";
import Countdown from "./Countdown";
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
  firstGameDate,
}: {
  series: SeriesWithTeams;
  prediction?: SeriesPred;
  onSave: (
    seriesId: string,
    winnerId: number,
    homeWins: number,
    awayWins: number
  ) => Promise<boolean>;
  firstGameDate?: string;
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

  const isLocked =
    series.status !== "upcoming" ||
    (firstGameDate ? new Date() >= new Date(firstGameDate) : false);

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

  const scoreOptions = selectedWinner
    ? SCORE_OPTIONS.map(([w, l]) => {
        if (selectedWinner === home_team.id) return { home: w, away: l };
        return { home: l, away: w };
      })
    : [];

  const changed = !prediction ||
    prediction.predicted_winner_id !== selectedWinner ||
    `${prediction.predicted_home_wins}-${prediction.predicted_away_wins}` !== selectedScore;

  return (
    <div
      className={`bg-card border rounded-xl p-3 ${
        prediction ? "border-success/20" : "border-accent/20"
      }`}
    >
      {/* Header: timer */}
      {!isLocked && firstGameDate && (
        <div className="mb-2">
          <Countdown deadline={firstGameDate} />
        </div>
      )}

      {/* Teams row */}
      <div className="flex gap-1.5 mb-2">
        {[home_team, away_team].map((team) => (
          <button
            key={team.id}
            onClick={() => {
              if (isLocked) return;
              setSelectedWinner(team.id);
              setSelectedScore(null);
            }}
            disabled={isLocked}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all ${
              selectedWinner === team.id
                ? "border-accent bg-accent/15"
                : "border-border hover:border-muted"
            } ${isLocked ? "opacity-60 cursor-default" : "cursor-pointer"}`}
          >
            <img
              src={getTeamLogoUrl(team.id)}
              alt={team.abbreviation}
              className="w-6 h-6"
            />
            <span className="text-xs font-bold">{team.abbreviation}</span>
          </button>
        ))}
      </div>

      {/* Score options */}
      {selectedWinner && (
        <div className="flex gap-1 mb-2">
          {scoreOptions.map((s) => {
            const key = `${s.home}-${s.away}`;
            return (
              <button
                key={key}
                onClick={() => !isLocked && setSelectedScore(key)}
                disabled={isLocked}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                  selectedScore === key
                    ? "bg-gradient-to-br from-accent to-amber-600 text-white shadow-sm"
                    : "bg-surface text-foreground hover:bg-card-hover"
                } ${isLocked ? "opacity-60 cursor-default" : "cursor-pointer"}`}
              >
                {s.home}-{s.away}
              </button>
            );
          })}
        </div>
      )}

      {/* Save / Status */}
      {!isLocked && selectedWinner && selectedScore && changed && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {saved ? "OK" : saving ? "..." : prediction ? "Обновить" : "Сохранить"}
        </button>
      )}

      {!isLocked && selectedWinner && selectedScore && !changed && (
        <div className="text-center text-[10px] text-success font-medium flex items-center justify-center gap-1">
          <Check size={10} />
          Сохранено
        </div>
      )}

      {isLocked && prediction && (
        <div className="text-center text-[10px] text-muted font-medium">
          {prediction.predicted_winner_id === home_team.id
            ? home_team.abbreviation
            : away_team.abbreviation}{" "}
          {prediction.predicted_home_wins} - {prediction.predicted_away_wins}
        </div>
      )}
    </div>
  );
}
