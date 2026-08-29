-- VocabLab teacher-owned data (never pupil names / live match state).
-- Apply: docker exec -i ai-postgres psql -U vocablab -d vocablab < deploy/schema.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teachers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  display_name  text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS teachers_email_lower_idx
  ON teachers (lower(email));

CREATE TABLE IF NOT EXISTS teacher_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  token_hash  text NOT NULL UNIQUE,
  invited_by  uuid REFERENCES teachers (id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid REFERENCES teachers (id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  storage_key text NOT NULL,
  mime_type   text NOT NULL DEFAULT 'image/jpeg',
  byte_size   integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS words (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  year        text NOT NULL,
  term        text NOT NULL,
  topic       text NOT NULL,
  difficulty  text NOT NULL,
  french      text NOT NULL,
  english     text NOT NULL,
  image_id    uuid REFERENCES images (id) ON DELETE SET NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS words_teacher_year_idx ON words (teacher_id, year, term, topic);

CREATE TABLE IF NOT EXISTS lessons (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id         uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  title              text NOT NULL,
  game_mode          text NOT NULL DEFAULT 'basic',
  filters            jsonb NOT NULL DEFAULT '{}'::jsonb,
  excluded_word_ids  text[] NOT NULL DEFAULT '{}',
  ask_direction      text NOT NULL DEFAULT 'random',
  score_to_win       integer,
  seconds_per_team   integer,
  extra              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lessons_teacher_idx ON lessons (teacher_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS game_settings (
  teacher_id    uuid PRIMARY KEY REFERENCES teachers (id) ON DELETE CASCADE,
  board_modes   jsonb NOT NULL DEFAULT '{}'::jsonb,
  mode_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  fuse          jsonb NOT NULL DEFAULT '{}'::jsonb,
  wheel         jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMIT;
