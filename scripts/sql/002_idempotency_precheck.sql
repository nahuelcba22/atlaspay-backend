-- Read-only. Run before 002_idempotency.sql.
-- Returns a row if the column already exists (the script is still safe to run).
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'transferencias' AND column_name = 'idempotency_key';