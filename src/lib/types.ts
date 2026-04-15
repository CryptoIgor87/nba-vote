export interface NbaUser {
  id: string;
  email: string;
  name: string | null;
  display_name: string | null;
  image: string | null;
  avatar_url: string | null;
  role: "USER" | "ADMIN";
  created_at: string;
}

export interface NbaTeam {
  id: number;
  name: string;
  full_name: string;
  abbreviation: string;
  conference: string;
  division: string;
  city: string;
}

export type SeriesRound =
  | "play_in"
  | "first_round"
  | "conference_semis"
  | "conference_finals"
  | "finals";

export interface NbaSeries {
  id: string;
  season: number;
  round: SeriesRound;
  conference: "East" | "West" | null;
  team_home_id: number | null;
  team_away_id: number | null;
  home_wins: number;
  away_wins: number;
  winner_id: number | null;
  series_number: number | null;
  status: "upcoming" | "active" | "finished";
  // joined
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

export interface NbaGame {
  id: number;
  series_id: string | null;
  season: number;
  status: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  game_date: string;
  is_playoff: boolean;
  round: string | null;
  game_number: number | null;
  // joined
  home_team?: NbaTeam;
  away_team?: NbaTeam;
}

export interface NbaPrediction {
  id: string;
  user_id: string;
  game_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
  // joined
  game?: NbaGame;
}

export interface NbaSeriesBonus {
  id: string;
  user_id: string;
  series_id: string;
  bonus_type: "series_winner" | "series_exact";
  points: number;
}

export interface NbaWinnerPrediction {
  id: string;
  user_id: string;
  team_id: number;
  points_earned: number;
  created_at: string;
  // joined
  team?: NbaTeam;
}

export interface NbaSetting {
  id: string;
  key: string;
  value: number;
  description: string | null;
}

export interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  correct_winners: number;
  correct_series: number;
  total_predictions: number;
  // joined
  user?: NbaUser;
}

export type DailyQuestionCategory =
  | "points"
  | "threes"
  | "assists"
  | "rebounds"
  | "turnovers"
  | "fouls"
  | "steals"
  | "blocks";

export interface NbaDailyQuestion {
  id: string;
  game_id: number;
  question_date: string;
  category: DailyQuestionCategory;
  player1_name: string;
  player1_team_id: number;
  player2_name: string;
  player2_team_id: number;
  player3_name: string;
  player3_team_id: number;
  player4_name: string;
  player4_team_id: number;
  player1_nba_id: number | null;
  player2_nba_id: number | null;
  player3_nba_id: number | null;
  player4_nba_id: number | null;
  correct_answer: string | null;
  correct_value: number | null;
  status: "active" | "resolved";
  nba_game_id: string | null;
  created_at: string;
  // joined
  game?: NbaGame;
}

export interface NbaDailyPick {
  id: string;
  user_id: string;
  question_id: string;
  picked_option: string;
  points_earned: number;
  created_at: string;
}

export interface PointsBreakdown {
  game_winner: number;
  series_winner: number;
  series_exact: number;
  tournament_winner: number;
  daily_question: number;
  total: number;
}
