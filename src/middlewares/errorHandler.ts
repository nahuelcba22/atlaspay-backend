import { ErrorRequestHandler, Request, Response } from 'express';
import { AppError } from '../utils/appError';

const GENERIC_MESSAGE = 'Error interno del servidor';

// Resolves the HTTP status for an error.
// AppError.status takes precedence; a numeric statusCode (e.g. body-parser
// errors) is still honored. Anything else, or a value outside 400-599, is a 500.
function resolveStatus(error: unknown): number {
  const candidate =
    error instanceof AppError
      ? error.status
      : (error as { statusCode?: unknown } | null | undefined)?.statusCode;

  const isClientOrServerError =
    typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate <= 599;

  return isClientOrServerError ? candidate : 500;
}

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = resolveStatus(error);

  // Server errors never leak their message to the client.
  const hasMessage =
    typeof error?.message === 'string' && error.message.length > 0;
  const message =
    statusCode >= 500 || !hasMessage ? GENERIC_MESSAGE : error.message;

  const payload: Record<string, unknown> = { error: message };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = error?.stack ?? '';
  }

  res.status(statusCode).json(payload);
};