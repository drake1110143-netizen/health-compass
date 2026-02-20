import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/http.js';

interface CreateRecordInput {
  patientId: string;
  diagnosis: string;
  clinicalNotes: string;
  doctorId: string;
}

export async function createPatientRecord(input: CreateRecordInput) {
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('id', input.patientId)
    .eq('doctor_id', input.doctorId)
    .single();

  if (patientError || !patient) {
    throw new AppError('Patient not found or access denied', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('patient_records')
    .insert({
      patient_id: input.patientId,
      diagnosis: input.diagnosis,
      clinical_notes: input.clinicalNotes,
      created_by_doctor_id: input.doctorId
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(error?.message ?? 'Unable to create patient record', 400);
  }

  return data;
}
