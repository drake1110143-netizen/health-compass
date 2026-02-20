import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { extractedText, selectedCategory, filename } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not set');

    const categoryKeywords: Record<string, string[]> = {
      'Blood Test Report': ['hemoglobin', 'WBC', 'RBC', 'platelet', 'glucose', 'creatinine', 'cholesterol', 'triglyceride', 'ALT', 'AST', 'CBC', 'complete blood count', 'blood test', 'serum', 'plasma', 'hematocrit', 'neutrophil', 'lymphocyte', 'mg/dL', 'g/dL', 'mEq/L', 'mmol/L', 'U/L'],
      'X-Ray': ['X-ray', 'radiograph', 'chest', 'bone', 'fracture', 'opacity', 'density', 'AP view', 'lateral view', 'radiology', 'impression', 'kVp', 'mAs', 'cardiomegaly', 'pneumonia', 'consolidation', 'effusion', 'pneumothorax'],
      'MRI Scan': ['MRI', 'magnetic resonance', 'T1', 'T2', 'FLAIR', 'gadolinium', 'lesion', 'signal intensity', 'axial', 'coronal', 'sagittal', 'hyperintense', 'hypointense', 'enhancement', 'atrophy', 'herniation'],
      'ECG Report': ['ECG', 'EKG', 'electrocardiogram', 'heart rate', 'rhythm', 'sinus', 'QRS', 'PR interval', 'QT interval', 'ST segment', 'T wave', 'P wave', 'atrial', 'ventricular', 'bpm', 'arrhythmia', 'fibrillation', 'flutter'],
      'Prescription': ['prescription', 'Rx', 'prescribed', 'dosage', 'mg', 'tablet', 'capsule', 'syrup', 'injection', 'twice daily', 'once daily', 'after meals', 'before meals', 'physician', 'signature', 'refill', 'dispense', 'sig'],
      'Discharge Summary': ['discharge', 'admitted', 'diagnosis', 'treatment', 'hospital', 'discharge date', 'admission date', 'follow-up', 'procedure performed', 'chief complaint', 'clinical notes', 'medications on discharge', 'condition on discharge'],
      'Other': []
    };

    const prompt = `You are a medical document classifier. Analyze the following extracted text from a medical document and determine its category.

Selected category by doctor: "${selectedCategory}"
Filename: "${filename}"

Extracted text (first 2000 chars):
${extractedText?.substring(0, 2000) || 'No text extracted'}

Known medical document categories:
- Blood Test Report: lab values, blood counts, chemistry panels
- X-Ray: radiographic imaging reports
- MRI Scan: magnetic resonance imaging reports  
- ECG Report: electrocardiogram/cardiac rhythm reports
- Prescription: medication prescriptions
- Discharge Summary: hospital discharge documentation
- Other: any other medical document

Based on the text content, respond with ONLY a valid JSON object in this exact format:
{
  "detected_category": "<one of the categories above>",
  "is_match": <true or false>,
  "confidence": <0.0 to 1.0>,
  "keywords_found": ["keyword1", "keyword2"],
  "validation_notes": "<brief explanation>"
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
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${err}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    let result;
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: simple keyword matching
      const text = (extractedText || '').toLowerCase();
      const keywords = categoryKeywords[selectedCategory] || [];
      const found = keywords.filter(kw => text.includes(kw.toLowerCase()));
      const confidence = Math.min(0.5 + (found.length * 0.05), 0.95);
      result = {
        detected_category: selectedCategory,
        is_match: found.length > 2,
        confidence,
        keywords_found: found,
        validation_notes: found.length > 2 ? 'Keywords matched' : 'Insufficient matching keywords'
      };
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
