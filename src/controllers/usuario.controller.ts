import { Request, Response } from 'express';
import { registrarNuevoUsuario, autenticarUsuario } from '../services/usuario.service';

export const crearUsuario = async (req: any, res: any) => {
  try {
    const { nombre, email, password } = req.body;
    const { nuevoUsuario, nuevaCuenta } = await registrarNuevoUsuario(nombre, email, password);

    res.status(201).json({
      message: 'Usuario y cuenta creados con exito',
      data: {
        usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, email: nuevoUsuario.email },
        cuenta: { cvu: nuevaCuenta.cvu, alias: nuevaCuenta.alias, saldo: nuevaCuenta.saldo }
      }
    });
  } catch (error) {
    console.error(error);
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
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email }
    });
  } catch (error: any) {
    if (error.message === 'Credenciales invalidas') {
      res.status(401).json({ error: error.message });
    } else {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Hubo un problema al intentar iniciar sesion' });
    }
  }
};