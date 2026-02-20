import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/http.js';

interface UploadReportInput {
  patientId: string;
  doctorId: string;
  file: Express.Multer.File;
  extractedText?: string;
}

export async function uploadMedicalReport(input: UploadReportInput) {
  const { data: patient, error: patientError } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('id', input.patientId)
    .eq('doctor_id', input.doctorId)
    .single();

  if (patientError || !patient) {
    throw new AppError('Patient not found or access denied', 404);
  }

  const fileExt = input.file.originalname.split('.').pop();
  const path = `${input.patientId}/${randomUUID()}.${fileExt ?? 'bin'}`;

  const { error: storageError } = await supabaseAdmin.storage
    .from('medical-reports')
    .upload(path, input.file.buffer, {
      contentType: input.file.mimetype,
      upsert: false
    });

  if (storageError) {
    throw new AppError(`Storage upload failed: ${storageError.message}`, 500);
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('medical-reports').getPublicUrl(path);

  const { data, error } = await supabaseAdmin
    .from('medical_reports')
    .insert({
      patient_id: input.patientId,
      file_url: publicUrlData.publicUrl,
      extracted_text: input.extractedText ?? null,
      uploaded_by_doctor_id: input.doctorId
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new AppError(error?.message ?? 'Unable to save report metadata', 400);
  }

  return data;
}
