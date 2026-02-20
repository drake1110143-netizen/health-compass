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
    const { patientId, userId, roleType, message, patientContext } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get recent chat history
    const { data: chatHistory } = await supabase
      .from('chat_history')
      .select('sender, message')
      .eq('patient_id', patientId)
      .eq('role_type', roleType)
      .order('created_at', { ascending: true })
      .limit(20);

    // Store user message
    await supabase.from('chat_history').insert({
      patient_id: patientId,
      user_id: userId || null,
      role_type: roleType,
      sender: 'user',
      message,
    });

    const systemPrompt = `You are MediCore AI Assistant, a deterministic medical assistant that responds ONLY based on stored patient data. You do NOT speculate, generate new medical advice, or provide information not found in the patient's records.

Role context: You are assisting a ${roleType === 'doctor' ? 'Doctor (full access to all medical data)' : 'Patient (access to own records only)'}.

Patient Medical Context:
${JSON.stringify(patientContext || {}, null, 2)}

CRITICAL RULES:
1. Answer ONLY based on the data provided above
2. If asked about something not in the records, say "This information is not available in the current records"
3. Do NOT suggest treatments or medications not in the stored suggestions
4. Do NOT provide general medical advice outside of the patient's records
5. Be clear, concise, and professional
6. For patients: use simple, non-technical language where possible
7. Always reference the source of information (e.g., "According to your blood test from [date]...")`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []).map((h: {sender: string; message: string}) => ({
        role: h.sender === 'user' ? 'user' : 'assistant',
        content: h.message,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const aiData = await response.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || 'I apologize, I could not process your request at this time.';

    // Store assistant response
    await supabase.from('chat_history').insert({
      patient_id: patientId,
      user_id: userId || null,
      role_type: roleType,
      sender: 'assistant',
      message: assistantMessage,
      context_used: patientContext ? { has_context: true } : { has_context: false },
    });

    return new Response(JSON.stringify({ success: true, message: assistantMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
