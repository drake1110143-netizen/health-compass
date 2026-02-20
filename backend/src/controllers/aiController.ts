import type { Request, Response } from 'express';
import {
  generateMedicalChatReply,
  getMedicationSuggestions,
  validateMedicalDocumentMetadata
} from '../services/aiService.js';
import { sendSuccess } from '../utils/http.js';

export async function aiChatController(req: Request, res: Response) {
  const data = await generateMedicalChatReply(req.auth!.userId, req.auth!.role, req.body.message);
  return sendSuccess(res, data);
}

export async function aiMedicationSuggestionsController(req: Request, res: Response) {
  const data = await getMedicationSuggestions(req.body.context);
  return sendSuccess(res, data);
}

export async function aiValidateDocumentController(req: Request, res: Response) {
  const data = await validateMedicalDocumentMetadata(req.body.metadata);
  return sendSuccess(res, data);
}
