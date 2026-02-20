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
    const { reportId, patientId, storagePath, documentCategory } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('medical-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const mimeType = fileData.type || 'application/pdf';

    const systemPrompt = `You are a medical OCR specialist. Extract all medical data from this document and return structured JSON.
    
Document category: ${documentCategory}

Return ONLY valid JSON in this exact structure:
{
  "raw_text": "full extracted text from document",
  "structured_data": {
    "document_date": "YYYY-MM-DD or null",
    "patient_name": "name or null",
    "doctor_name": "name or null",
    "facility": "hospital/clinic name or null",
    "lab_values": [
      {"name": "test name", "value": "result", "unit": "unit", "reference_range": "range", "status": "normal/high/low/critical"}
    ],
    "diagnoses": ["diagnosis1", "diagnosis2"],
    "medications": [
      {"name": "medication", "dosage": "dose", "frequency": "how often", "duration": "duration"}
    ],
    "measurements": [
      {"name": "measurement name", "value": "value", "unit": "unit"}
    ],
    "findings": ["finding1", "finding2"],
    "recommendations": ["rec1", "rec2"],
    "summary": "brief medical summary of the document"
  }
}`;

    let aiResponse;
    
    // Use multimodal if image, text extraction for PDF
    if (mimeType.startsWith('image/')) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
            ]
          }],
          temperature: 0.1,
          max_tokens: 3000,
        }),
      });
      aiResponse = await response.json();
    } else {
      // For PDF, use text-based extraction with a description prompt
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
              { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` } }
            ]
          }],
          temperature: 0.1,
          max_tokens: 3000,
        }),
      });
      aiResponse = await response.json();
    }

    const rawContent = aiResponse.choices?.[0]?.message?.content || '';
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    
    let extractedResult = {
      raw_text: rawContent,
      structured_data: { summary: 'Extraction completed', lab_values: [], findings: [], recommendations: [] }
    };

    if (jsonMatch) {
      try {
        extractedResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('JSON parse error:', e);
      }
    }

    // Store in database
    const { data: extractedData, error: insertError } = await supabase
      .from('extracted_data')
      .insert({
        report_id: reportId,
        patient_id: patientId,
        raw_text: extractedResult.raw_text,
        structured_data: extractedResult.structured_data,
        document_category: documentCategory,
        extraction_model: 'gemini-2.5-flash',
      })
      .select()
      .single();

    if (insertError) throw new Error(`DB insert error: ${insertError.message}`);

    // Update report status
    await supabase
      .from('reports')
      .update({ ocr_status: 'completed', processing_complete: true })
      .eq('id', reportId);

    return new Response(JSON.stringify({ 
      success: true, 
      extractedData,
      structured: extractedResult.structured_data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('OCR error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
