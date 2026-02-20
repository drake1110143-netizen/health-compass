import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../utils/http.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = req.header('x-user-id');
  const role = req.header('x-user-role');

  if (!userId || !role || (role !== 'doctor' && role !== 'patient')) {
    sendError(res, 'Unauthorized: provide x-user-id and x-user-role headers', 401);
    return;
  }

  req.auth = { userId, role };
  next();
}
