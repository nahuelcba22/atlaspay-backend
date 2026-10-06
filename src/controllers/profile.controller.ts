import { Response } from 'express';
import { AuthRequest } from '../middlewares/validarToken';
import { getUserProfile } from '../services/profile.service';

// Devuelve los datos del perfil del usuario autenticado.
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.usuario?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const { user, account } = await getUserProfile(userId);

    res.status(200).json({
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
      },
      cuenta: {
        id: account.id,
        cvu: account.cvu,
        alias: account.alias,
        estado: account.estado,
        saldos: {
          ARS: Number(account.saldo_ars),
          USD: Number(account.saldo_usd),
          EUR: Number(account.saldo_eur),
          PEN: Number(account.saldo_pen),
        },
      },
    });

  } catch (error: any) {
    if (
      error.message === 'Usuario no encontrado' ||
      error.message === 'Cuenta no encontrada'
    ) {
      res.status(404).json({ error: error.message });
      return;
    }

    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'No se pudo obtener el perfil' });
  }
};