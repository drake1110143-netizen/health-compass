import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, patientProfileId, patientData, extractedData } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const prompt = `You are a medical AI assistant providing rule-based medication suggestions based strictly on documented patient data. Do NOT speculate or generate information not present in the data.

Patient Profile:
${JSON.stringify(patientData || {}, null, 2)}

Extracted Medical Data:
${JSON.stringify(extractedData || [], null, 2)}

Based ONLY on the documented conditions, lab values, diagnoses, and medical history provided above, suggest appropriate medications.

Return ONLY valid JSON in this exact structure:
{
  "medications": [
    {
      "medication_name": "medication name",
      "generic_name": "generic name",
      "dosage": "dose and strength",
      "frequency": "how often",
      "route": "oral|IV|IM|topical|inhaled",
      "indication": "what condition this treats",
      "contraindications": ["contraindication1"],
      "priority": "Critical|High|Standard|Optional",
      "source_data": "which patient data triggered this suggestion",
      "rule_applied": "the clinical rule applied"
    }
  ],
  "consistency_check": {
    "interactions_detected": ["interaction1"],
    "warnings": ["warning1"],
    "notes": "general notes"
  }
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    let result = { medications: [], consistency_check: {} };
    if (jsonMatch) {
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Parse error:', e);
      }
    }

    // Clear old suggestions for this patient
    await supabase.from('medication_suggestions').delete().eq('patient_id', patientId);

    // Store new suggestions
    if (result.medications && result.medications.length > 0) {
      const inserts = result.medications.map((med: {
        medication_name: string;
        generic_name?: string;
        dosage?: string;
        frequency?: string;
        route?: string;
        indication?: string;
        contraindications?: string[];
        priority?: string;
        source_data?: string;
        rule_applied?: string;
      }) => ({
        patient_id: patientId,
        patient_profile_id: patientProfileId,
        medication_name: med.medication_name,
        generic_name: med.generic_name || null,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
        route: med.route || null,
        indication: med.indication || null,
        contraindications: med.contraindications || [],
        priority: med.priority || 'Standard',
        source_data: med.source_data || null,
        rule_applied: med.rule_applied || null,
      }));

      await supabase.from('medication_suggestions').insert(inserts);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Medication error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
