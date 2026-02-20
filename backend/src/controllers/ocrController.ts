import type { Request, Response } from 'express';
import { extractTextFromFileUrl } from '../services/ocrService.js';
import { sendSuccess } from '../utils/http.js';

export async function ocrExtractController(req: Request, res: Response) {
  const data = await extractTextFromFileUrl(req.body.fileUrl);
  return sendSuccess(res, data);
}
