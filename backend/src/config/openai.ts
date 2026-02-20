import OpenAI from 'openai';
import { env } from './env.js';

export const openAiClient = new OpenAI({ apiKey: env.openAiApiKey });

export const OPENAI_TIMEOUT_MS = 20_000;
