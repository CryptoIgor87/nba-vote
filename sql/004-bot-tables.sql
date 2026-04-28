-- Bot v2: persistent memory tables

-- Persistent message history (replaces RAM buffer)
CREATE TABLE IF NOT EXISTS bot_messages (
    id            BIGSERIAL PRIMARY KEY,
    chat_id       TEXT NOT NULL,
    tg_username   TEXT,
    role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content       TEXT NOT NULL,
    tg_message_id BIGINT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_messages_chat_created ON bot_messages(chat_id, created_at DESC);

-- Periodic chat summaries
CREATE TABLE IF NOT EXISTS bot_summaries (
    id            BIGSERIAL PRIMARY KEY,
    chat_id       TEXT NOT NULL,
    summary       TEXT NOT NULL,
    msg_from_id   BIGINT NOT NULL,
    msg_to_id     BIGINT NOT NULL,
    msg_count     INT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_summaries_chat ON bot_summaries(chat_id, created_at DESC);

-- Per-user personality profiles
CREATE TABLE IF NOT EXISTS bot_user_notes (
    id            BIGSERIAL PRIMARY KEY,
    tg_username   TEXT UNIQUE NOT NULL,
    display_name  TEXT,
    notes         JSONB NOT NULL DEFAULT '{}',
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
