import type { Request, Response } from 'express';
import { createPatientRecord } from '../services/recordService.js';
import { sendSuccess } from '../utils/http.js';

export async function createPatientRecordController(req: Request, res: Response) {
  const record = await createPatientRecord({
    patientId: req.body.patientId,
    diagnosis: req.body.diagnosis,
    clinicalNotes: req.body.clinicalNotes,
    doctorId: req.auth!.userId
  });

  return sendSuccess(res, record, 201);
}
