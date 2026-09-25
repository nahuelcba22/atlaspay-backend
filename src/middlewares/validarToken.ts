import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos la interfaz Request de Express para poder inyectarle los datos del usuario logueado
export interface AuthRequest extends Request {
  usuario?: any;
}

export const validarToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // 1. El frontend envía el token en el header de Autorización como "Bearer "
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Acceso denegado. No se proporciono un token de seguridad.' });
    return;
  }

  try {
    // 2. Verificamos que el token no haya sido manipulado ni esté vencido
    const firmaSecreta = process.env.JWT_SECRET || 'clave_super_secreta_de_desarrollo';
    const usuarioDecodificado = jwt.verify(token, firmaSecreta);
    
    // 3. Guardamos los datos del usuario en la request para que la siguiente ruta sepa quién es
    req.usuario = usuarioDecodificado;
    
    // 4. Damos luz verde para que la petición continúe hacia la ruta
    next();
  } catch (error) {
    res.status(403).json({ error: 'El token es invalido o ha expirado.' });
  }
};