import type { Request, Response } from 'express';
import { analyzeWithMlPlaceholder } from '../services/mlService.js';
import { sendSuccess } from '../utils/http.js';

export async function mlAnalyzeController(req: Request, res: Response) {
  const data = await analyzeWithMlPlaceholder({
    modelType: req.body.modelType,
    payload: req.body.payload
  });
  return sendSuccess(res, data);
}
