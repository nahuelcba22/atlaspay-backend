-- Rollback for 002_idempotency.sql.
-- Dropping the column discards the stored keys. Deploy the code revert first.

BEGIN;

DROP INDEX IF EXISTS transferencias_origen_idempotency_key_uq;
ALTER TABLE transferencias DROP COLUMN IF EXISTS idempotency_key;

COMMIT;