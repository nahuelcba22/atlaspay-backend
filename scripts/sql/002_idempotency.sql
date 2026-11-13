-- 002_idempotency.sql
-- Adds an optional idempotency key to transfers. Idempotent and transactional.

BEGIN;

ALTER TABLE transferencias
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

-- One key per origin account. Partial: rows without a key are not constrained.
CREATE UNIQUE INDEX IF NOT EXISTS transferencias_origen_idempotency_key_uq
  ON transferencias (cuenta_origen_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMIT;