"use client";

import { useEffect, useState } from "react";
import { getTeamLogoUrl } from "@/lib/utils";
import type { NbaSeries, NbaTeam } from "@/lib/types";

interface SeriesWithTeams extends NbaSeries {
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

export default function BracketPage() {
  const [series, setSeries] = useState<SeriesWithTeams[]>([]);
  const [games, setGames] = useState<
    { id: number; round: string; game_date: string; home_team_id: number; away_team_id: number; status: string; home_score: number | null; away_score: number | null; home_team?: NbaTeam; away_team?: NbaTeam }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [seriesRes, gamesRes] = await Promise.all([
        fetch("/api/bracket"),
        fetch("/api/games"),
      ]);
      if (seriesRes.ok) setSeries(await seriesRes.json());
      if (gamesRes.ok) setGames(await gamesRes.json());
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

  const playInGames = games.filter((g) => g.round === "play_in");

  const getSeries = (conf: string, round: string) =>
    series
      .filter((s) => s.conference === conf && s.round === round)
      .sort((a, b) => (a.series_number || 0) - (b.series_number || 0));

  const finalsSeries = series.filter((s) => s.round === "finals");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Плей-офф NBA 2025-26</h1>

      {/* Play-In */}
      {playInGames.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-accent mb-4">Play-In</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {playInGames.map((g) => (
              <PlayInCard key={g.id} game={g} />
            ))}
          </div>
        </div>
      )}

      {/* Conference brackets */}
      {["West", "East"].map((conf) => (
        <div key={conf} className="mb-10">
          <h2 className="text-lg font-semibold text-accent mb-4">
            {conf === "West" ? "Запад" : "Восток"}
          </h2>

          <div className="overflow-x-auto">
            <div className="flex items-stretch gap-0 min-w-[700px]">
              {/* Round 1 */}
              <div className="flex flex-col justify-around flex-1 gap-3">
                <div className="text-xs text-muted font-semibold text-center mb-1">
                  1-й раунд
                </div>
                {/* Top half: #1 (1v8) and #2 (4v5) */}
                <MatchupCard series={getSeries(conf, "first_round")[0]} />
                <MatchupCard series={getSeries(conf, "first_round")[1]} />
                {/* Bottom half: #3 (3v6) and #4 (2v7) */}
                <div className="h-4" />
                <MatchupCard series={getSeries(conf, "first_round")[2]} />
                <MatchupCard series={getSeries(conf, "first_round")[3]} />
              </div>

              {/* Connector */}
              <div className="flex flex-col justify-around w-6 shrink-0">
                <Connector />
                <div className="h-4" />
                <Connector />
              </div>

              {/* Semis */}
              <div className="flex flex-col justify-around flex-1 gap-3">
                <div className="text-xs text-muted font-semibold text-center mb-1">
                  Полуфинал
                </div>
                <div className="flex-1 flex items-center">
                  {getSeries(conf, "conference_semis")[0] ? (
                    <MatchupCard series={getSeries(conf, "conference_semis")[0]} />
                  ) : (
                    <EmptySlot />
                  )}
                </div>
                <div className="h-4" />
                <div className="flex-1 flex items-center">
                  {getSeries(conf, "conference_semis")[1] ? (
                    <MatchupCard series={getSeries(conf, "conference_semis")[1]} />
                  ) : (
                    <EmptySlot />
                  )}
                </div>
              </div>

              {/* Connector */}
              <div className="flex flex-col justify-center w-6 shrink-0">
                <Connector />
              </div>

              {/* Conference Finals */}
              <div className="flex flex-col justify-center flex-1">
                <div className="text-xs text-muted font-semibold text-center mb-1">
                  Финал конф.
                </div>
                {getSeries(conf, "conference_finals")[0] ? (
                  <MatchupCard series={getSeries(conf, "conference_finals")[0]} />
                ) : (
                  <EmptySlot />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Finals */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-accent mb-4 text-center">
          Финал NBA
        </h2>
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            {finalsSeries.length > 0 ? (
              <MatchupCard series={finalsSeries[0]} />
            ) : (
              <EmptySlot />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center h-full justify-center py-4">
      <div className="w-full border-t-2 border-border" />
      <div className="h-full border-l-2 border-border" />
      <div className="w-full border-t-2 border-border" />
    </div>
  );
}

function MatchupCard({ series }: { series?: SeriesWithTeams }) {
  if (!series) return <EmptySlot />;

  const { home_team, away_team, home_wins, away_wins, winner_id, status } =
    series;

  const isFinished = status === "finished";

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden w-full ${
        isFinished ? "border-success/30" : "border-border"
      }`}
    >
      {home_team ? (
        <TeamRow
          team={home_team}
          wins={home_wins}
          isWinner={winner_id === home_team.id}
          isLoser={isFinished && winner_id !== home_team.id}
        />
      ) : (
        <TbdRow />
      )}
      <div className="border-t border-border" />
      {away_team ? (
        <TeamRow
          team={away_team}
          wins={away_wins}
          isWinner={winner_id === away_team.id}
          isLoser={isFinished && winner_id !== away_team.id}
        />
      ) : (
        <TbdRow />
      )}
    </div>
  );
}

function TeamRow({
  team,
  wins,
  isWinner,
  isLoser,
}: {
  team: NbaTeam;
  wins: number;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 ${
        isWinner ? "bg-success/10" : isLoser ? "opacity-40" : ""
      }`}
    >
      <img
        src={getTeamLogoUrl(team.id)}
        alt={team.abbreviation}
        className="w-7 h-7 object-contain"
      />
      <span
        className={`text-sm font-bold flex-1 ${
          isWinner ? "text-success" : ""
        }`}
      >
        {team.abbreviation}
      </span>
      <span
        className={`text-sm font-bold w-5 text-center ${
          isWinner ? "text-success" : "text-muted"
        }`}
      >
        {wins}
      </span>
    </div>
  );
}

function TbdRow() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 opacity-40">
      <div className="w-7 h-7 rounded-full bg-surface border border-dashed border-border flex items-center justify-center text-xs text-muted">
        ?
      </div>
      <span className="text-sm font-bold text-muted flex-1">Play-In</span>
      <span className="text-sm font-bold w-5 text-center text-muted">-</span>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="bg-card border border-dashed border-border rounded-xl px-3 py-4 w-full opacity-40">
      <p className="text-xs text-muted text-center">TBD</p>
    </div>
  );
}

function PlayInCard({
  game,
}: {
  game: {
    id: number;
    game_date: string;
    home_team_id: number;
    away_team_id: number;
    status: string;
    home_score: number | null;
    away_score: number | null;
    home_team?: NbaTeam;
    away_team?: NbaTeam;
  };
}) {
  const isFinished = game.status === "finished";
  const homeWins = isFinished && game.home_score! > game.away_score!;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="text-center py-1.5 bg-surface text-xs text-muted font-medium">
        {new Date(game.game_date).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <img
            src={getTeamLogoUrl(game.home_team_id)}
            alt=""
            className="w-7 h-7"
          />
          <span
            className={`text-sm font-bold ${
              isFinished && homeWins
                ? "text-success"
                : isFinished
                ? "text-muted"
                : ""
            }`}
          >
            {game.home_team?.abbreviation || "?"}
          </span>
        </div>
        {isFinished ? (
          <span className="text-sm font-bold">
            {game.home_score} — {game.away_score}
          </span>
        ) : (
          <span className="text-xs text-muted">VS</span>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${
              isFinished && !homeWins
                ? "text-success"
                : isFinished
                ? "text-muted"
                : ""
            }`}
          >
            {game.away_team?.abbreviation || "?"}
          </span>
          <img
            src={getTeamLogoUrl(game.away_team_id)}
            alt=""
            className="w-7 h-7"
          />
        </div>
      </div>
    </div>
  );
}
