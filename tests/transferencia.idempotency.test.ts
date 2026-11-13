import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db', () => ({
  sequelize: {
    transaction: vi.fn(async (callback: (t: unknown) => unknown) =>
      callback({ LOCK: { UPDATE: 'UPDATE' } }),
    ),
  },
}));
vi.mock('../src/models/Cuenta', () => ({
  Cuenta: { findOne: vi.fn(), findAll: vi.fn(), update: vi.fn() },
}));
vi.mock('../src/models/Transferencia', () => ({
  Transferencia: { create: vi.fn(), findOne: vi.fn() },
}));

import { Cuenta } from '../src/models/Cuenta';
import { Transferencia } from '../src/models/Transferencia';
import { idempotencyKeySchema } from '../src/schemas/idempotency.schema';
import { procesarTransferencia } from '../src/services/transferencia.service';

const CVU = '0000000000000000000001';
const KEY = 'a1b2c3d4-e5f6-7890';

function fakeCuenta(id: string, overrides: Record<string, string> = {}) {
  const data: Record<string, string> = {
    estado: 'activa',
    saldo_ars: '0.00',
    ...overrides,
  };
  return { id, estado: data.estado, get: (key: string) => data[key] };
}
type FakeCuenta = ReturnType<typeof fakeCuenta>;

function setup(origen: FakeCuenta, destino: FakeCuenta) {
  vi.mocked(Cuenta.findOne).mockImplementation((async (options: {
    where: Record<string, unknown>;
  }) => {
    const account = 'usuario_id' in options.where ? origen : destino;
    return { id: account.id };
  }) as never);
  vi.mocked(Cuenta.findAll).mockResolvedValue([origen, destino] as never);
}

// A previously stored transfer, as Sequelize returns it (DECIMAL as string).
function storedTransfer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-original',
    cuenta_origen_id: 'a',
    cuenta_destino_id: 'b',
    monto: '300.00',
    moneda: 'ARS',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Transferencia.create).mockResolvedValue({ id: 'tx-new' } as never);
  vi.mocked(Transferencia.findOne).mockResolvedValue(null as never);
});

describe('procesarTransferencia - idempotency', () => {
  it('stores the key on the first request', async () => {
    setup(fakeCuenta('a', { saldo_ars: '1000.00' }), fakeCuenta('b'));

    const result = await procesarTransferencia('u', CVU, 300, 'x', 'ARS', KEY);

    expect(result.replayed).toBe(false);
    expect(Transferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: KEY }),
      expect.anything(),
    );
  });

  it('does not look the key up when none is sent', async () => {
    setup(fakeCuenta('a', { saldo_ars: '1000.00' }), fakeCuenta('b'));

    await procesarTransferencia('u', CVU, 300, 'x', 'ARS');

    expect(Transferencia.findOne).not.toHaveBeenCalled();
    expect(Transferencia.create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotency_key: null }),
      expect.anything(),
    );
  });

  it('looks the key up only after both accounts are locked', async () => {
    setup(fakeCuenta('a', { saldo_ars: '1000.00' }), fakeCuenta('b'));

    await procesarTransferencia('u', CVU, 300, 'x', 'ARS', KEY);

    expect(Transferencia.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cuenta_origen_id: 'a', idempotency_key: KEY },
      }),
    );
    expect(
      vi.mocked(Cuenta.findAll).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(Transferencia.findOne).mock.invocationCallOrder[0]);
  });

  it('returns the original transfer on a retry without moving money', async () => {
    setup(fakeCuenta('a', { saldo_ars: '1000.00' }), fakeCuenta('b'));
    vi.mocked(Transferencia.findOne).mockResolvedValue(storedTransfer() as never);

    const result = await procesarTransferencia('u', CVU, 300, 'x', 'ars', KEY);

    expect(result.replayed).toBe(true);
    expect(result.transferencia).toMatchObject({ id: 'tx-original' });
    expect(Cuenta.update).not.toHaveBeenCalled();
    expect(Transferencia.create).not.toHaveBeenCalled();
  });

  it('replays even if the origin account was blocked afterwards', async () => {
    setup(
      fakeCuenta('a', { saldo_ars: '1000.00', estado: 'bloqueada' }),
      fakeCuenta('b'),
    );
    vi.mocked(Transferencia.findOne).mockResolvedValue(storedTransfer() as never);

    const result = await procesarTransferencia('u', CVU, 300, 'x', 'ARS', KEY);

    expect(result.replayed).toBe(true);
  });

  it.each([
    ['another amount', { monto: '500.00' }],
    ['another currency', { moneda: 'USD' }],
    ['another destination', { cuenta_destino_id: 'c' }],
  ])('rejects the same key reused with %s (409)', async (_label, override) => {
    setup(fakeCuenta('a', { saldo_ars: '1000.00' }), fakeCuenta('b'));
    vi.mocked(Transferencia.findOne).mockResolvedValue(
      storedTransfer(override) as never,
    );

    await expect(
      procesarTransferencia('u', CVU, 300, 'x', 'ARS', KEY),
    ).rejects.toMatchObject({ status: 409 });

    expect(Cuenta.update).not.toHaveBeenCalled();
    expect(Transferencia.create).not.toHaveBeenCalled();
  });
});

describe('idempotencyKeySchema', () => {
  it.each(['a1b2c3d4-e5f6-7890', '550e8400-e29b-41d4-a716-446655440000', 'abc_DEF-12'])(
    'accepts %s',
    (key) => {
      expect(idempotencyKeySchema.safeParse(key).success).toBe(true);
    },
  );

  it.each(['', 'short', 'has space in it', 'a'.repeat(65), "bad'key12345", 'ñandú-12345'])(
    'rejects %j',
    (key) => {
      expect(idempotencyKeySchema.safeParse(key).success).toBe(false);
    },
  );
});