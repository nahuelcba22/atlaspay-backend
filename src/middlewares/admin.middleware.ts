import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env'; //

export const verifyAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. Buscamos el token en los headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Acceso denegado: No se proporcionó un token válido.' });
      return;
    }

    // 2. Extraemos solo el token, quitando la palabra "Bearer "
    const token = authHeader.split(' ')[1];

    // 3. Desencriptamos el token usando tu firma secreta
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string; role: string };

    // 4. Verificamos si el usuario tiene el rol de administrador
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Acceso denegado: Se requieren permisos de administrador.' });
      return;
    }

    // 5. Si todo está perfecto, guardamos los datos del admin en la request y dejamos seguir la ruta
    (req as any).admin = decoded;
    next();
    
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};