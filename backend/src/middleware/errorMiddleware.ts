import type { NextFunction, Request, Response } from 'express';
import { AppError, sendError } from '../utils/http.js';

export function errorMiddleware(error: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    sendError(res, error.message, error.statusCode);
    return;
  }

  console.error('Unhandled error:', error);
  sendError(res, 'Internal server error', 500);
}
