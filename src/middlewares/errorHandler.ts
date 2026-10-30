import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    typeof (error as { statusCode?: number }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;

  const errorMessage =
    typeof error.message === 'string' && error.message.length > 0
      ? error.message
      : 'Error interno del servidor';
  const message =
    statusCode >= 500 ? 'Error interno del servidor' : errorMessage;

  const payload: Record<string, unknown> = { error: message };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = error.stack ?? '';
  }

  res.status(statusCode).json(payload);
};
