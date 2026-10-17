// Separate from queue columns so legacy queue inserts and encrypted payloads stay compatible.
export const MAIL_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS mail_messages (
  outbox_table TEXT NOT NULL, queue_id TEXT NOT NULL,
  recipient_hash TEXT NOT NULL, first_attempt_at BIGINT NOT NULL,
  provider TEXT, provider_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending', status_at BIGINT NOT NULL,
  PRIMARY KEY (outbox_table, queue_id), UNIQUE(provider, provider_message_id)
);
CREATE INDEX IF NOT EXISTS mail_messages_recipient ON mail_messages(recipient_hash);
ALTER TABLE mail_messages ADD COLUMN IF NOT EXISTS reviewed_at BIGINT;
CREATE TABLE IF NOT EXISTS mail_provider_events (
  event_id TEXT PRIMARY KEY, provider_message_id TEXT NOT NULL, recipient_hash TEXT NOT NULL,
  event_type TEXT NOT NULL, occurred_at BIGINT NOT NULL, received_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS mail_events_message ON mail_provider_events(provider_message_id, occurred_at);
CREATE TABLE IF NOT EXISTS mail_suppressions (
  recipient_hash TEXT PRIMARY KEY, scope TEXT NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS mail_worker_health (
  worker_id TEXT PRIMARY KEY, started_at BIGINT NOT NULL, completed_at BIGINT, failed_at BIGINT
);
`;
