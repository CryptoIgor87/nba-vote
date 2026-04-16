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

  const westR1 = getSeries("West", "first_round");
  const westSF = getSeries("West", "conference_semis");
  const westCF = getSeries("West", "conference_finals");
  const eastR1 = getSeries("East", "first_round");
  const eastSF = getSeries("East", "conference_semis");
  const eastCF = getSeries("East", "conference_finals");
  const finals = series.find((s) => s.round === "finals");

  const ROUND_W = 140;
  const CONN_W = 28;
  const FINALS_W = 160;
  const BRACKET_H = 520;
  const WEST_W = ROUND_W * 3 + CONN_W * 2;
  const EAST_W = WEST_W;
  const MID_W = CONN_W * 2 + FINALS_W;
  const TOTAL_W = WEST_W + MID_W + EAST_W;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Плей-офф NBA 2025-26</h1>

      {/* Play-In compact */}
      {playInGames.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-accent mb-2">Play-In</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {playInGames.map((g) => (
              <PlayInCard key={g.id} game={g} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted mb-2 sm:hidden">Прокрутите вправо для полной сетки &rarr;</p>
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: TOTAL_W }}>
          {/* Conference labels row */}
          <div className="flex mb-1">
            <div style={{ width: WEST_W }} className="text-center text-xs font-bold text-accent">
              Запад
            </div>
            <div style={{ width: MID_W }} />
            <div style={{ width: EAST_W }} className="text-center text-xs font-bold text-accent">
              Восток
            </div>
          </div>

          {/* Bracket body */}
          <div className="flex items-stretch" style={{ height: BRACKET_H }}>
            {/* WEST */}
            <Round width={ROUND_W} label="1 раунд" slots={4} series={westR1} />
            <ConnectorCollapse width={CONN_W} count={4} />
            <Round width={ROUND_W} label="Полуфинал" slots={2} series={westSF} />
            <ConnectorCollapse width={CONN_W} count={2} />
            <Round width={ROUND_W} label="Финал конф." slots={1} series={westCF} />

            {/* CENTER */}
            <ConnectorStraight width={CONN_W} />
            <Round width={FINALS_W} label="Финал NBA" slots={1} series={finals ? [finals] : []} accent />
            <ConnectorStraight width={CONN_W} />

            {/* EAST (mirrored) */}
            <Round width={ROUND_W} label="Финал конф." slots={1} series={eastCF} />
            <ConnectorCollapse width={CONN_W} count={2} reversed />
            <Round width={ROUND_W} label="Полуфинал" slots={2} series={eastSF} />
            <ConnectorCollapse width={CONN_W} count={4} reversed />
            <Round width={ROUND_W} label="1 раунд" slots={4} series={eastR1} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Round({
  width,
  label,
  slots,
  series,
  accent,
}: {
  width: number;
  label: string;
  slots: number;
  series: SeriesWithTeams[];
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col shrink-0" style={{ width }}>
      <div
        className={`text-[10px] font-bold uppercase text-center h-5 leading-5 ${
          accent ? "text-accent" : "text-muted"
        }`}
      >
        {label}
      </div>
      <div className="flex-1 flex flex-col">
        {Array.from({ length: slots }).map((_, i) => (
          <div key={i} className="flex-1 flex items-center px-1">
            <MatchupCard series={series[i]} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectorCollapse({
  width,
  count,
  reversed,
}: {
  width: number;
  count: number;
  reversed?: boolean;
}) {
  const pairs = count / 2;
  return (
    <div className="flex flex-col shrink-0" style={{ width }}>
      <div className="h-5" />
      <div className="flex-1 flex flex-col">
        {Array.from({ length: pairs }).map((_, i) => (
          <div key={i} className="flex-1 flex">
            {reversed ? (
              <>
                {/* Horizontal line from card on the left into the middle */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex-1 border-b border-border" />
                  <div className="flex-1" />
                </div>
                {/* Vertical bar with horizontals going right to the two cards */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex-1" />
                  <div className="flex-1 border-l border-t border-border" />
                  <div className="flex-1 border-l border-b border-border" />
                  <div className="flex-1" />
                </div>
              </>
            ) : (
              <>
                {/* Vertical bar with horizontals going left from the two cards */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex-1" />
                  <div className="flex-1 border-r border-t border-border" />
                  <div className="flex-1 border-r border-b border-border" />
                  <div className="flex-1" />
                </div>
                {/* Horizontal line from the middle into the card on the right */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex-1 border-b border-border" />
                  <div className="flex-1" />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectorStraight({ width }: { width: number }) {
  return (
    <div className="flex flex-col shrink-0" style={{ width }}>
      <div className="h-5" />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 border-b border-border" />
        <div className="flex-1" />
      </div>
    </div>
  );
}

function MatchupCard({ series }: { series?: SeriesWithTeams }) {
  const isFinished = series?.status === "finished";

  return (
    <div
      className={`rounded-lg overflow-hidden w-full bg-card border ${
        series
          ? isFinished
            ? "border-success/30"
            : "border-border"
          : "border-dashed border-border opacity-60"
      }`}
    >
      {series?.home_team ? (
        <TeamRow
          team={series.home_team}
          wins={series.home_wins}
          isWinner={series.winner_id === series.home_team.id}
          isLoser={isFinished && series.winner_id !== series.home_team.id}
        />
      ) : (
        <TbdRow />
      )}
      <div className="border-t border-border" />
      {series?.away_team ? (
        <TeamRow
          team={series.away_team}
          wins={series.away_wins}
          isWinner={series.winner_id === series.away_team.id}
          isLoser={isFinished && series.winner_id !== series.away_team.id}
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
      className={`flex items-center gap-1.5 px-2 py-1 ${
        isWinner ? "bg-success/10" : isLoser ? "opacity-40" : ""
      }`}
    >
      <img
        src={getTeamLogoUrl(team.id)}
        alt={team.abbreviation}
        className="w-5 h-5 object-contain"
      />
      <span className={`text-xs font-bold flex-1 ${isWinner ? "text-success" : ""}`}>
        {team.abbreviation}
      </span>
      <span
        className={`text-xs font-bold w-4 text-center ${
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
    <div className="flex items-center gap-1.5 px-2 py-1 opacity-50">
      <div className="w-5 h-5 rounded-full bg-surface border border-dashed border-border flex items-center justify-center text-muted text-[8px]">
        ?
      </div>
      <span className="text-xs font-bold text-muted flex-1">TBD</span>
      <span className="text-xs font-bold w-4 text-center text-muted">-</span>
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
  const date = new Date(game.game_date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-card border border-border rounded-lg px-2 py-1.5 flex items-center justify-center gap-1.5 text-xs">
      <img src={getTeamLogoUrl(game.home_team_id)} alt="" className="w-5 h-5 shrink-0" />
      <span
        className={`font-bold ${
          isFinished && homeWins ? "text-success" : isFinished ? "text-muted" : ""
        }`}
      >
        {game.home_team?.abbreviation || "?"}
      </span>
      {isFinished ? (
        <span className="text-muted font-bold mx-0.5">
          {game.home_score}-{game.away_score}
        </span>
      ) : (
        <span className="text-muted mx-0.5">{date}</span>
      )}
      <span
        className={`font-bold ${
          isFinished && !homeWins ? "text-success" : isFinished ? "text-muted" : ""
        }`}
      >
        {game.away_team?.abbreviation || "?"}
      </span>
      <img src={getTeamLogoUrl(game.away_team_id)} alt="" className="w-5 h-5 shrink-0" />
    </div>
  );
}
