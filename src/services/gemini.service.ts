import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// El primero es el principal, el segundo es el suplente en caso de saturación
const MODELOS_FALLBACK = ['gemini-3.5-flash', 'gemini-3.5-pro'];

export const procesarMensajeBot = async (mensajeUsuario: string): Promise<string> => {
  if (!apiKey) throw new Error('API Key de Gemini no configurada');

  const promptSistema = `
    Sos el asistente virtual de Atlaspay, una billetera digital para conversiones monetarias entre USD, ARS, PEN, EUR en LATAM.
    Respondé de forma concisa y profesional la siguiente consulta: "${mensajeUsuario}"
  `;

  for (const nombreModelo of MODELOS_FALLBACK) {
    try {
      const model = genAI.getGenerativeModel({ model: nombreModelo });
      const result = await model.generateContent(promptSistema);
      return result.response.text();
      
    } catch (error: any) {
      // Detección de caída por cuota o saturación de la API
      const isOverloaded = 
        error.status === 429 || 
        error.status === 503 || 
        error.message?.includes('429') || 
        error.message?.includes('Too Many Requests');

      if (isOverloaded) {
        console.warn(`[Chatbot] Modelo ${nombreModelo} saturado. Cambiando al suplente...`);
        continue;
      }

      // Si el error es de otro tipo (ej. API Key inválida o modelo inexistente), corta acá
      console.error(`[Chatbot] Error crítico con ${nombreModelo}:`, error);
      throw error;
    }
  }

  // Mensaje de rescate si todos los modelos fallan
  return "En este momento estoy procesando demasiadas consultas. Por favor, intentá de nuevo en unos minutos.";
};