"use client";

import { getTeamLogoUrl } from "@/lib/utils";
import type { NbaSeries, NbaTeam } from "@/lib/types";

interface SeriesWithTeams extends NbaSeries {
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

export default function SeriesCard({ series }: { series: SeriesWithTeams }) {
  const { home_team, away_team, home_wins, away_wins, status, winner_id } =
    series;

  if (!home_team || !away_team) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 opacity-50">
        <p className="text-muted text-sm text-center">Ожидание соперников</p>
      </div>
    );
  }

  const isFinished = status === "finished";

  return (
    <div
      className={`bg-card border rounded-xl p-4 transition-colors ${
        isFinished ? "border-border" : "border-accent/30"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Home team */}
        <TeamRow
          team={home_team}
          wins={home_wins}
          isWinner={winner_id === home_team.id}
          isFinished={isFinished}
        />

        <div className="text-muted text-xs font-medium shrink-0">VS</div>

        {/* Away team */}
        <TeamRow
          team={away_team}
          wins={away_wins}
          isWinner={winner_id === away_team.id}
          isFinished={isFinished}
          reverse
        />
      </div>

      {isFinished && (
        <div className="text-center mt-2">
          <span className="text-xs text-success font-medium">
            {home_wins} - {away_wins}
          </span>
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  wins,
  isWinner,
  isFinished,
  reverse,
}: {
  team: NbaTeam;
  wins: number;
  isWinner: boolean;
  isFinished: boolean;
  reverse?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 flex-1 ${
        reverse ? "flex-row-reverse text-right" : ""
      }`}
    >
      <img
        src={getTeamLogoUrl(team.id)}
        alt={team.abbreviation}
        className="w-8 h-8 object-contain"
      />
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold truncate ${
            isFinished && !isWinner ? "text-muted" : "text-foreground"
          } ${isWinner ? "text-success" : ""}`}
        >
          {team.abbreviation}
        </p>
        <p className="text-xs text-muted">{wins}W</p>
      </div>
    </div>
  );
}
