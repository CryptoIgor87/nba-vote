"use client";

import { useEffect, useState } from "react";
import { getRoundLabel } from "@/lib/utils";
import SeriesCard from "@/components/bracket/SeriesCard";
import type { NbaSeries, NbaTeam } from "@/lib/types";

interface SeriesWithTeams extends NbaSeries {
  home_team?: NbaTeam;
  away_team?: NbaTeam;
  winner_team?: NbaTeam;
}

const ROUNDS = [
  "play_in",
  "first_round",
  "conference_semis",
  "conference_finals",
  "finals",
] as const;

export default function BracketPage() {
  const [series, setSeries] = useState<SeriesWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/bracket");
      if (res.ok) {
        setSeries(await res.json());
      }
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

  if (series.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-2">Сетка плей-офф</h1>
        <p className="text-muted">
          Серии ещё не добавлены. Данные появятся после синхронизации матчей.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Сетка плей-офф NBA 2025</h1>

      {ROUNDS.map((round) => {
        const roundSeries = series.filter((s) => s.round === round);
        if (roundSeries.length === 0) return null;

        const westSeries = roundSeries.filter(
          (s) => s.conference === "West"
        );
        const eastSeries = roundSeries.filter(
          (s) => s.conference === "East"
        );
        const finalsSeries = roundSeries.filter(
          (s) => s.conference === null
        );

        return (
          <div key={round} className="mb-8">
            <h2 className="text-lg font-semibold text-accent mb-4">
              {getRoundLabel(round)}
            </h2>

            {round === "finals" ? (
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  {finalsSeries.map((s) => (
                    <SeriesCard key={s.id} series={s} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {westSeries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted mb-3">
                      Запад
                    </h3>
                    <div className="space-y-3">
                      {westSeries.map((s) => (
                        <SeriesCard key={s.id} series={s} />
                      ))}
                    </div>
                  </div>
                )}
                {eastSeries.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted mb-3">
                      Восток
                    </h3>
                    <div className="space-y-3">
                      {eastSeries.map((s) => (
                        <SeriesCard key={s.id} series={s} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
