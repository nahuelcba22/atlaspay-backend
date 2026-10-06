import { obtenerHistorial } from '../services/transferenciaHistory.service';
import { procesarTransferencia } from '../services/transferencia.service';
import { sendTransactionEmail } from '../services/transactionEmail.service';

export const getTransferencias = async (req: any, res: any) => {
  try {
    const transferencias = await obtenerHistorial(req.usuario.id);

    res.status(200).json({
      message: 'Historial obtenido con exito',
      transferencias,
    });
  } catch (error: any) {
    if (error.message === 'Cuenta no encontrada') {
      res.status(404).json({
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      error: 'Hubo un problema al consultar el historial',
    });
  }
};

export const crearTransferencia = async (req: any, res: any) => {
  const { cvu_destino, monto, motivo, moneda } = req.body;

  try {
    const comprobante = await procesarTransferencia(
      req.usuario.id,
      cvu_destino,
      monto,
      motivo,
      moneda,
    );

    // Notifica la transferencia exitosa con los datos guardados.
    void sendTransactionEmail({
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

    // El fallo del email no modifica el resultado de la transferencia.
    void sendTransactionEmail({
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

    const clientErrors = [
      'El monto mínimo es 0.1',
      'Moneda invalida',
      'Cuenta origen no encontrada',
      'Cuenta destino no encontrada',
      'Auto-transferencia no permitida',
      'Saldo insuficiente',
    ];

    if (clientErrors.includes(error.message)) {
      res.status(400).json({
        error: error.message,
      });
      return;
    }

    console.error('Error en transferencia:', error);

    res.status(500).json({
      error: 'Hubo un problema al procesar la transferencia',
    });
  }
};