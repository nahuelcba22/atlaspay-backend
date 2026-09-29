import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  usuario?: any;
}

export const validarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. No se proporciono un token de seguridad.' });
    return;
  }

  try {
      
    const firmaSecreta = process.env.JWT_SECRET || 'clave_super_secreta_de_desarrollo';
    const usuarioDecodificado = jwt.verify(token, firmaSecreta);
    
    req.usuario = usuarioDecodificado;
    
    next();
  } catch (error) {
    res.status(403).json({ error: 'El token es invalido o ha expirado.' });
  }
};