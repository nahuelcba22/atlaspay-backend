import {
  registrarNuevoUsuario,
  autenticarUsuario,
} from '../services/usuario.service';

export const crearUsuario = async (req: any, res: any) => {
  try {
    const { nombre, email, password } = req.body;

    const { nuevoUsuario, nuevaCuenta } = await registrarNuevoUsuario(
      nombre,
      email,
      password,
    );

    res.status(201).json({
      message: 'Usuario y cuenta creados con exito',
      data: {
        usuario: {
          id: nuevoUsuario.id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
        },
        cuenta: {
          cvu: (nuevaCuenta as any).cvu,
          alias: (nuevaCuenta as any).alias,
          saldos: {
            ARS: Number((nuevaCuenta as any).saldo_ars ?? 0),
            USD: Number((nuevaCuenta as any).saldo_usd ?? 0),
            EUR: Number((nuevaCuenta as any).saldo_eur ?? 0),
            PEN: Number((nuevaCuenta as any).saldo_pen ?? 0),
          },
        },
      },
    });
  } catch (error: any) {
    if (error.message === 'El correo ya está registrado' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado.' });
    }

    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Hubo un problema al crear el usuario y la cuenta' });
  }
};

export const login = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const { token, usuario } = await autenticarUsuario(email, password);

    res.status(200).json({
      message: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
      },
    });
  } catch (error: any) {
    if (error.message === 'Credenciales invalidas') {
      res.status(401).json({ error: error.message });
      return;
    }

    console.error('Error en login:', error);

    res.status(500).json({
      error: 'Hubo un problema al intentar iniciar sesion',
    });
  }
};