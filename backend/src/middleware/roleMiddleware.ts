import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../models/domain.js';
import { sendError } from '../utils/http.js';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      sendError(res, 'Forbidden: insufficient permissions', 403);
      return;
    }

    next();
  };
}
