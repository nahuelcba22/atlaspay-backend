-- Read-only checks. Run before 001_constraints.sql.
-- The first two queries must return zero rows; the last one is informational.

-- Accounts with negative balances would make the CHECK constraint fail.
SELECT id, saldo_ars, saldo_usd, saldo_eur, saldo_pen
FROM cuentas
WHERE saldo_ars < 0 OR saldo_usd < 0 OR saldo_eur < 0 OR saldo_pen < 0;

-- Movements with a non-positive amount would make the CHECK constraint fail.
SELECT id, tipo, monto, fecha
FROM transferencias
WHERE monto <= 0;

-- Informational: exchanges stored before the `tipo` column existed.
-- These are the rows the backfill will reclassify.
SELECT COUNT(*) AS exchanges_to_backfill
FROM transferencias
WHERE tipo = 'TRANSFERENCIA'
  AND cuenta_origen_id = cuenta_destino_id
  AND motivo LIKE 'Exchange de%';