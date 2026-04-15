"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X, Minus } from "lucide-react";
import { getTeamLogoUrl, getRoundLabel } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  display_name: string | null;
  image: string | null;
  avatar_url: string | null;
}

interface Game {
  id: number;
  game_date: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  round: string | null;
  game_number: number | null;
  home_team?: { abbreviation: string };
  away_team?: { abbreviation: string };
}

interface Series {
  id: string;
  round: string;
  conference: string;
  team_home_id: number;
  team_away_id: number;
  home_wins: number;
  away_wins: number;
  status: string;
  created_at: string;
  home_team?: { abbreviation: string };
  away_team?: { abbreviation: string };
}

interface GamePick {
  picked_team_id: number;
  correct: boolean | null;
  points: number;
}

interface SeriesPick {
  picked_winner_id: number;
  score: string;
}

interface HistoryData {
  games: Game[];
  series: Series[];
  users: User[];
  gamePredictions: Record<number, Record<string, GamePick>>;
  seriesPredictions: Record<string, Record<string, SeriesPick>>;
}

type Row = {
  type: "game";
  date: string;
  game: Game;
} | {
  type: "series";
  date: string;
  series: Series;
};

export default function HistoryPage() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted">Загрузка...</div>;
  }

  if (!data || (data.games.length === 0 && data.series.length === 0)) {
    return (
      <div className="max-w-5xl mx-auto">
        <BackLink />
        <p className="text-center text-muted py-10">Пока нет событий</p>
      </div>
    );
  }

  const { games, series, users, gamePredictions, seriesPredictions } = data;

  // Active users (have at least one prediction)
  const activeUsers = users.filter((u) =>
    games.some((g) => gamePredictions[g.id]?.[u.id]) ||
    series.some((s) => seriesPredictions[s.id]?.[u.id])
  );

  // Build rows: games + series, sorted by date desc
  const rows: Row[] = [];
  games.forEach((g) => rows.push({ type: "game", date: g.game_date, game: g }));
  series.forEach((s) => {
    // Use first game date of series, or created_at
    const firstGame = games.filter((g) => g.round === "first_round" &&
      ((g.home_team_id === s.team_home_id && g.away_team_id === s.team_away_id) ||
       (g.home_team_id === s.team_away_id && g.away_team_id === s.team_home_id))
    ).sort((a, b) => a.game_date.localeCompare(b.game_date))[0];
    rows.push({ type: "series", date: firstGame?.game_date || s.created_at, series: s });
  });
  rows.sort((a, b) => b.date.localeCompare(a.date));

  // Group by day
  const days = new Map<string, Row[]>();
  rows.forEach((r) => {
    const day = new Date(r.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(r);
  });

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-4 px-4">
        <BackLink />
        <h1 className="text-xl font-bold">Сводная таблица</h1>
        <div />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left text-xs text-muted font-semibold min-w-[130px]">
                Событие
              </th>
              {activeUsers.map((user) => {
                const avatar = user.avatar_url || user.image;
                const name = user.display_name || user.name || "?";
                return (
                  <th key={user.id} className="px-1 py-2 text-center min-w-[52px]">
                    <Link href={`/user/${user.id}`} className="flex flex-col items-center gap-1 hover:opacity-80">
                      <div className="w-8 h-8 rounded-full bg-surface overflow-hidden border border-border mx-auto">
                        {avatar ? (
                          <img src={avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted text-[9px] font-bold">{name[0]}</div>
                        )}
                      </div>
                      <span className="text-[9px] text-muted font-medium truncate max-w-[50px] block">{name.split(" ")[0]}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {[...days.entries()].map(([day, dayRows]) => (
              <>
                {/* Day header */}
                <tr key={`day-${day}`}>
                  <td
                    colSpan={activeUsers.length + 1}
                    className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-xs font-bold text-accent uppercase tracking-wider"
                  >
                    {day}
                  </td>
                </tr>

                {dayRows.map((row) => {
                  if (row.type === "game") return (
                    <GameRow key={`g-${row.game.id}`} game={row.game} users={activeUsers} picks={gamePredictions[row.game.id] || {}} />
                  );
                  return (
                    <SeriesRow key={`s-${row.series.id}`} series={row.series} users={activeUsers} picks={seriesPredictions[row.series.id] || {}} />
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/leaderboard" className="flex items-center gap-1 text-sm text-muted hover:text-foreground py-2">
      <ArrowLeft size={16} /> Рейтинг
    </Link>
  );
}

function GameRow({ game, users, picks }: { game: Game; users: User[]; picks: Record<string, GamePick> }) {
  const isFinished = game.status === "finished";
  return (
    <tr className="border-t border-border">
      <td className="sticky left-0 z-10 bg-card px-2 py-2">
        <div className="flex items-center gap-1.5">
          <img src={getTeamLogoUrl(game.home_team_id)} alt="" className="w-5 h-5" />
          {isFinished ? (
            <span className="text-xs font-black">{game.home_score}-{game.away_score}</span>
          ) : (
            <span className="text-[10px] text-muted">vs</span>
          )}
          <img src={getTeamLogoUrl(game.away_team_id)} alt="" className="w-5 h-5" />
        </div>
        <div className="text-[9px] text-muted mt-0.5">
          {game.round && <span className="text-accent">{game.round === "play_in" ? "Play-In" : `Игра ${game.game_number || ""}`}</span>}
        </div>
      </td>
      {users.map((user) => {
        const pick = picks[user.id];
        if (!pick) return <td key={user.id} className="px-1 py-2 text-center"><Minus size={12} className="text-border mx-auto" /></td>;
        const pickedAbbr = pick.picked_team_id === game.home_team_id ? game.home_team?.abbreviation : game.away_team?.abbreviation;
        return (
          <td key={user.id} className={`px-1 py-2 text-center ${isFinished ? pick.correct ? "bg-success/10" : "bg-danger/10" : ""}`}>
            <div className="flex flex-col items-center gap-0.5">
              <img src={getTeamLogoUrl(pick.picked_team_id)} alt="" className="w-5 h-5" />
              <span className="text-[9px] font-bold">{pickedAbbr}</span>
              {isFinished && (pick.correct
                ? <span className="text-[9px] text-success font-bold">+{pick.points}</span>
                : <X size={9} className="text-danger" />
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function SeriesRow({ series, users, picks }: { series: Series; users: User[]; picks: Record<string, SeriesPick> }) {
  const isFinished = series.status === "finished";
  return (
    <tr className="border-t border-accent/20">
      <td className="sticky left-0 z-10 bg-card px-2 py-2">
        <div className="flex items-center gap-1.5">
          <img src={getTeamLogoUrl(series.team_home_id)} alt="" className="w-5 h-5" />
          {isFinished ? (
            <span className="text-xs font-black">{series.home_wins}-{series.away_wins}</span>
          ) : (
            <span className="text-[10px] text-muted">vs</span>
          )}
          <img src={getTeamLogoUrl(series.team_away_id)} alt="" className="w-5 h-5" />
        </div>
        <div className="text-[9px] text-accent font-semibold mt-0.5">
          Серия {getRoundLabel(series.round)}
        </div>
      </td>
      {users.map((user) => {
        const pick = picks[user.id];
        if (!pick) return <td key={user.id} className="px-1 py-2 text-center"><Minus size={12} className="text-border mx-auto" /></td>;
        return (
          <td key={user.id} className="px-1 py-2 text-center">
            <div className="flex flex-col items-center gap-0.5">
              <img src={getTeamLogoUrl(pick.picked_winner_id)} alt="" className="w-5 h-5" />
              <span className="text-[9px] font-bold">{pick.score}</span>
            </div>
          </td>
        );
      })}
    </tr>
  );
}
