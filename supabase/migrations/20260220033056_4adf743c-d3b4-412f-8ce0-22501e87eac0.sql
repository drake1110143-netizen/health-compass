
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (custom auth - name + role based)
-- =============================================
CREATE TABLE public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'patient')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ,
  UNIQUE(full_name, role)
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on app_users" ON public.app_users
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- PATIENT PROFILES (created by doctors)
-- =============================================
CREATE TABLE public.patient_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL UNIQUE, -- human-readable unique key like MED-XXXX-XXXX
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  blood_type TEXT,
  allergies TEXT[],
  chronic_conditions TEXT[],
  emergency_contact TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  doctor_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  app_user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL, -- linked patient user
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on patient_profiles" ON public.patient_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- REPORTS / DOCUMENTS
-- =============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL, -- links to patient_profiles.patient_id
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  document_category TEXT NOT NULL, -- Blood Test, X-Ray, MRI, ECG, Prescription, Discharge Summary, Other
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  upload_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_validation_status TEXT DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'validated', 'mismatch', 'error')),
  ai_validation_message TEXT,
  ai_validation_confidence NUMERIC(4,3),
  ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'error')),
  processing_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on reports" ON public.reports
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- EXTRACTED DATA (OCR + structured parsing)
-- =============================================
CREATE TABLE public.extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL,
  raw_text TEXT,
  structured_data JSONB, -- lab values, measurements, dates, etc.
  document_category TEXT,
  extraction_model TEXT DEFAULT 'gemini-3-flash-preview',
  extraction_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER DEFAULT 1
);

ALTER TABLE public.extracted_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on extracted_data" ON public.extracted_data
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- AI VALIDATION RESULTS
-- =============================================
CREATE TABLE public.ai_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL,
  selected_category TEXT NOT NULL,
  detected_category TEXT,
  is_match BOOLEAN,
  confidence NUMERIC(4,3),
  keywords_found TEXT[],
  validation_notes TEXT,
  model_version TEXT DEFAULT 'gemini-3-flash-preview',
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_validation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on ai_validation_results" ON public.ai_validation_results
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ML PREDICTIONS
-- =============================================
CREATE TABLE public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('risk', 'procedure', 'general')),
  prediction_category TEXT,
  risk_level TEXT CHECK (risk_level IN ('Low', 'Moderate', 'High', 'Critical')),
  confidence_score NUMERIC(4,3),
  contributing_factors JSONB,
  recommendations JSONB,
  model_version TEXT DEFAULT 'ml-v1.0-placeholder',
  input_data_hash TEXT, -- prevent duplicate executions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on ml_predictions" ON public.ml_predictions
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- PROCEDURES
-- =============================================
CREATE TABLE public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  procedure_name TEXT NOT NULL,
  procedure_code TEXT,
  priority TEXT CHECK (priority IN ('Urgent', 'High', 'Medium', 'Low', 'Routine')),
  rationale TEXT,
  source TEXT DEFAULT 'ml_prediction',
  ml_prediction_id UUID REFERENCES public.ml_predictions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'recommended' CHECK (status IN ('recommended', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on procedures" ON public.procedures
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- RISK ASSESSMENTS
-- =============================================
CREATE TABLE public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  overall_risk_level TEXT NOT NULL CHECK (overall_risk_level IN ('Low', 'Moderate', 'High', 'Critical')),
  risk_score INTEGER,
  contributing_factors JSONB,
  cardiovascular_risk TEXT,
  metabolic_risk TEXT,
  respiratory_risk TEXT,
  neurological_risk TEXT,
  recommendations TEXT[],
  ml_prediction_id UUID REFERENCES public.ml_predictions(id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on risk_assessments" ON public.risk_assessments
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- MEDICATION SUGGESTIONS
-- =============================================
CREATE TABLE public.medication_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  patient_profile_id UUID REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT,
  frequency TEXT,
  route TEXT,
  indication TEXT,
  contraindications TEXT[],
  priority TEXT DEFAULT 'Standard' CHECK (priority IN ('Critical', 'High', 'Standard', 'Optional')),
  source_data TEXT, -- what patient data triggered this suggestion
  rule_applied TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on medication_suggestions" ON public.medication_suggestions
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- CHAT HISTORY
-- =============================================
CREATE TABLE public.chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id TEXT NOT NULL,
  user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('doctor', 'patient')),
  sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
  message TEXT NOT NULL,
  context_used JSONB, -- what data was used to generate assistant response
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on chat_history" ON public.chat_history
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- STORAGE BUCKET FOR MEDICAL DOCUMENTS
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/tiff']
);

CREATE POLICY "Allow all operations on medical-documents" ON storage.objects
  FOR ALL USING (bucket_id = 'medical-documents') WITH CHECK (bucket_id = 'medical-documents');

-- =============================================
-- FUNCTION: Generate unique Patient ID
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_patient_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    new_id := 'MED-' || 
              upper(substring(md5(random()::text) from 1 for 4)) || '-' ||
              upper(substring(md5(random()::text) from 1 for 6));
    SELECT COUNT(*) INTO exists_count FROM public.patient_profiles WHERE patient_id = new_id;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN new_id;
END;
$$;

-- =============================================
-- TRIGGER: Auto-update updated_at on patient_profiles
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_patient_profiles_patient_id ON public.patient_profiles(patient_id);
CREATE INDEX idx_patient_profiles_doctor_id ON public.patient_profiles(doctor_id);
CREATE INDEX idx_patient_profiles_full_name ON public.patient_profiles(full_name);
CREATE INDEX idx_reports_patient_id ON public.reports(patient_id);
CREATE INDEX idx_reports_patient_profile_id ON public.reports(patient_profile_id);
CREATE INDEX idx_extracted_data_patient_id ON public.extracted_data(patient_id);
CREATE INDEX idx_ml_predictions_patient_id ON public.ml_predictions(patient_id);
CREATE INDEX idx_chat_history_patient_id ON public.chat_history(patient_id);
CREATE INDEX idx_app_users_name_role ON public.app_users(full_name, role);
