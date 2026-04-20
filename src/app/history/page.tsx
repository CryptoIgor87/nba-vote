"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, X, Minus } from "lucide-react";
import { getTeamLogoUrl, getRoundLabel } from "@/lib/utils";
import { getPlayerHeadshotUrl } from "@/lib/players";

const CATEGORY_LABELS: Record<string, { verb: string; stat: string }> = {
  points: { verb: "забьёт", stat: "очков" },
  threes: { verb: "забьёт", stat: "трёшек" },
  assists: { verb: "сделает", stat: "передач" },
  rebounds: { verb: "соберёт", stat: "подборов" },
  turnovers: { verb: "совершит", stat: "потерь" },
  fouls: { verb: "совершит", stat: "фолов" },
  steals: { verb: "сделает", stat: "перехватов" },
  blocks: { verb: "сделает", stat: "блоков" },
};

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

interface DailyQuestion {
  id: string;
  question_date: string;
  category: string;
  player1_name: string;
  player1_team_id: number;
  player1_nba_id: number | null;
  player2_name: string;
  player2_team_id: number;
  player2_nba_id: number | null;
  player3_name: string;
  player3_team_id: number;
  player3_nba_id: number | null;
  player4_name: string;
  player4_team_id: number;
  player4_nba_id: number | null;
  correct_answer: string | null;
  correct_value: number | null;
  status: string;
  game: { status: string; game_date: string; home_team_id: number; away_team_id: number } | null;
}

interface DailyPick {
  picked_option: string;
  points: number;
}

interface HistoryData {
  games: Game[];
  series: Series[];
  users: User[];
  gamePredictions: Record<number, Record<string, GamePick>>;
  seriesPredictions: Record<string, Record<string, SeriesPick>>;
  dailyQuestions: DailyQuestion[];
  dailyPicks: Record<string, Record<string, DailyPick>>;
}

type Row = {
  type: "game";
  date: string;
  game: Game;
} | {
  type: "series";
  date: string;
  series: Series;
} | {
  type: "daily";
  date: string;
  question: DailyQuestion;
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

  const { games, series, users, gamePredictions, seriesPredictions, dailyQuestions, dailyPicks } = data;

  // Active users (have at least one prediction)
  const activeUsers = users.filter((u) =>
    games.some((g) => gamePredictions[g.id]?.[u.id]) ||
    series.some((s) => seriesPredictions[s.id]?.[u.id]) ||
    (dailyQuestions || []).some((q) => dailyPicks?.[q.id]?.[u.id])
  );

  // Series rows — shown separately at top
  const seriesRows: Row[] = [];
  series.forEach((s) => {
    seriesRows.push({ type: "series", date: s.created_at, series: s });
  });

  // Game + daily rows, sorted by date desc
  const rows: Row[] = [];
  games.forEach((g) => rows.push({ type: "game", date: g.game_date, game: g }));
  (dailyQuestions || []).forEach((q) => {
    rows.push({ type: "daily", date: q.game?.game_date || q.question_date, question: q });
  });
  // Sort: newest first; within same date, daily BEFORE game (so daily shows above its game)
  const typeOrder: Record<string, number> = { daily: 0, game: 1 };
  rows.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2);
  });

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
              <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left text-xs text-muted font-semibold whitespace-nowrap">
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
            {/* Series predictions — separate block at top */}
            {seriesRows.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={activeUsers.length + 1}
                    className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-xs font-bold text-accent uppercase tracking-wider"
                  >
                    Серии
                  </td>
                </tr>
                {seriesRows.map((row) => (
                  <SeriesRow key={`s-${(row as { series: Series }).series.id}`} series={(row as { series: Series }).series} users={activeUsers} picks={seriesPredictions[(row as { series: Series }).series.id] || {}} />
                ))}
              </>
            )}

            {/* Game + daily rows by day */}
            {[...days.entries()].map(([day, dayRows]) => (
              <>
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
                    <DailyRow key={`d-${(row as { question: DailyQuestion }).question.id}`} question={(row as { question: DailyQuestion }).question} users={activeUsers} picks={dailyPicks?.[(row as { question: DailyQuestion }).question.id] || {}} />
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

function DailyRow({ question, users, picks }: { question: DailyQuestion; users: User[]; picks: Record<string, DailyPick> }) {
  const isResolved = question.status === "resolved";
  const cat = CATEGORY_LABELS[question.category] || { verb: "наберёт", stat: question.category };
  const game = question.game;

  return (
    <tr className="border-t border-accent/20">
      <td className="sticky left-0 z-10 bg-card px-2 py-2">
        <div className="flex items-center gap-1">
          {game && <img src={getTeamLogoUrl(game.home_team_id)} alt="" className="w-4 h-4" />}
          <span className="text-[10px] text-muted">❓</span>
          {game && <img src={getTeamLogoUrl(game.away_team_id)} alt="" className="w-4 h-4" />}
        </div>
        <div className="text-[9px] text-accent font-semibold mt-0.5 leading-tight">
          Кто больше {cat.verb} {cat.stat}?
        </div>
        {isResolved && question.correct_answer && (
          <div className="text-[9px] text-success font-bold leading-tight">
            {question.correct_answer === "other" ? "Другой" : question.correct_answer} ({question.correct_value})
          </div>
        )}
      </td>
      {users.map((user) => {
        const pick = picks[user.id];
        if (!pick) return <td key={user.id} className="px-1 py-2 text-center"><Minus size={12} className="text-border mx-auto" /></td>;

        const isCorrect = isResolved && pick.points > 0;
        const isWrong = isResolved && pick.points === 0;

        // Find nba_id for headshot
        let nbaId: number | null = null;
        if (pick.picked_option === question.player1_name) nbaId = question.player1_nba_id;
        else if (pick.picked_option === question.player2_name) nbaId = question.player2_nba_id;
        else if (pick.picked_option === question.player3_name) nbaId = question.player3_nba_id;
        else if (pick.picked_option === question.player4_name) nbaId = question.player4_nba_id;

        return (
          <td key={user.id} className={`px-1 py-2 text-center ${isCorrect ? "bg-success/10" : isWrong ? "bg-danger/10" : ""}`}>
            <div className="flex flex-col items-center gap-0.5">
              {nbaId ? (
                <img src={getPlayerHeadshotUrl(nbaId)} alt="" className="w-6 h-5 object-cover object-top rounded" />
              ) : (
                <span className="text-[10px] text-muted">?</span>
              )}
              <span className="text-[9px] font-bold truncate max-w-[50px]">
                {pick.picked_option === "other" ? "Другой" : pick.picked_option.split(" ").pop()}
              </span>
              {isCorrect && <span className="text-[9px] text-success font-bold">+{pick.points}</span>}
              {isWrong && <X size={9} className="text-danger" />}
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
