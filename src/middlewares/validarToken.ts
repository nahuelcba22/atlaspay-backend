import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Extiende Request para incluir los datos del usuario autenticado.
export interface AuthRequest extends Request {
  usuario?: any;
}

export const validarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Obtiene el token enviado como "Bearer <token>".
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. No se proporciono un token de seguridad.' });
    return;
  }

  try {
    // Verifica la firma y vigencia del token.
    const usuarioDecodificado = jwt.verify(token, env.JWT_SECRET);

    req.usuario = usuarioDecodificado;
    next();
  } catch {
    res.status(403).json({ error: 'El token es invalido o ha expirado.' });
  }
};