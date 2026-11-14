import { randomInt, randomUUID } from 'node:crypto';
import { Op } from 'sequelize';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../src/config/env';
import { sequelize } from '../../src/db';
import { Cuenta } from '../../src/models/Cuenta';
import { Transferencia } from '../../src/models/Transferencia';
import { Usuario } from '../../src/models/Usuario';
import { procesarTransferencia } from '../../src/services/transferencia.service';
import { AppError } from '../../src/utils/appError';
import { centsFromDecimal } from '../../src/utils/money';

type TestAccount = { userId: string; accountId: string; cvu: string };

const createdUserIds: string[] = [];
const createdAccountIds: string[] = [];

// Second safety net: the app must be connected to the isolated test host.
beforeAll(() => {
  const host = new URL(env.DATABASE_URL).host.replace('-pooler', '');
  if (host !== process.env.INTEGRATION_DB_HOST) {
    throw new Error('Los tests de integración no apuntan a DATABASE_URL_TEST');
  }
});

afterEach(async () => {
  if (createdAccountIds.length > 0) {
    await Transferencia.destroy({
      where: {
        [Op.or]: [
          { cuenta_origen_id: { [Op.in]: createdAccountIds } },
          { cuenta_destino_id: { [Op.in]: createdAccountIds } },
        ],
      },
    });
    await Cuenta.destroy({ where: { id: { [Op.in]: createdAccountIds } } });
  }
  if (createdUserIds.length > 0) {
    await Usuario.destroy({ where: { id: { [Op.in]: createdUserIds } } });
  }
  createdAccountIds.length = 0;
  createdUserIds.length = 0;
});

afterAll(async () => {
  await sequelize.close();
});

const randomCvu = () =>
  Array.from({ length: 22 }, () => randomInt(0, 10)).join('');

// Creates a user and an account with the given ARS balance (e.g. "100.00").
async function createAccount(saldoArs: string): Promise<TestAccount> {
  const suffix = randomUUID().replace(/-/g, '');

  const usuario = await Usuario.create({
    nombre: 'int-test',
    email: `int_${suffix}@atlaspay.test`,
    password_hash: 'not-a-real-hash',
  });
  createdUserIds.push(usuario.id);

  const cuenta = await Cuenta.create({
    usuario_id: usuario.id,
    cvu: randomCvu(),
    alias: `int.${suffix.slice(0, 16)}`,
    saldo_ars: saldoArs,
  });
  createdAccountIds.push(cuenta.id);

  return { userId: usuario.id, accountId: cuenta.id, cvu: cuenta.cvu };
}

const pay = (
  from: TestAccount,
  to: TestAccount,
  amount: number,
  idempotencyKey?: string,
) =>
  procesarTransferencia(
    from.userId,
    to.cvu,
    amount,
    'int-test',
    'ARS',
    idempotencyKey,
  );

// Current ARS balance in integer cents, read straight from the database.
async function balance(account: TestAccount): Promise<number> {
  const row = await Cuenta.findByPk(account.accountId);
  return centsFromDecimal(row!.get('saldo_ars') as string);
}

// Failures that are not business rules (deadlocks, DB errors).
function unexpectedFailures(results: PromiseSettledResult<unknown>[]) {
  return results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .filter((r) => !(r.reason instanceof AppError))
    .map((r) => String(r.reason?.message ?? r.reason));
}

describe('procesarTransferencia - concurrency (real Postgres)', () => {
  it('does not let two transfers spend the same balance', async () => {
    const a = await createAccount('100.00');
    const b = await createAccount('0.00');

    const results = await Promise.allSettled([pay(a, b, 80), pay(a, b, 80)]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(AppError);
    expect(rejected[0].reason.message).toBe('Saldo insuficiente');
    expect(await balance(a)).toBe(2000);
    expect(await balance(b)).toBe(8000);
  });

  it('opposite transfers (A->B and B->A) never deadlock', async () => {
    const a = await createAccount('1000.00');
    const b = await createAccount('1000.00');

    const failures: string[] = [];
    for (let round = 0; round < 10; round++) {
      const results = await Promise.allSettled([
        pay(a, b, 10),
        pay(b, a, 10),
        pay(a, b, 10),
        pay(b, a, 10),
      ]);
      failures.push(
        ...results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map((r) => String(r.reason?.message ?? r.reason)),
      );
    }

    expect(failures).toEqual([]);
    // Every round moves the same amount in both directions.
    expect(await balance(a)).toBe(100000);
    expect(await balance(b)).toBe(100000);
  });

  it('creates a single transfer for concurrent requests with the same key', async () => {
    const a = await createAccount('1000.00');
    const b = await createAccount('0.00');
    const key = `int-key-${randomUUID().slice(0, 12)}`;

    const results = await Promise.all([
      pay(a, b, 300, key),
      pay(a, b, 300, key),
    ]);

    expect(results.map((r) => r.replayed).sort()).toEqual([false, true]);
    expect(results[0].transferencia.id).toBe(results[1].transferencia.id);
    expect(
      await Transferencia.count({
        where: { cuenta_origen_id: a.accountId, idempotency_key: key },
      }),
    ).toBe(1);
    expect(await balance(a)).toBe(70000);
    expect(await balance(b)).toBe(30000);
  });

  it('conserves the total money under many concurrent transfers', async () => {
    const accounts = await Promise.all(
      Array.from({ length: 4 }, () => createAccount('1000.00')),
    );
    const totalBefore = 4 * 100000;

    const attempts = Array.from({ length: 40 }, (_, i) => {
      const from = i % 4;
      const to = (from + 1 + (i % 3)) % 4; // never equal to `from`
      return pay(accounts[from], accounts[to], (i % 9) + 1);
    });
    const results = await Promise.allSettled(attempts);

    expect(unexpectedFailures(results)).toEqual([]);

    const balances = await Promise.all(accounts.map(balance));
    expect(balances.reduce((sum, cents) => sum + cents, 0)).toBe(totalBefore);

    const fulfilled = results.filter((r) => r.status === 'fulfilled').length;
    expect(
      await Transferencia.count({
        where: { cuenta_origen_id: { [Op.in]: accounts.map((x) => x.accountId) } },
      }),
    ).toBe(fulfilled);
  });
});