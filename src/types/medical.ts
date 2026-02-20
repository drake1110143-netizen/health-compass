export type UserRole = 'doctor' | 'patient';

export interface AppUser {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  last_login?: string;
}

export interface PatientProfile {
  id: string;
  patient_id: string;
  full_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
  emergency_contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  doctor_id: string;
  app_user_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  patient_id: string;
  patient_profile_id: string;
  doctor_id: string;
  document_category: string;
  original_filename: string;
  storage_path: string;
  file_size_bytes?: number;
  mime_type?: string;
  upload_timestamp: string;
  ai_validation_status: 'pending' | 'validated' | 'mismatch' | 'error';
  ai_validation_message?: string;
  ai_validation_confidence?: number;
  ocr_status: 'pending' | 'processing' | 'completed' | 'error';
  processing_complete: boolean;
  created_at: string;
}

export interface ExtractedData {
  id: string;
  report_id: string;
  patient_id: string;
  raw_text?: string;
  structured_data?: Record<string, unknown>;
  document_category?: string;
  extraction_model?: string;
  extraction_timestamp: string;
  version: number;
}

export interface MLPrediction {
  id: string;
  patient_id: string;
  patient_profile_id?: string;
  prediction_type: 'risk' | 'procedure' | 'general';
  prediction_category?: string;
  risk_level?: 'Low' | 'Moderate' | 'High' | 'Critical';
  confidence_score?: number;
  contributing_factors?: Record<string, unknown>;
  recommendations?: unknown;
  model_version?: string;
  created_at: string;
  updated_at: string;
}

export interface Procedure {
  id: string;
  patient_id: string;
  patient_profile_id?: string;
  procedure_name: string;
  procedure_code?: string;
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low' | 'Routine';
  rationale?: string;
  source?: string;
  ml_prediction_id?: string;
  status: 'recommended' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface RiskAssessment {
  id: string;
  patient_id: string;
  patient_profile_id?: string;
  overall_risk_level: 'Low' | 'Moderate' | 'High' | 'Critical';
  risk_score?: number;
  contributing_factors?: Record<string, unknown>;
  cardiovascular_risk?: string;
  metabolic_risk?: string;
  respiratory_risk?: string;
  neurological_risk?: string;
  recommendations?: string[];
  ml_prediction_id?: string;
  assessed_at: string;
}

export interface MedicationSuggestion {
  id: string;
  patient_id: string;
  patient_profile_id?: string;
  medication_name: string;
  generic_name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  indication?: string;
  contraindications?: string[];
  priority: 'Critical' | 'High' | 'Standard' | 'Optional';
  source_data?: string;
  rule_applied?: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  patient_id: string;
  user_id?: string;
  role_type: 'doctor' | 'patient';
  sender: 'user' | 'assistant';
  message: string;
  context_used?: Record<string, unknown>;
  created_at: string;
}

export type DocumentCategory =
  | 'Blood Test Report'
  | 'X-Ray'
  | 'MRI Scan'
  | 'ECG Report'
  | 'Prescription'
  | 'Discharge Summary'
  | 'Other';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Blood Test Report',
  'X-Ray',
  'MRI Scan',
  'ECG Report',
  'Prescription',
  'Discharge Summary',
  'Other',
];
