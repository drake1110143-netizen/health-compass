import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/http.js';

export function validationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((error) => ('msg' in error ? error.msg : 'Validation error'))
      .join(', ');

    sendError(res, message, 422);
    return;
  }

  next();
}
