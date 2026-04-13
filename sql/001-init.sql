-- ============================================================
-- NBA Vote - Database Schema
-- Run in Supabase SQL Editor (project: vttlbeewxbwkikmxdlev)
-- ============================================================

-- USERS (NextAuth compatible)
CREATE TABLE nba_users (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    display_name TEXT,
    image       TEXT,
    avatar_url  TEXT,
    role        TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    email_verified TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ACCOUNTS (NextAuth adapter)
CREATE TABLE nba_accounts (
    id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id             TEXT NOT NULL REFERENCES nba_users(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    provider            TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          INT,
    token_type          TEXT,
    scope               TEXT,
    id_token            TEXT,
    session_state       TEXT,
    UNIQUE(provider, provider_account_id)
);

-- SESSIONS (NextAuth adapter)
CREATE TABLE nba_sessions (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    session_token TEXT UNIQUE NOT NULL,
    user_id       TEXT NOT NULL REFERENCES nba_users(id) ON DELETE CASCADE,
    expires       TIMESTAMPTZ NOT NULL
);

-- VERIFICATION TOKENS
CREATE TABLE nba_verification_tokens (
    identifier TEXT NOT NULL,
    token      TEXT UNIQUE NOT NULL,
    expires    TIMESTAMPTZ NOT NULL,
    UNIQUE(identifier, token)
);

-- NBA TEAMS
CREATE TABLE nba_teams (
    id              INT PRIMARY KEY,
    name            TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    abbreviation    TEXT NOT NULL,
    conference      TEXT NOT NULL,
    division        TEXT NOT NULL,
    city            TEXT NOT NULL
);

-- PLAYOFF SERIES
CREATE TABLE nba_series (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season          INT NOT NULL DEFAULT 2024,
    round           TEXT NOT NULL CHECK (round IN ('play_in', 'first_round', 'conference_semis', 'conference_finals', 'finals')),
    conference      TEXT CHECK (conference IN ('East', 'West')),
    team_home_id    INT REFERENCES nba_teams(id),
    team_away_id    INT REFERENCES nba_teams(id),
    home_wins       INT DEFAULT 0,
    away_wins       INT DEFAULT 0,
    winner_id       INT REFERENCES nba_teams(id),
    series_number   INT,
    status          TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- GAMES
CREATE TABLE nba_games (
    id              INT PRIMARY KEY,
    series_id       UUID REFERENCES nba_series(id),
    season          INT NOT NULL DEFAULT 2024,
    status          TEXT NOT NULL DEFAULT 'upcoming',
    home_team_id    INT NOT NULL REFERENCES nba_teams(id),
    away_team_id    INT NOT NULL REFERENCES nba_teams(id),
    home_score      INT,
    away_score      INT,
    game_date       TIMESTAMPTZ NOT NULL,
    is_playoff      BOOLEAN DEFAULT true,
    round           TEXT,
    game_number     INT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nba_games_date ON nba_games(game_date);
CREATE INDEX idx_nba_games_series ON nba_games(series_id);

-- PREDICTIONS
CREATE TABLE nba_predictions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES nba_users(id) ON DELETE CASCADE,
    game_id         INT NOT NULL REFERENCES nba_games(id) ON DELETE CASCADE,
    predicted_home_score INT NOT NULL,
    predicted_away_score INT NOT NULL,
    points_earned   INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_id)
);

-- SERIES BONUSES
CREATE TABLE nba_series_bonuses (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES nba_users(id) ON DELETE CASCADE,
    series_id   UUID NOT NULL REFERENCES nba_series(id) ON DELETE CASCADE,
    bonus_type  TEXT NOT NULL CHECK (bonus_type IN ('series_winner', 'series_exact')),
    points      INT NOT NULL,
    UNIQUE(user_id, series_id, bonus_type)
);

-- TOURNAMENT WINNER PREDICTIONS
CREATE TABLE nba_winner_predictions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         TEXT UNIQUE NOT NULL REFERENCES nba_users(id) ON DELETE CASCADE,
    team_id         INT NOT NULL REFERENCES nba_teams(id),
    points_earned   INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SCORING SETTINGS
CREATE TABLE nba_settings (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key             TEXT UNIQUE NOT NULL,
    value           INT NOT NULL,
    description     TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO nba_settings (key, value, description) VALUES
    ('points_correct_winner', 1, 'Баллы за правильного победителя матча'),
    ('points_correct_series_winner', 2, 'Баллы за правильного победителя серии'),
    ('points_correct_series_score', 4, 'Баллы за победителя серии + точный счёт серии'),
    ('points_tournament_winner', 10, 'Баллы за правильного победителя турнира'),
    ('betting_close_minutes', 30, 'За сколько минут до матча закрывается приём прогнозов');

-- LEADERBOARD CACHE
CREATE TABLE nba_leaderboard (
    user_id         TEXT PRIMARY KEY REFERENCES nba_users(id) ON DELETE CASCADE,
    total_points    INT DEFAULT 0,
    correct_winners INT DEFAULT 0,
    correct_series  INT DEFAULT 0,
    total_predictions INT DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers
CREATE OR REPLACE FUNCTION update_nba_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nba_users_updated_at
    BEFORE UPDATE ON nba_users FOR EACH ROW EXECUTE FUNCTION update_nba_updated_at();
CREATE TRIGGER update_nba_predictions_updated_at
    BEFORE UPDATE ON nba_predictions FOR EACH ROW EXECUTE FUNCTION update_nba_updated_at();
CREATE TRIGGER update_nba_games_updated_at
    BEFORE UPDATE ON nba_games FOR EACH ROW EXECUTE FUNCTION update_nba_updated_at();

-- Storage bucket for avatars (run separately in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('nba-avatars', 'nba-avatars', true);
