"use client";

import { useEffect, useState } from "react";
import { getRoundLabel, getTeamLogoUrl } from "@/lib/utils";
import type { NbaSeries, NbaTeam } from "@/lib/types";

interface SeriesWithTeams extends NbaSeries {
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

const PLAYOFF_ROUNDS = [
  "first_round",
  "conference_semis",
  "conference_finals",
  "finals",
] as const;

export default function BracketPage() {
  const [series, setSeries] = useState<SeriesWithTeams[]>([]);
  const [games, setGames] = useState<
    { id: number; round: string; game_date: string; home_team_id: number; away_team_id: number; status: string; home_score: number | null; away_score: number | null }[]
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

  const westSeries = (round: string) =>
    series.filter((s) => s.round === round && s.conference === "West");
  const eastSeries = (round: string) =>
    series.filter((s) => s.round === round && s.conference === "East");
  const finalsSeries = series.filter((s) => s.round === "finals");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Плей-офф NBA 2025-26</h1>

      {/* Play-In Section */}
      {playInGames.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-accent mb-4">Play-In турнир</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {playInGames.map((g) => (
              <PlayInCard key={g.id} game={g} />
            ))}
          </div>
        </div>
      )}

      {/* Bracket */}
      <div className="mb-8">
        {/* West */}
        <h2 className="text-lg font-semibold text-accent mb-4">Запад</h2>
        <BracketConference
          firstRound={westSeries("first_round")}
          semis={westSeries("conference_semis")}
          confFinals={westSeries("conference_finals")}
        />

        {/* Finals */}
        {finalsSeries.length > 0 && (
          <div className="my-6">
            <h2 className="text-lg font-semibold text-accent mb-4 text-center">
              Финал NBA
            </h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <MatchupCard series={finalsSeries[0]} />
              </div>
            </div>
          </div>
        )}

        {/* East */}
        <h2 className="text-lg font-semibold text-accent mb-4 mt-6">Восток</h2>
        <BracketConference
          firstRound={eastSeries("first_round")}
          semis={eastSeries("conference_semis")}
          confFinals={eastSeries("conference_finals")}
        />
      </div>
    </div>
  );
}

function BracketConference({
  firstRound,
  semis,
  confFinals,
}: {
  firstRound: SeriesWithTeams[];
  semis: SeriesWithTeams[];
  confFinals: SeriesWithTeams[];
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {/* Round 1 */}
      <div className="flex flex-col gap-3 min-w-[200px]">
        <div className="text-xs text-muted font-semibold uppercase mb-1">
          1-й раунд
        </div>
        {firstRound.length > 0 ? (
          firstRound.map((s) => <MatchupCard key={s.id} series={s} />)
        ) : (
          <EmptySlot />
        )}
      </div>

      {/* Semis */}
      <div className="flex flex-col gap-3 min-w-[200px] justify-center">
        <div className="text-xs text-muted font-semibold uppercase mb-1">
          Полуфинал
        </div>
        {semis.length > 0 ? (
          semis.map((s) => <MatchupCard key={s.id} series={s} />)
        ) : (
          <EmptySlot />
        )}
      </div>

      {/* Conference Finals */}
      <div className="flex flex-col gap-3 min-w-[200px] justify-center">
        <div className="text-xs text-muted font-semibold uppercase mb-1">
          Финал конференции
        </div>
        {confFinals.length > 0 ? (
          confFinals.map((s) => <MatchupCard key={s.id} series={s} />)
        ) : (
          <EmptySlot />
        )}
      </div>
    </div>
  );
}

function MatchupCard({ series }: { series: SeriesWithTeams }) {
  const { home_team, away_team, home_wins, away_wins, winner_id, status } =
    series;

  if (!home_team || !away_team) {
    return <EmptySlot />;
  }

  const isFinished = status === "finished";

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden ${
        isFinished ? "border-success/30" : "border-border"
      }`}
    >
      <TeamRow
        team={home_team}
        wins={home_wins}
        isWinner={winner_id === home_team.id}
        isLoser={isFinished && winner_id !== home_team.id}
      />
      <div className="border-t border-border" />
      <TeamRow
        team={away_team}
        wins={away_wins}
        isWinner={winner_id === away_team.id}
        isLoser={isFinished && winner_id !== away_team.id}
      />
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

function EmptySlot() {
  return (
    <div className="bg-card border border-dashed border-border rounded-xl p-4 opacity-40">
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
  const homeWins =
    isFinished && game.home_score! > game.away_score!;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="text-center py-1 bg-surface text-xs text-muted font-medium">
        {new Date(game.game_date).toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <img
            src={getTeamLogoUrl(game.home_team_id)}
            alt=""
            className="w-7 h-7"
          />
          <span
            className={`text-sm font-bold ${
              isFinished && homeWins ? "text-success" : isFinished ? "text-muted" : ""
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
              isFinished && !homeWins ? "text-success" : isFinished ? "text-muted" : ""
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
