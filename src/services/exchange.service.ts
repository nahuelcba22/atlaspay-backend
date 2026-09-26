export class ExchangeService {
  private static ratesCache: Record | null = null;
  private static lastUpdate: number = 0;
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos

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

      // Filtramos las cotizaciones que nos interesan
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
}