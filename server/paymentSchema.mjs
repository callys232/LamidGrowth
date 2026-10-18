/** Additive schema applied under the store's migration lock for existing and fresh databases. */
export const PAYMENT_REVIEW_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS payment_reviews (
  kind TEXT NOT NULL, payment_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  assigned_to TEXT, status TEXT NOT NULL DEFAULT 'open', note TEXT NOT NULL DEFAULT '',
  provider_status TEXT, version INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
  PRIMARY KEY(kind,payment_id)
);
CREATE INDEX IF NOT EXISTS payment_reviews_workspace ON payment_reviews(workspace_id,status);
`;
