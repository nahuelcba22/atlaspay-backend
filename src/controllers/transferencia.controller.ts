import { obtenerHistorial } from '../services/transferenciaHistory.service';
import { procesarTransferencia } from '../services/transferencia.service';
import { sendTransactionEmail } from '../services/transactionEmail.service';
import { AppError } from '../utils/appError';

export const getTransferencias = async (req: any, res: any) => {
  try {
    const transferencias = await obtenerHistorial(req.usuario.id);

    res.status(200).json({
      message: 'Historial obtenido con exito',
      transferencias,
    });
  } catch (error: any) {
    if (error.message === 'Cuenta no encontrada') {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({
      error: 'Hubo un problema al consultar el historial',
    });
  }
};

export const crearTransferencia = async (req: any, res: any) => {
  // "destino" acepta CVU o alias; cvu_destino se mantiene por compatibilidad.
  const { destino, cvu_destino, monto, motivo, moneda = 'ARS' } = req.body;

  try {
    const comprobante = await procesarTransferencia(
      req.usuario.id,
      destino ?? cvu_destino,
      monto,
      motivo,
      moneda,
    );

    // Espera el diagnóstico del mail sin afectar la transferencia.
    await sendTransactionEmail({
      userId: req.usuario.id,
      status: 'SUCCESS',
      transaction: {
        type: 'TRANSFERENCIA',
        amount: Number(comprobante.monto),
        currency: comprobante.moneda,
        transactionId: comprobante.id,
        date:
          comprobante.fecha?.toISOString() ??
          new Date().toISOString(),
      },
    });

    res.status(200).json({
      message: 'Transferencia realizada con exito',
      comprobante,
    });
  } catch (error: any) {
    const amount = Number(monto);

    // También registra el diagnóstico de las operaciones fallidas.
    await sendTransactionEmail({
      userId: req.usuario.id,
      status: 'FAILED',
      transaction: {
        type: 'TRANSFERENCIA',
        amount: Number.isFinite(amount) ? amount : 0,
        currency:
          typeof moneda === 'string'
            ? moneda.toUpperCase()
            : 'N/D',
        date: new Date().toISOString(),
      },
      errorMessage: error.message,
    });

    // Service errors carry their own HTTP status; anything else is unexpected.
    if (error instanceof AppError && error.status < 500) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error('Error en transferencia:', error);

    res.status(500).json({
      error: 'Hubo un problema al procesar la transferencia',
    });
  }
};