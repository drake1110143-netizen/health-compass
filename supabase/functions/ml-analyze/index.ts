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
    const { patientId, patientProfileId, analysisType, patientData, extractedData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create data hash to prevent duplicate executions
    const dataHash = btoa(JSON.stringify({ patientId, analysisType, ts: Math.floor(Date.now() / 60000) }));

    // Check for recent duplicate
    const { data: existing } = await supabase
      .from('ml_predictions')
      .select('id')
      .eq('patient_id', patientId)
      .eq('prediction_type', analysisType)
      .eq('input_data_hash', dataHash)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ success: true, skipped: true, message: 'Recent prediction exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a medical AI assistant performing structured ${analysisType} analysis for a patient management system.

Patient Profile:
${JSON.stringify(patientData || {}, null, 2)}

Extracted Medical Data from Reports:
${JSON.stringify(extractedData || [], null, 2)}

Analysis Type: ${analysisType}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation text.

${analysisType === 'risk' ? `Return this exact structure:
{
  "risk_level": "Low|Moderate|High|Critical",
  "risk_score": <integer 0-100>,
  "prediction_category": "Cardiovascular|Metabolic|Respiratory|Neurological|General",
  "confidence_score": <0.0-1.0>,
  "contributing_factors": {
    "cardiovascular": {"risk": "Low|Moderate|High", "factors": ["factor1"]},
    "metabolic": {"risk": "Low|Moderate|High", "factors": ["factor1"]},
    "respiratory": {"risk": "Low|Moderate|High", "factors": ["factor1"]},
    "neurological": {"risk": "Low|Moderate|High", "factors": ["factor1"]}
  },
  "recommendations": ["recommendation1", "recommendation2"],
  "model_version": "ml-v1.0-gemini-enhanced"
}` : analysisType === 'procedure' ? `Return this exact structure:
{
  "recommended_procedures": [
    {
      "name": "procedure name",
      "code": "procedure code or null",
      "priority": "Urgent|High|Medium|Low|Routine",
      "rationale": "why this is recommended",
      "estimated_frequency": "frequency"
    }
  ],
  "confidence_score": <0.0-1.0>,
  "model_version": "ml-v1.0-gemini-enhanced"
}` : `Return this exact structure:
{
  "risk_level": "Low|Moderate|High|Critical",
  "risk_score": <integer 0-100>,
  "prediction_category": "General",
  "confidence_score": <0.0-1.0>,
  "contributing_factors": {"general": {"risk": "Low|Moderate|High", "factors": ["factor1"]}},
  "recommendations": ["recommendation1"],
  "model_version": "ml-v1.0-gemini-enhanced"
}`}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'user', content: systemPrompt }],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

    let mlResult: Record<string, unknown> = {
      risk_level: 'Low',
      risk_score: 20,
      confidence_score: 0.5,
      model_version: 'ml-v1.0-placeholder',
      recommendations: ['Consult with specialist', 'Regular monitoring recommended']
    };

    if (jsonMatch) {
      try {
        mlResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // Store ML prediction
    const { data: prediction, error: predError } = await supabase
      .from('ml_predictions')
      .insert({
        patient_id: patientId,
        patient_profile_id: patientProfileId,
        prediction_type: analysisType,
        prediction_category: (mlResult.prediction_category as string) || 'General',
        risk_level: (mlResult.risk_level as string) || 'Low',
        confidence_score: (mlResult.confidence_score as number) || 0.5,
        contributing_factors: (mlResult.contributing_factors as Record<string, unknown>) || {},
        recommendations: mlResult.recommendations || [],
        model_version: (mlResult.model_version as string) || 'ml-v1.0',
        input_data_hash: dataHash,
      })
      .select()
      .single();

    if (predError) throw new Error(`Prediction insert error: ${predError.message}`);

    // Store procedures if procedure analysis
    if (analysisType === 'procedure' && mlResult.recommended_procedures) {
      const procedures = (mlResult.recommended_procedures as Array<{name: string; code?: string; priority: string; rationale: string}>);
      const procedureInserts = procedures.map((p) => ({
        patient_id: patientId,
        patient_profile_id: patientProfileId,
        procedure_name: p.name,
        procedure_code: p.code || null,
        priority: p.priority || 'Routine',
        rationale: p.rationale || '',
        source: 'ml_prediction',
        ml_prediction_id: prediction.id,
      }));

      if (procedureInserts.length > 0) {
        await supabase.from('procedures').insert(procedureInserts);
      }
    }

    // Store risk assessment if risk analysis
    if (analysisType === 'risk') {
      const cf = (mlResult.contributing_factors as Record<string, {risk: string; factors: string[]}>) || {};
      await supabase.from('risk_assessments').insert({
        patient_id: patientId,
        patient_profile_id: patientProfileId,
        overall_risk_level: (mlResult.risk_level as string) || 'Low',
        risk_score: (mlResult.risk_score as number) || 0,
        contributing_factors: mlResult.contributing_factors || {},
        cardiovascular_risk: cf.cardiovascular?.risk || 'Low',
        metabolic_risk: cf.metabolic?.risk || 'Low',
        respiratory_risk: cf.respiratory?.risk || 'Low',
        neurological_risk: cf.neurological?.risk || 'Low',
        recommendations: (mlResult.recommendations as string[]) || [],
        ml_prediction_id: prediction.id,
      });
    }

    return new Response(JSON.stringify({ success: true, prediction, mlResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ML analyze error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
