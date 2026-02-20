import type { Response } from 'express';
import type { ApiResponse } from '../models/domain.js';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response<ApiResponse<T>> {
  return res.status(statusCode).json({ success: true, data, error: null });
}

export function sendError(res: Response, message: string, statusCode = 400): Response<ApiResponse<null>> {
  return res.status(statusCode).json({ success: false, data: null, error: message });
}
