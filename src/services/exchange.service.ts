import { sequelize } from '../db';
import { Cuenta } from '../models/Cuenta';
import { Transferencia } from '../models/Transferencia';
import { Op, fn, col } from 'sequelize';
import { AppError } from '../utils/appError';
import {
  centsFromDecimal,
  convertCents,
  decimalFromCents,
  toPositiveCents,
} from '../utils/money';

type Moneda = 'ARS' | 'USD' | 'EUR' | 'PEN';

const MONEDAS: readonly Moneda[] = ['ARS', 'USD', 'EUR', 'PEN'];

// Movement types that are currency exchanges (as opposed to TRANSFERENCIA).
const EXCHANGE_TIPOS = ['CAMBIO', 'COMPRA', 'VENTA'] as const;

const nombresMoneda: Record<Moneda, string> = {
  ARS: 'pesos argentinos',
  USD: 'dólares estadounidenses',
  EUR: 'euros',
  PEN: 'soles peruanos',
};

export class ExchangeService {
  private static ratesCache: Record<Moneda, number> | null = null;
  private static lastUpdate: number = 0;
  private static readonly CACHE_TTL = 30 * 60 * 1000;
  // Oldest cached rates still accepted when the provider is unavailable.
  private static readonly MAX_STALE = 6 * 60 * 60 * 1000;
  private static readonly FETCH_TIMEOUT_MS = 5000;

  static async getRates() {
    const now = Date.now();

    if (this.ratesCache && now - this.lastUpdate < this.CACHE_TTL) {
      return {
        source: 'cache',
        last_updated: new Date(this.lastUpdate).toISOString(),
        rates: this.ratesCache,
      };
    }

    try {
      // The timeout keeps a hung provider from holding the request open.
      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: AbortSignal.timeout(this.FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con la API de cotizaciones');
      }

      const data = await response.json();

      const cotizacionesFiltradas: Record<Moneda, number> = {
        USD: 1,
        ARS: data?.rates?.ARS,
        EUR: data?.rates?.EUR,
        PEN: data?.rates?.PEN,
      };

      // A missing, zero or non-numeric rate must never reach the cache.
      const valid = Object.values(cotizacionesFiltradas).every(
        (rate) => typeof rate === 'number' && Number.isFinite(rate) && rate > 0,
      );
      if (!valid) {
        throw new Error('Respuesta de cotizaciones inválida');
      }

      this.ratesCache = cotizacionesFiltradas;
      this.lastUpdate = now;

      return {
        source: 'api',
        last_updated: new Date(this.lastUpdate).toISOString(),
        rates: this.ratesCache,
      };
    } catch (error) {
      // Stale rates are acceptable only for a bounded time.
      if (this.ratesCache && now - this.lastUpdate < this.MAX_STALE) {
        console.warn('Fallback: API caída, devolviendo última caché válida.');
        return {
          source: 'fallback_cache',
          last_updated: new Date(this.lastUpdate).toISOString(),
          rates: this.ratesCache,
        };
      }

      throw new Error('Servicio de exchange no disponible temporalmente');
    }
  }

  static async procesarExchange(
    usuario_id: string,
    montoVenta: number,
    monedaOrigen: Moneda,
    monedaDestino: Moneda,
    tipo: 'CAMBIO' | 'COMPRA' | 'VENTA' = 'CAMBIO',
  ) {
    // The column names are built from these values, so only known currencies pass.
    if (!MONEDAS.includes(monedaOrigen) || !MONEDAS.includes(monedaDestino)) {
      throw new AppError('Moneda de origen o destino no soportada');
    }

    if (monedaOrigen === monedaDestino) {
      throw new AppError(
        'Las monedas de origen y destino deben ser diferentes',
      );
    }

    // Rejects non-numbers, NaN, <= 0, more than 2 decimals and overflow
    // before touching rates or the database.
    const ventaCentavos = toPositiveCents(montoVenta);

    const { rates } = await this.getRates();

    if (!rates[monedaOrigen] || !rates[monedaDestino]) {
      throw new AppError('Moneda de origen o destino no soportada');
    }

    const tipoDeCambio = rates[monedaDestino] / rates[monedaOrigen];
    const compraCentavos = convertCents(ventaCentavos, tipoDeCambio);

    if (compraCentavos < 1) {
      throw new AppError('El monto es demasiado bajo para convertir');
    }

    const columnaOrigen = `saldo_${monedaOrigen.toLowerCase()}`;
    const columnaDestino = `saldo_${monedaDestino.toLowerCase()}`;

    return sequelize.transaction(async (t) => {
      const cuenta = await Cuenta.findOne({
        where: { usuario_id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!cuenta) throw new AppError('Cuenta no encontrada', 404);

      if (cuenta.estado !== 'activa') {
        throw new AppError('La cuenta no está activa', 403);
      }

      // pg returns DECIMAL as string; all math below is on integer cents.
      const saldoOrigen = centsFromDecimal(cuenta.get(columnaOrigen) as string);
      const saldoDestino = centsFromDecimal(
        cuenta.get(columnaDestino) as string,
      );

      if (saldoOrigen < ventaCentavos) {
        throw new AppError(`Fondos insuficientes en ${monedaOrigen}`);
      }

      // Single UPDATE for both balances.
      await cuenta.update(
        {
          [columnaOrigen]: decimalFromCents(saldoOrigen - ventaCentavos),
          [columnaDestino]: decimalFromCents(saldoDestino + compraCentavos),
        },
        { transaction: t },
      );

      const historial = await Transferencia.create(
        {
          cuenta_origen_id: cuenta.id,
          cuenta_destino_id: cuenta.id,
          // Structured data for the unified history.
          tipo,
          monto: decimalFromCents(ventaCentavos),
          moneda: monedaOrigen,
          monto_destino: decimalFromCents(compraCentavos),
          moneda_destino: monedaDestino,
          tasa: tipoDeCambio,
          motivo: `Exchange de ${nombresMoneda[monedaOrigen]} (${monedaOrigen}) a ${nombresMoneda[monedaDestino]} (${monedaDestino}) (Tasa: ${tipoDeCambio.toFixed(4)})`,
        },
        { transaction: t },
      );

      return { cuenta, historial };
    });
  }

  static async getStats() {
    try {
      // Exchanges are identified by the `tipo` column, not by the free-text motivo.
      const whereExchange = { tipo: { [Op.in]: [...EXCHANGE_TIPOS] } };

      // 1. Total number of exchanges.
      const totalOperaciones = await Transferencia.count({
        where: whereExchange,
      });

      // 2. Group by source currency: how often each is exchanged and its volume.
      const statsPorMoneda = await Transferencia.findAll({
        attributes: [
          'moneda',
          [fn('COUNT', col('id')), 'cantidad_operaciones'],
          [fn('SUM', col('monto')), 'volumen_total'],
        ],
        where: whereExchange,
        group: ['moneda'],
        order: [[fn('COUNT', col('id')), 'DESC']],
      });

      return {
        totalOperaciones,
        statsPorMoneda,
      };
    } catch (error) {
      console.error('Error en ExchangeService.getStats:', error);
      throw new Error('No se pudieron calcular las estadísticas de exchange');
    }
  }
}