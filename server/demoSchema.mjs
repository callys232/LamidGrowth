// Additive and idempotent: applied on fresh databases and on every existing installation.
export const DEMO_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS demo_ip_claims (
  ip_hash TEXT PRIMARY KEY, email_hash TEXT NOT NULL, registration_id TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS demo_registrations (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS verified_at BIGINT;
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS last_seen_at BIGINT;
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS profile TEXT NOT NULL DEFAULT 'Founder';
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'individual';
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS followup_opt_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS followup_scheduled_at BIGINT;
ALTER TABLE demo_registrations ADD COLUMN IF NOT EXISTS converted_at BIGINT;
CREATE TABLE IF NOT EXISTS demo_access_tokens (
  token_hash TEXT PRIMARY KEY, registration_id TEXT NOT NULL REFERENCES demo_registrations(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL, payload TEXT NOT NULL, expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS demo_sessions (
  token_hash TEXT PRIMARY KEY, registration_id TEXT NOT NULL REFERENCES demo_registrations(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS demo_progress (
  registration_id TEXT NOT NULL REFERENCES demo_registrations(id) ON DELETE CASCADE,
  profile TEXT NOT NULL, tier TEXT NOT NULL, payload TEXT NOT NULL,
  revision INTEGER NOT NULL, updated_at BIGINT NOT NULL,
  PRIMARY KEY (registration_id, profile, tier)
);
CREATE TABLE IF NOT EXISTS demo_events (
  id TEXT PRIMARY KEY, registration_id TEXT NOT NULL REFERENCES demo_registrations(id) ON DELETE CASCADE,
  event TEXT NOT NULL, path TEXT NOT NULL, profile TEXT NOT NULL, tier TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_events_lead ON demo_events(registration_id, created_at);
CREATE TABLE IF NOT EXISTS demo_mail_outbox (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES demo_registrations(id) ON DELETE CASCADE,
  payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  next_at BIGINT NOT NULL, lease_until BIGINT, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS demo_mail_pending ON demo_mail_outbox(status, next_at);
`;
