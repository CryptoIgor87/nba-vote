"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Crown, Star, Check, X } from "lucide-react";
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
  winnerPrediction: { team_id: number; points_earned: number } | null;
  mvpPrediction: {
    player_name: string;
    team_id: number;
    points_earned: number;
  } | null;
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

  const { user, predictions, seriesPredictions, seriesBonuses, winnerPrediction, mvpPrediction, games, series, teams } = data;
  const teamsMap = new Map(teams.map((t) => [t.id, t]));
  const userName = user.display_name || user.name || "Игрок";
  const avatar = user.avatar_url || user.image;

  const totalPoints =
    predictions.reduce((s, p) => s + (p.points_earned || 0), 0) +
    (seriesBonuses?.reduce((s, b) => s + b.points, 0) || 0) +
    (winnerPrediction?.points_earned || 0) +
    (mvpPrediction?.points_earned || 0);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/leaderboard"
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} /> Рейтинг
      </Link>

      {/* User header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6 flex items-center gap-4">
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
          <p className="text-sm text-muted">
            {predictions.length} прогнозов
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-accent">{totalPoints}</p>
          <p className="text-xs text-muted">баллов</p>
        </div>
      </div>

      {/* Winner + MVP */}
      {(winnerPrediction || mvpPrediction) && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {winnerPrediction && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
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
          {mvpPrediction && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Star size={18} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted">MVP Финала</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <img
                    src={getTeamLogoUrl(mvpPrediction.team_id)}
                    alt=""
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-semibold truncate">
                    {mvpPrediction.player_name}
                  </span>
                </div>
              </div>
              {mvpPrediction.points_earned > 0 && (
                <span className="text-success font-bold">+{mvpPrediction.points_earned}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Series predictions */}
      {seriesPredictions && seriesPredictions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Прогнозы на серии</h2>
          <div className="space-y-2">
            {seriesPredictions.map((sp) => {
              const s = series.find((x) => x.id === sp.series_id);
              if (!s) return null;
              const homeTeam = teamsMap.get(s.team_home_id);
              const awayTeam = teamsMap.get(s.team_away_id);
              const winnerTeam = teamsMap.get(sp.predicted_winner_id);
              const bonus = seriesBonuses?.find((b) => b.series_id === sp.series_id);

              return (
                <div key={sp.series_id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
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
      <h2 className="text-lg font-semibold mb-3">Прогнозы на матчи</h2>
      {predictions.length === 0 ? (
        <p className="text-muted text-sm py-4">Нет видимых прогнозов</p>
      ) : (
        <div className="space-y-2">
          {predictions.map((pred) => {
            const game = games.find((g) => g.id === pred.game_id);
            if (!game) return null;

            const isFinished = game.status === "finished";
            const correctWinner =
              isFinished &&
              pred.points_earned > 0;

            return (
              <div
                key={pred.id}
                className="bg-card border border-border rounded-xl p-3"
              >
                <div className="text-xs text-muted mb-2">
                  {formatGameDate(game.game_date)}
                  {game.round && (
                    <span className="ml-2">{getRoundLabel(game.round)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={getTeamLogoUrl(game.home_team_id)}
                      alt=""
                      className="w-7 h-7"
                    />
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
                        {pred.predicted_home_score} : {pred.predicted_away_score}
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
                    <img
                      src={getTeamLogoUrl(game.away_team_id)}
                      alt=""
                      className="w-7 h-7"
                    />
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
