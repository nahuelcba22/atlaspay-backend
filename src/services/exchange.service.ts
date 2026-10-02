import { sequelize } from '../db';
import { Cuenta } from '../models/Cuenta';
import { Transferencia } from '../models/Transferencia';

export class ExchangeService {
  private static ratesCache: Record<'USD' | 'ARS' | 'EUR' | 'PEN', number> | null = null;
  private static lastUpdate: number = 0;
  private static readonly CACHE_TTL = 30 * 60 * 1000;

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
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      
      if (!response.ok) {
        throw new Error('Error al conectar con la API de cotizaciones');
      }
      
      const data = await response.json();

      const cotizacionesFiltradas = {
        USD: 1,
        ARS: data.rates.ARS,
        EUR: data.rates.EUR,
        PEN: data.rates.PEN,
      };

      this.ratesCache = cotizacionesFiltradas;
      this.lastUpdate = now;

      return {
        source: 'api',
        last_updated: new Date(this.lastUpdate).toISOString(),
        rates: this.ratesCache,
      };
    } catch (error) {
      if (this.ratesCache) {
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
    monedaOrigen: 'ARS' | 'USD' | 'EUR' | 'PEN', 
    monedaDestino: 'ARS' | 'USD' | 'EUR' | 'PEN'
  ) {
    try {
      const ratesData = await this.getRates();
      const rates = ratesData.rates;

      if (!rates[monedaOrigen] || !rates[monedaDestino]) {
        throw new Error('Moneda de origen o destino no soportada');
      }

      const tipoDeCambio = rates[monedaDestino] / rates[monedaOrigen];

      const resultado = await sequelize.transaction(async (t) => {
        
        const cuenta = await Cuenta.findOne({ 
          where: { usuario_id }, 
          transaction: t,
          lock: t.LOCK.UPDATE 
        });

        if (!cuenta) throw new Error('Cuenta no encontrada');

        const columnaOrigen = `saldo_${monedaOrigen.toLowerCase()}` as keyof Cuenta;
        const columnaDestino = `saldo_${monedaDestino.toLowerCase()}` as keyof Cuenta;

        const saldoOrigenActual = Math.round(parseFloat(cuenta[columnaOrigen] as string) * 100);
        const saldoDestinoActual = Math.round(parseFloat(cuenta[columnaDestino] as string) * 100);
        
        const ventaCentavos = Math.round(montoVenta * 100);
        const compraCentavos = Math.round((montoVenta * tipoDeCambio) * 100);

        if (saldoOrigenActual < ventaCentavos) {
          throw new Error(`Fondos insuficientes en ${monedaOrigen}`);
        }

        (cuenta as any)[columnaOrigen] = (saldoOrigenActual - ventaCentavos) / 100;
        (cuenta as any)[columnaDestino] = (saldoDestinoActual + compraCentavos) / 100;

        await cuenta.save({ transaction: t });

        const historial = await Transferencia.create({
          cuenta_origen_id: cuenta.id,
          cuenta_destino_id: cuenta.id,
          monto: montoVenta,
          moneda: monedaOrigen,
          motivo: `Exchange de \({monedaOrigen} a\){monedaDestino} (Tasa: ${tipoDeCambio.toFixed(4)})`,
        }, { transaction: t });

        return { cuenta, historial };
      });

      return resultado;

    } catch (error) {
      throw error;
    }
  }
}