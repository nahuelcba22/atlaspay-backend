import { autenticarUsuarioGoogle } from '../services/googleAuth.service';

// Autentica al usuario utilizando el token recibido desde Google.
export const loginGoogle = async (req: any, res: any) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({ error: 'Falta el token de Google' });
      return;
    }

    const { token, usuario } = await autenticarUsuarioGoogle(accessToken);

    res.status(200).json({
      message: 'Autenticacion con Google exitosa',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (error: any) {
    if (error.message === 'Google no está configurado') {
      res.status(503).json({ error: error.message });
      return;
    }

    if (error.message === 'Cuenta de Google no válida') {
      res.status(401).json({ error: error.message });
      return;
    }

    console.error('Error en autenticacion con Google:', error);

    res.status(500).json({
      error: 'Hubo un problema al autenticar con Google',
    });
  }
};