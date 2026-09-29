import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export const procesarMensajeBot = async (mensajeUsuario: string): Promise<string> => {
  if (!apiKey) throw new Error('API Key de Gemini no configurada');

  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const promptSistema = `
    Sos el asistente virtual de Atlaspay, una billetera digital para freelancers en LATAM.
    Respondé de forma concisa y profesional la siguiente consulta: "${mensajeUsuario}"
  `;

  const result = await model.generateContent(promptSistema);
  return result.response.text();
};