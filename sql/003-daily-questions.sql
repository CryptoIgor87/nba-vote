-- ============================================================
-- NBA Vote - Daily Questions
-- Run in Supabase SQL Editor
-- ============================================================

-- DAILY QUESTIONS (one per day)
CREATE TABLE nba_daily_questions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id         INT NOT NULL REFERENCES nba_games(id),
    question_date   DATE NOT NULL UNIQUE,
    category        TEXT NOT NULL CHECK (category IN ('points', 'threes', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers')),
    player1_name    TEXT NOT NULL,
    player1_team_id INT NOT NULL REFERENCES nba_teams(id),
    player2_name    TEXT NOT NULL,
    player2_team_id INT NOT NULL REFERENCES nba_teams(id),
    player3_name    TEXT NOT NULL,
    player3_team_id INT NOT NULL REFERENCES nba_teams(id),
    player4_name    TEXT NOT NULL,
    player4_team_id INT NOT NULL REFERENCES nba_teams(id),
    correct_answer  TEXT,          -- NULL until resolved, then player name or 'other'
    correct_value   INT,           -- stat value of the winner
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    nba_game_id     TEXT,          -- NBA.com game ID for box score lookup
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- DAILY PICKS (user answers)
CREATE TABLE nba_daily_picks (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES nba_users(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES nba_daily_questions(id) ON DELETE CASCADE,
    picked_option   TEXT NOT NULL,  -- player name or 'other'
    points_earned   INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- Setting for daily question points
INSERT INTO nba_settings (key, value, description) VALUES
    ('points_daily_question', 1, 'Баллы за правильный ответ на вопрос дня');
