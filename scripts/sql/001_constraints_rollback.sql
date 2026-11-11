-- Rollback for 001_constraints.sql (constraints only).
-- The `tipo` backfill is not reverted: it only fixes mislabeled rows.

BEGIN;

ALTER TABLE cuentas DROP CONSTRAINT IF EXISTS cuentas_saldos_no_negativos;
ALTER TABLE transferencias DROP CONSTRAINT IF EXISTS transferencias_monto_positivo;

COMMIT;