import type { Request, Response } from 'express';
import { createPatient, getPatientById } from '../services/patientService.js';
import { sendSuccess } from '../utils/http.js';

export async function createPatientController(req: Request, res: Response) {
  const result = await createPatient({
    fullName: req.body.fullName,
    email: req.body.email,
    dateOfBirth: req.body.dateOfBirth,
    gender: req.body.gender,
    contactInfo: req.body.contactInfo,
    doctorId: req.auth!.userId
  });

  return sendSuccess(res, result, 201);
}

export async function getPatientController(req: Request, res: Response) {
  const patient = await getPatientById(req.params.id, req.auth!.userId, req.auth!.role);
  return sendSuccess(res, patient);
}
