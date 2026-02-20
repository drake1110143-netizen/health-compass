import { openAiClient, OPENAI_TIMEOUT_MS } from '../config/openai.js';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../utils/http.js';

const MEDICAL_SAFETY_PROMPT = `You are a clinical support assistant for healthcare professionals.
- Never provide definitive diagnosis.
- Always include safety caveats and recommend clinical verification.
- For medication requests, mark output as advisory and non-prescriptive.
- Return structured JSON only.`;

export async function generateMedicalChatReply(userId: string, role: string, message: string) {
  const completion = await openAiClient.responses.create(
    {
      model: 'gpt-4.1-mini',
      input: [
        { role: 'system', content: MEDICAL_SAFETY_PROMPT },
        { role: 'user', content: message }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'medical_chat_response',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              clinical_considerations: { type: 'array', items: { type: 'string' } },
              safety_notice: { type: 'string' }
            },
            required: ['summary', 'clinical_considerations', 'safety_notice']
          },
          strict: true
        }
      }
    },
    { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) }
  );

  const output = completion.output_text;
  if (!output) {
    throw new AppError('AI response was empty', 502);
  }

  const parsed = JSON.parse(output) as Record<string, unknown>;

  await supabaseAdmin.from('ai_chat_history').insert([
    { user_id: userId, role, message },
    { user_id: userId, role: 'assistant', message: output }
  ]);

  return parsed;
}

export async function getMedicationSuggestions(context: string) {
  const completion = await openAiClient.responses.create(
    {
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You provide medication suggestions only as non-prescriptive advisory notes for licensed doctors. Return strict JSON.'
        },
        { role: 'user', content: context }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'medication_suggestions',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              disclaimer: { type: 'string' },
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    medication: { type: 'string' },
                    rationale: { type: 'string' },
                    precautions: { type: 'array', items: { type: 'string' } }
                  },
                  required: ['medication', 'rationale', 'precautions']
                }
              }
            },
            required: ['disclaimer', 'suggestions']
          },
          strict: true
        }
      }
    },
    { signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS) }
  );

  return JSON.parse(completion.output_text || '{"disclaimer":"No output","suggestions":[]}');
}

export async function validateMedicalDocumentMetadata(metadata: Record<string, unknown>) {
  const missingFields = ['patientId', 'documentType', 'uploadedBy'].filter((field) => !(field in metadata));

  return {
    valid: missingFields.length === 0,
    missingFields,
    notes: missingFields.length ? 'Required metadata is incomplete' : 'Metadata structure looks valid'
  };
}
