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

      {/* Play-In compact */}
      {playInGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-accent mb-2">Play-In</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {playInGames.map((g) => (
              <PlayInCard key={g.id} game={g} />
            ))}
          </div>
        </div>
      )}

      {/* Full bracket: West left, Finals center, East right */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-0 min-w-[900px] items-stretch">
          {/* WEST */}
          <ConferenceBracket
            label="Запад"
            firstRound={getSeries("West", "first_round")}
            semis={getSeries("West", "conference_semis")}
            confFinals={getSeries("West", "conference_finals")}
          />

          {/* FINALS */}
          <div className="flex flex-col justify-center px-2 shrink-0">
            <div className="text-[10px] text-accent font-bold text-center mb-1 uppercase">Финал</div>
            {finalsSeries.length > 0 ? (
              <MatchupCard series={finalsSeries[0]} />
            ) : (
              <EmptySlot />
            )}
          </div>

          {/* EAST (reversed) */}
          <ConferenceBracket
            label="Восток"
            firstRound={getSeries("East", "first_round")}
            semis={getSeries("East", "conference_semis")}
            confFinals={getSeries("East", "conference_finals")}
            reverse
          />
        </div>
      </div>
    </div>
  );
}

function ConferenceBracket({
  label,
  firstRound,
  semis,
  confFinals,
  reverse,
}: {
  label: string;
  firstRound: SeriesWithTeams[];
  semis: SeriesWithTeams[];
  confFinals: SeriesWithTeams[];
  reverse?: boolean;
}) {
  const r1 = (
    <div className="flex flex-col justify-around gap-2 w-[140px] shrink-0">
      <div className="text-[10px] text-muted font-bold uppercase text-center">1 раунд</div>
      {firstRound[0] && <MatchupCard series={firstRound[0]} compact />}
      {firstRound[1] && <MatchupCard series={firstRound[1]} compact />}
      <div className="h-2" />
      {firstRound[2] && <MatchupCard series={firstRound[2]} compact />}
      {firstRound[3] && <MatchupCard series={firstRound[3]} compact />}
    </div>
  );

  const conn1 = (
    <div className="flex flex-col justify-around w-4 shrink-0">
      <Connector />
      <div className="h-2" />
      <Connector />
    </div>
  );

  const sf = (
    <div className="flex flex-col justify-around gap-2 w-[140px] shrink-0">
      <div className="text-[10px] text-muted font-bold uppercase text-center">Полуфинал</div>
      <div className="flex-1 flex items-center">
        {semis[0] ? <MatchupCard series={semis[0]} compact /> : <EmptySlot />}
      </div>
      <div className="h-2" />
      <div className="flex-1 flex items-center">
        {semis[1] ? <MatchupCard series={semis[1]} compact /> : <EmptySlot />}
      </div>
    </div>
  );

  const conn2 = (
    <div className="flex flex-col justify-center w-4 shrink-0">
      <Connector />
    </div>
  );

  const cf = (
    <div className="flex flex-col justify-center w-[140px] shrink-0">
      <div className="text-[10px] text-muted font-bold uppercase text-center mb-1">Финал конф.</div>
      {confFinals[0] ? <MatchupCard series={confFinals[0]} compact /> : <EmptySlot />}
    </div>
  );

  const parts = reverse
    ? [cf, conn2, sf, conn1, r1]
    : [r1, conn1, sf, conn2, cf];

  return (
    <div className="flex-1">
      <div className="text-xs font-bold text-accent mb-2 text-center">{label}</div>
      <div className="flex items-stretch">{parts}</div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex flex-col items-center h-full justify-center py-3">
      <div className="w-full border-t border-border" />
      <div className="h-full border-l border-border min-h-[30px]" />
      <div className="w-full border-t border-border" />
    </div>
  );
}

function MatchupCard({ series, compact }: { series?: SeriesWithTeams; compact?: boolean }) {
  if (!series) return <EmptySlot />;

  const { home_team, away_team, home_wins, away_wins, winner_id, status } = series;
  const isFinished = status === "finished";

  return (
    <div
      className={`bg-card border rounded-lg overflow-hidden w-full ${
        isFinished ? "border-success/30" : "border-border"
      }`}
    >
      {home_team ? (
        <TeamRow team={home_team} wins={home_wins} isWinner={winner_id === home_team.id} isLoser={isFinished && winner_id !== home_team.id} compact={compact} />
      ) : (
        <TbdRow compact={compact} />
      )}
      <div className="border-t border-border" />
      {away_team ? (
        <TeamRow team={away_team} wins={away_wins} isWinner={winner_id === away_team.id} isLoser={isFinished && winner_id !== away_team.id} compact={compact} />
      ) : (
        <TbdRow compact={compact} />
      )}
    </div>
  );
}

function TeamRow({
  team, wins, isWinner, isLoser, compact,
}: {
  team: NbaTeam; wins: number; isWinner: boolean; isLoser: boolean; compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "px-2 py-1" : "px-3 py-2"} ${isWinner ? "bg-success/10" : isLoser ? "opacity-40" : ""}`}>
      <img src={getTeamLogoUrl(team.id)} alt={team.abbreviation} className={`${compact ? "w-5 h-5" : "w-7 h-7"} object-contain`} />
      <span className={`${compact ? "text-xs" : "text-sm"} font-bold flex-1 ${isWinner ? "text-success" : ""}`}>
        {team.abbreviation}
      </span>
      <span className={`${compact ? "text-xs" : "text-sm"} font-bold w-4 text-center ${isWinner ? "text-success" : "text-muted"}`}>
        {wins}
      </span>
    </div>
  );
}

function TbdRow({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "px-2 py-1" : "px-3 py-2"} opacity-40`}>
      <div className={`${compact ? "w-5 h-5 text-[8px]" : "w-7 h-7 text-xs"} rounded-full bg-surface border border-dashed border-border flex items-center justify-center text-muted`}>?</div>
      <span className={`${compact ? "text-xs" : "text-sm"} font-bold text-muted flex-1`}>TBD</span>
      <span className={`${compact ? "text-xs" : "text-sm"} font-bold w-4 text-center text-muted`}>-</span>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="bg-card border border-dashed border-border rounded-lg px-2 py-3 w-full opacity-40">
      <p className="text-[10px] text-muted text-center">TBD</p>
    </div>
  );
}

function PlayInCard({ game }: {
  game: { id: number; game_date: string; home_team_id: number; away_team_id: number; status: string; home_score: number | null; away_score: number | null; home_team?: NbaTeam; away_team?: NbaTeam };
}) {
  const isFinished = game.status === "finished";
  const homeWins = isFinished && game.home_score! > game.away_score!;
  const date = new Date(game.game_date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1.5 flex items-center justify-center gap-1.5 text-xs">
      <img src={getTeamLogoUrl(game.home_team_id)} alt="" className="w-5 h-5 shrink-0" />
      <span className={`font-bold ${isFinished && homeWins ? "text-success" : isFinished ? "text-muted" : ""}`}>
        {game.home_team?.abbreviation || "?"}
      </span>
      {isFinished ? (
        <span className="text-muted font-bold mx-0.5">{game.home_score}-{game.away_score}</span>
      ) : (
        <span className="text-muted mx-0.5">{date}</span>
      )}
      <span className={`font-bold ${isFinished && !homeWins ? "text-success" : isFinished ? "text-muted" : ""}`}>
        {game.away_team?.abbreviation || "?"}
      </span>
      <img src={getTeamLogoUrl(game.away_team_id)} alt="" className="w-5 h-5 shrink-0" />
    </div>
  );
}
