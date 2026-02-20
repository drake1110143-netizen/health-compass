import crypto from 'node:crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/http.js';

export interface CreatePatientInput {
  fullName: string;
  email: string;
  dateOfBirth?: string;
  gender?: string;
  contactInfo?: Record<string, unknown>;
  doctorId: string;
}

function buildSecurePatientKey(): string {
  const token = crypto.randomBytes(32).toString('hex');
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPatient(input: CreatePatientInput) {
  const secureUniquePatientKey = buildSecurePatientKey();

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      role: 'patient',
      full_name: input.fullName,
      email: input.email,
      password_hash: 'auth-not-yet-enabled'
    })
    .select('id, full_name, email, role, created_at')
    .single();

  if (userError || !userData) {
    throw new AppError(userError?.message ?? 'Unable to create patient user', 400);
  }

  const { data: patientData, error: patientError } = await supabaseAdmin
    .from('patients')
    .insert({
      id: userData.id,
      doctor_id: input.doctorId,
      secure_unique_patient_key: secureUniquePatientKey,
      date_of_birth: input.dateOfBirth,
      gender: input.gender,
      contact_info: input.contactInfo ?? {}
    })
    .select('*')
    .single();

  if (patientError || !patientData) {
    throw new AppError(patientError?.message ?? 'Unable to create patient profile', 400);
  }

  return {
    user: userData,
    patient: patientData,
    secureUniquePatientKey
  };
}

export async function getPatientById(patientId: string, requesterId: string, requesterRole: 'doctor' | 'patient') {
  const query = supabaseAdmin
    .from('patients')
    .select('*, users!patients_id_fkey(full_name, email, created_at)')
    .eq('id', patientId);

  if (requesterRole === 'doctor') {
    query.eq('doctor_id', requesterId);
  }

  if (requesterRole === 'patient') {
    query.eq('id', requesterId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new AppError('Patient not found or access denied', 404);
  }

  return data;
}
