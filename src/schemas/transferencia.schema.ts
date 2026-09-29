import { z } from 'zod';

export const transferenciaSchema = z.object({
  body: z.object({
    cvu_destino: z.string()
      .min(1, 'El CVU destino es obligatorio')
      .length(22, 'El CVU debe tener exactamente 22 caracteres'),
    
    monto: z.number()
      .positive('El monto debe ser mayor a cero'),
    
    moneda: z.enum(['ARS', 'USD', 'EUR', 'PEN']),
    
    motivo: z.string().optional(),
  }),
});