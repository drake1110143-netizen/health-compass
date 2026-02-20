export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_validation_results: {
        Row: {
          confidence: number | null
          detected_category: string | null
          id: string
          is_match: boolean | null
          keywords_found: string[] | null
          model_version: string | null
          patient_id: string
          report_id: string
          selected_category: string
          validated_at: string
          validation_notes: string | null
        }
        Insert: {
          confidence?: number | null
          detected_category?: string | null
          id?: string
          is_match?: boolean | null
          keywords_found?: string[] | null
          model_version?: string | null
          patient_id: string
          report_id: string
          selected_category: string
          validated_at?: string
          validation_notes?: string | null
        }
        Update: {
          confidence?: number | null
          detected_category?: string | null
          id?: string
          is_match?: boolean | null
          keywords_found?: string[] | null
          model_version?: string | null
          patient_id?: string
          report_id?: string
          selected_category?: string
          validated_at?: string
          validation_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_validation_results_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string
          full_name: string
          id: string
          last_login: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          last_login?: string | null
          role: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          last_login?: string | null
          role?: string
        }
        Relationships: []
      }
      chat_history: {
        Row: {
          context_used: Json | null
          created_at: string
          id: string
          message: string
          patient_id: string
          role_type: string
          sender: string
          user_id: string | null
        }
        Insert: {
          context_used?: Json | null
          created_at?: string
          id?: string
          message: string
          patient_id: string
          role_type: string
          sender: string
          user_id?: string | null
        }
        Update: {
          context_used?: Json | null
          created_at?: string
          id?: string
          message?: string
          patient_id?: string
          role_type?: string
          sender?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_data: {
        Row: {
          document_category: string | null
          extraction_model: string | null
          extraction_timestamp: string
          id: string
          patient_id: string
          raw_text: string | null
          report_id: string
          structured_data: Json | null
          version: number | null
        }
        Insert: {
          document_category?: string | null
          extraction_model?: string | null
          extraction_timestamp?: string
          id?: string
          patient_id: string
          raw_text?: string | null
          report_id: string
          structured_data?: Json | null
          version?: number | null
        }
        Update: {
          document_category?: string | null
          extraction_model?: string | null
          extraction_timestamp?: string
          id?: string
          patient_id?: string
          raw_text?: string | null
          report_id?: string
          structured_data?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_data_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_suggestions: {
        Row: {
          contraindications: string[] | null
          created_at: string
          dosage: string | null
          frequency: string | null
          generic_name: string | null
          id: string
          indication: string | null
          medication_name: string
          patient_id: string
          patient_profile_id: string | null
          priority: string | null
          route: string | null
          rule_applied: string | null
          source_data: string | null
        }
        Insert: {
          contraindications?: string[] | null
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          generic_name?: string | null
          id?: string
          indication?: string | null
          medication_name: string
          patient_id: string
          patient_profile_id?: string | null
          priority?: string | null
          route?: string | null
          rule_applied?: string | null
          source_data?: string | null
        }
        Update: {
          contraindications?: string[] | null
          created_at?: string
          dosage?: string | null
          frequency?: string | null
          generic_name?: string | null
          id?: string
          indication?: string | null
          medication_name?: string
          patient_id?: string
          patient_profile_id?: string | null
          priority?: string | null
          route?: string | null
          rule_applied?: string | null
          source_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_suggestions_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_predictions: {
        Row: {
          confidence_score: number | null
          contributing_factors: Json | null
          created_at: string
          id: string
          input_data_hash: string | null
          model_version: string | null
          patient_id: string
          patient_profile_id: string | null
          prediction_category: string | null
          prediction_type: string
          recommendations: Json | null
          risk_level: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          contributing_factors?: Json | null
          created_at?: string
          id?: string
          input_data_hash?: string | null
          model_version?: string | null
          patient_id: string
          patient_profile_id?: string | null
          prediction_category?: string | null
          prediction_type: string
          recommendations?: Json | null
          risk_level?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          contributing_factors?: Json | null
          created_at?: string
          id?: string
          input_data_hash?: string | null
          model_version?: string | null
          patient_id?: string
          patient_profile_id?: string | null
          prediction_category?: string | null
          prediction_type?: string
          recommendations?: Json | null
          risk_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_profiles: {
        Row: {
          address: string | null
          allergies: string[] | null
          app_user_id: string | null
          blood_type: string | null
          chronic_conditions: string[] | null
          created_at: string
          date_of_birth: string | null
          doctor_id: string
          email: string | null
          emergency_contact: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          patient_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          app_user_id?: string | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          doctor_id: string
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          app_user_id?: string | null
          blood_type?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          date_of_birth?: string | null
          doctor_id?: string
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_profiles_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          created_at: string
          id: string
          ml_prediction_id: string | null
          patient_id: string
          patient_profile_id: string | null
          priority: string | null
          procedure_code: string | null
          procedure_name: string
          rationale: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ml_prediction_id?: string | null
          patient_id: string
          patient_profile_id?: string | null
          priority?: string | null
          procedure_code?: string | null
          procedure_name: string
          rationale?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ml_prediction_id?: string | null
          patient_id?: string
          patient_profile_id?: string | null
          priority?: string | null
          procedure_code?: string | null
          procedure_name?: string
          rationale?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_ml_prediction_id_fkey"
            columns: ["ml_prediction_id"]
            isOneToOne: false
            referencedRelation: "ml_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          ai_validation_confidence: number | null
          ai_validation_message: string | null
          ai_validation_status: string | null
          created_at: string
          doctor_id: string | null
          document_category: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          ocr_status: string | null
          original_filename: string
          patient_id: string
          patient_profile_id: string | null
          processing_complete: boolean | null
          storage_path: string
          upload_timestamp: string
        }
        Insert: {
          ai_validation_confidence?: number | null
          ai_validation_message?: string | null
          ai_validation_status?: string | null
          created_at?: string
          doctor_id?: string | null
          document_category: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          ocr_status?: string | null
          original_filename: string
          patient_id: string
          patient_profile_id?: string | null
          processing_complete?: boolean | null
          storage_path: string
          upload_timestamp?: string
        }
        Update: {
          ai_validation_confidence?: number | null
          ai_validation_message?: string | null
          ai_validation_status?: string | null
          created_at?: string
          doctor_id?: string | null
          document_category?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          ocr_status?: string | null
          original_filename?: string
          patient_id?: string
          patient_profile_id?: string | null
          processing_complete?: boolean | null
          storage_path?: string
          upload_timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_assessments: {
        Row: {
          assessed_at: string
          cardiovascular_risk: string | null
          contributing_factors: Json | null
          id: string
          metabolic_risk: string | null
          ml_prediction_id: string | null
          neurological_risk: string | null
          overall_risk_level: string
          patient_id: string
          patient_profile_id: string | null
          recommendations: string[] | null
          respiratory_risk: string | null
          risk_score: number | null
        }
        Insert: {
          assessed_at?: string
          cardiovascular_risk?: string | null
          contributing_factors?: Json | null
          id?: string
          metabolic_risk?: string | null
          ml_prediction_id?: string | null
          neurological_risk?: string | null
          overall_risk_level: string
          patient_id: string
          patient_profile_id?: string | null
          recommendations?: string[] | null
          respiratory_risk?: string | null
          risk_score?: number | null
        }
        Update: {
          assessed_at?: string
          cardiovascular_risk?: string | null
          contributing_factors?: Json | null
          id?: string
          metabolic_risk?: string | null
          ml_prediction_id?: string | null
          neurological_risk?: string | null
          overall_risk_level?: string
          patient_id?: string
          patient_profile_id?: string | null
          recommendations?: string[] | null
          respiratory_risk?: string | null
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_ml_prediction_id_fkey"
            columns: ["ml_prediction_id"]
            isOneToOne: false
            referencedRelation: "ml_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_assessments_patient_profile_id_fkey"
            columns: ["patient_profile_id"]
            isOneToOne: false
            referencedRelation: "patient_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_patient_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
