"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, Crown, Check, X, Flame,
  Crosshair, TrendingUp, Target, BarChart3,
} from "lucide-react";
import { getTeamLogoUrl, formatGameDate, getRoundLabel } from "@/lib/utils";
import type { NbaGame, NbaPrediction, NbaTeam } from "@/lib/types";

interface UserProfileData {
  user: {
    id: string;
    name: string | null;
    display_name: string | null;
    image: string | null;
    avatar_url: string | null;
  };
  predictions: NbaPrediction[];
  seriesPredictions: {
    series_id: string;
    predicted_winner_id: number;
    predicted_home_wins: number;
    predicted_away_wins: number;
  }[];
  seriesBonuses: { series_id: string; bonus_type: string; points: number }[];
  bonuses: { bonus_type: string; description: string; points: number; context: string }[];
  winnerPrediction: { team_id: number; points_earned: number } | null;
  games: (NbaGame & { home_team?: NbaTeam; away_team?: NbaTeam })[];
  series: {
    id: string;
    round: string;
    conference: string;
    team_home_id: number;
    team_away_id: number;
    home_wins: number;
    away_wins: number;
    status: string;
  }[];
  teams: NbaTeam[];
  stats: {
    totalPredictions: number;
    correctPredictions: number;
    accuracy: number;
    maxStreak: number;
    currentStreak: number;
    gamePoints: number;
    seriesBonusPoints: number;
    generalBonusPoints: number;
    winnerPoints: number;
  };
}

export default function UserPage() {
  const { id } = useParams();
  const [data, setData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/${id}/predictions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Загрузка...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted">Пользователь не найден</div>
    );
  }

  const {
    user, predictions, seriesPredictions, seriesBonuses,
    bonuses, winnerPrediction, games, series, teams, stats,
  } = data;
  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const userName = user.display_name || user.name || "Игрок";
  const avatar = user.avatar_url || user.image;
  const totalPoints =
    stats.gamePoints + stats.seriesBonusPoints + stats.generalBonusPoints + stats.winnerPoints;

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/leaderboard"
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4 py-2"
      >
        <ArrowLeft size={16} /> Рейтинг
      </Link>

      {/* User header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-surface overflow-hidden border border-border shrink-0">
          {avatar ? (
            <img src={avatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-lg font-bold">
              {userName[0]}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{userName}</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-accent">{totalPoints}</p>
          <p className="text-xs text-muted">баллов</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard icon={Target} label="Прогнозов" value={stats.totalPredictions} />
        <StatCard icon={Check} label="Угадано" value={`${stats.correctPredictions} (${stats.accuracy}%)`} />
        <StatCard icon={Flame} label="Лучший стрик" value={stats.maxStreak} color={stats.maxStreak >= 5 ? "text-accent" : undefined} />
        <StatCard icon={Flame} label="Текущий стрик" value={stats.currentStreak} color={stats.currentStreak >= 3 ? "text-success" : undefined} />
      </div>

      {/* Points breakdown */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-accent" />
          Разбивка баллов
        </h2>
        <div className="space-y-2 text-sm">
          <PointsRow label="Матчи (угаданные победители)" points={stats.gamePoints} />
          <PointsRow label="Бонусы за серии" points={stats.seriesBonusPoints} />
          <PointsRow label="Бонусы (стрик, снайпер, апсет)" points={stats.generalBonusPoints} />
          <PointsRow label="Победитель турнира" points={stats.winnerPoints} />
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Итого</span>
            <span className="text-accent">{totalPoints}</span>
          </div>
        </div>
      </div>

      {/* Bonuses earned */}
      {((seriesBonuses && seriesBonuses.length > 0) ||
        (bonuses && bonuses.length > 0)) && (
        <div className="bg-card border border-accent/20 rounded-xl p-4 mb-4">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-accent" />
            Полученные бонусы
          </h2>
          <div className="space-y-2">
            {seriesBonuses?.map((b, i) => {
              const s = series.find((x) => x.id === b.series_id);
              const homeTeam = s ? teamsMap.get(s.team_home_id) : null;
              const awayTeam = s ? teamsMap.get(s.team_away_id) : null;
              const label =
                b.bonus_type === "series_exact"
                  ? "Точный счёт серии"
                  : "Победитель серии";
              return (
                <BonusRow
                  key={`sb-${i}`}
                  icon={b.bonus_type === "series_exact" ? Crosshair : Trophy}
                  label={label}
                  detail={
                    homeTeam && awayTeam
                      ? `${homeTeam.abbreviation} vs ${awayTeam.abbreviation}`
                      : undefined
                  }
                  points={b.points}
                />
              );
            })}
            {bonuses?.map((b, i) => {
              const icon =
                b.bonus_type === "streak"
                  ? Flame
                  : b.bonus_type === "sniper"
                  ? Crosshair
                  : TrendingUp;
              return (
                <BonusRow
                  key={`b-${i}`}
                  icon={icon}
                  label={b.description}
                  points={b.points}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Winner prediction */}
      {winnerPrediction && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
          <Crown size={18} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted">Победитель</p>
            <div className="flex items-center gap-2 mt-0.5">
              <img
                src={getTeamLogoUrl(winnerPrediction.team_id)}
                alt=""
                className="w-5 h-5"
              />
              <span className="text-sm font-semibold truncate">
                {teamsMap.get(winnerPrediction.team_id)?.full_name}
              </span>
            </div>
          </div>
          {winnerPrediction.points_earned > 0 && (
            <span className="text-success font-bold">+{winnerPrediction.points_earned}</span>
          )}
        </div>
      )}

      {/* Series predictions */}
      {seriesPredictions && seriesPredictions.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold mb-3">Прогнозы на серии</h2>
          <div className="space-y-2">
            {seriesPredictions.map((sp) => {
              const s = series.find((x) => x.id === sp.series_id);
              if (!s) return null;
              const homeTeam = teamsMap.get(s.team_home_id);
              const awayTeam = teamsMap.get(s.team_away_id);
              const winnerTeam = teamsMap.get(sp.predicted_winner_id);
              const bonus = seriesBonuses?.find(
                (b) => b.series_id === sp.series_id
              );

              return (
                <div
                  key={sp.series_id}
                  className="bg-card border border-border rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {homeTeam && (
                      <img src={getTeamLogoUrl(homeTeam.id)} alt="" className="w-6 h-6" />
                    )}
                    <span className="text-xs text-muted">vs</span>
                    {awayTeam && (
                      <img src={getTeamLogoUrl(awayTeam.id)} alt="" className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-sm font-semibold">
                    {winnerTeam?.abbreviation} {sp.predicted_home_wins} - {sp.predicted_away_wins}
                  </div>
                  {bonus && (
                    <span className="text-success font-bold text-sm">+{bonus.points}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game predictions */}
      <h2 className="text-sm font-semibold mb-3">Прогнозы на матчи</h2>
      {predictions.length === 0 ? (
        <p className="text-muted text-sm py-4">Нет видимых прогнозов</p>
      ) : (
        <div className="space-y-2">
          {predictions.map((pred) => {
            const game = games.find((g) => g.id === pred.game_id);
            if (!game) return null;

            const isFinished = game.status === "finished";
            const correctWinner = isFinished && pred.points_earned > 0;

            return (
              <div key={pred.id} className="bg-card border border-border rounded-xl p-3">
                <div className="text-xs text-muted mb-2">
                  {formatGameDate(game.game_date)}
                  {game.round && (
                    <span className="ml-2">{getRoundLabel(game.round)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={getTeamLogoUrl(game.home_team_id)} alt="" className="w-7 h-7" />
                    <span className="text-sm font-bold">
                      {game.home_team?.abbreviation}
                    </span>
                  </div>

                  <div className="text-center">
                    {isFinished && (
                      <div className="text-xs text-muted mb-0.5">
                        {game.home_score} : {game.away_score}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold">
                        {pred.predicted_home_score > pred.predicted_away_score
                          ? game.home_team?.abbreviation
                          : game.away_team?.abbreviation}
                      </span>
                      {isFinished &&
                        (correctWinner ? (
                          <Check size={14} className="text-success" />
                        ) : (
                          <X size={14} className="text-danger" />
                        ))}
                    </div>
                    {isFinished && pred.points_earned > 0 && (
                      <span className="text-xs text-success font-bold">
                        +{pred.points_earned}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {game.away_team?.abbreviation}
                    </span>
                    <img src={getTeamLogoUrl(game.away_team_id)} alt="" className="w-7 h-7" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <Icon size={16} className="text-muted mx-auto mb-1" />
      <p className={`text-base sm:text-lg font-bold ${color || "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function PointsRow({ label, points }: { label: string; points: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={points > 0 ? "text-success font-semibold" : "text-muted"}>
        {points > 0 ? `+${points}` : "0"}
      </span>
    </div>
  );
}

function BonusRow({
  icon: Icon,
  label,
  detail,
  points,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  detail?: string;
  points: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-foreground">{label}</span>
        {detail && <span className="text-muted ml-1 text-xs">({detail})</span>}
      </div>
      <span className="text-success font-bold shrink-0">+{points}</span>
    </div>
  );
}
