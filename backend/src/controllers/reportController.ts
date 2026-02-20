import type { Request, Response } from 'express';
import { uploadMedicalReport } from '../services/reportService.js';
import { AppError, sendSuccess } from '../utils/http.js';

export async function uploadMedicalReportController(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError('Report file is required', 400);
  }

  const report = await uploadMedicalReport({
    patientId: req.body.patientId,
    doctorId: req.auth!.userId,
    file: req.file,
    extractedText: req.body.extractedText
  });

  return sendSuccess(res, report, 201);
}
