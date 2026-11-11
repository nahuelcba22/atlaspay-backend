-- 001_constraints.sql
-- 1) Backfill `tipo` for exchanges created before the column existed.
-- 2) Add CHECK constraints as a last line of defense behind the app logic.
-- Idempotent: safe to run more than once. Runs in a single transaction, so a
-- failing constraint leaves the database unchanged.

BEGIN;

-- Backfill: old exchanges were stored as 'TRANSFERENCIA' with the same account
-- on both sides. Stats and history filter by `tipo`, not by the `motivo` text.
UPDATE transferencias
SET tipo = 'CAMBIO'
WHERE tipo = 'TRANSFERENCIA'
  AND cuenta_origen_id = cuenta_destino_id
  AND motivo LIKE 'Exchange de%';

-- Balances can never be negative.
ALTER TABLE cuentas
  DROP CONSTRAINT IF EXISTS cuentas_saldos_no_negativos;
ALTER TABLE cuentas
  ADD CONSTRAINT cuentas_saldos_no_negativos
  CHECK (saldo_ars >= 0 AND saldo_usd >= 0 AND saldo_eur >= 0 AND saldo_pen >= 0);

-- Every recorded movement moves a positive amount.
ALTER TABLE transferencias
  DROP CONSTRAINT IF EXISTS transferencias_monto_positivo;
ALTER TABLE transferencias
  ADD CONSTRAINT transferencias_monto_positivo
  CHECK (monto > 0);

COMMIT;