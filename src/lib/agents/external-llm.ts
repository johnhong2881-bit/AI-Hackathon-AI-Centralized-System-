// ============================================================
// External LLM — SovernStack API (GPT-OSS 120B)
// ============================================================
// This module implements the SovernStack chat API call.
//
// API Format (discovered from SovernStack playground curl):
//   POST {baseUrl}/llm/chat
//   Headers:
//     Content-Type: application/json
//     x-user-id:   <API key>       (NOT Authorization: Bearer)
//     x-model:     <model name>     (NOT in body)
//   Body:
//     {
//       "messages": [
//         {"role":"system","content":"..."},
//         {"role":"user","content":"..."}
//       ],
//       "temperature": 0.2,
//       "max_tokens": 4096
//     }
//   Response:
//     {
//       "id": "...",
//       "created": 1234567890,
//       "userId": "...",
//       "model": "GPT-OSS 120B",
//       "message": "<string — may contain JSON>",
//       "finishReason": "stop",
//       "usage": {"prompt_tokens": 100, "completion_tokens": 200, "total_tokens": 300}
//     }
//
// The `message` field is a STRING. Our prompts ask for "ONLY raw JSON",
// so message should contain a JSON string like {"assignmentId":"...",...}.
// We JSON.parse() it to get structured output.
//
// Retry logic: max 2 retries on JSON parse failure, then return raw text.
// ============================================================

import type { LLMCallParams, LLMCallResult } from './types';
import { SOVERNSTACK_CONFIG } from '../cloud/config';

// ===== Constants =====

const MAX_RETRIES = 2;
const MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 60_000; // 60 second timeout

// ===== Types =====

interface SovernStackMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface SovernStackRequestBody {
  messages: SovernStackMessage[];
  temperature: number;
  max_tokens: number;
}

interface SovernStackResponse {
  id?: string;
  created?: number;
  userId?: string;
  model?: string;
  message: string; // The LLM's response text (may contain JSON)
  finishReason?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ===== Core API Call =====

/**
 * Calls the SovernStack chat API.
 * Returns the raw response object (not yet parsed for JSON).
 */
async function callSovernStackRaw(
  messages: SovernStackMessage[],
  temperature: number,
): Promise<SovernStackResponse> {
  const url = `${SOVERNSTACK_CONFIG.baseUrl}${SOVERNSTACK_CONFIG.endpoint}`;

  const body: SovernStackRequestBody = {
    messages,
    temperature,
    max_tokens: MAX_TOKENS,
  };

  // Use AbortController for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': SOVERNSTACK_CONFIG.apiKey,
        'x-model': SOVERNSTACK_CONFIG.model,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown');
      throw new Error(
        `SovernStack API error: ${response.status} ${response.statusText} — ${errorText}`,
      );
    }

    const data = (await response.json()) as SovernStackResponse;
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ===== JSON Extraction =====

/**
 * Extracts JSON from the LLM response text.
 *
 * The LLM is instructed to return "ONLY raw JSON" but may sometimes:
 *   - Wrap in markdown code fences (```json ... ```)
 *   - Add text before/after the JSON
 *   - Return valid JSON directly
 *
 * This function handles all cases.
 */
function extractJSON(text: string): string {
  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Try to find the first { or [ and last } or ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');

  // Determine if object or array comes first
  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = lastBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    return text.substring(start, end + 1).trim();
  }

  // Fallback: return as-is
  return text.trim();
}

// ===== Main Export =====

/**
 * Calls the SovernStack LLM with the given params.
 *
 * Implements:
 *   - System + user message construction
 *   - JSON extraction and parsing with retry (max 2 retries)
 *   - Returns LLMCallResult compatible with the mock-llm interface
 *
 * If JSON parsing fails after all retries, `parsed` will be null
 * and `content` will contain the raw text response.
 */
export async function sovernStackCall(params: LLMCallParams): Promise<LLMCallResult> {
  const temperature = params.temperature ?? 0.2;
  const startTime = Date.now();

  // Build messages array
  const messages: SovernStackMessage[] = [
    { role: 'system', content: params.systemPrompt },
    { role: 'user', content: params.userPrompt },
  ];

  let lastError: Error | null = null;
  let lastResponse: SovernStackResponse | null = null;

  // Retry loop: initial call + up to MAX_RETRIES retries
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[sovernstack] Retry attempt ${attempt}/${MAX_RETRIES} for JSON parsing...`);
      }

      const response = await callSovernStackRaw(messages, temperature);
      lastResponse = response;

      const rawMessage = response.message ?? '';

      // If responseFormat is not json_object, return raw text
      if (params.responseFormat !== 'json_object') {
        const durationMs = Date.now() - startTime;
        return {
          content: rawMessage,
          parsed: null,
          durationMs,
          model: response.model ?? SOVERNSTACK_CONFIG.model,
          tokensUsed: response.usage?.total_tokens,
        };
      }

      // Extract and parse JSON
      const jsonStr = extractJSON(rawMessage);

      try {
        const parsed = JSON.parse(jsonStr);
        const durationMs = Date.now() - startTime;
        return {
          content: rawMessage,
          parsed,
          durationMs,
          model: response.model ?? SOVERNSTACK_CONFIG.model,
          tokensUsed: response.usage?.total_tokens,
        };
      } catch (parseError) {
        lastError = new Error(
          `JSON parse failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${(parseError as Error).message}`,
        );
        console.warn(`[sovernstack] ${lastError.message}`);
        console.warn(`[sovernstack] Raw response (first 500 chars): ${rawMessage.substring(0, 500)}`);

        // If this is the last attempt, fall through to return raw text below
        if (attempt === MAX_RETRIES) {
          break;
        }

        // For retry: add a correction message instructing the model to return valid JSON
        messages.push({ role: 'assistant', content: rawMessage });
        messages.push({
          role: 'user',
          content:
            'Your previous response could not be parsed as valid JSON. ' +
            'Please return ONLY valid JSON with no markdown, no code fences, no text before or after. ' +
            'Return the JSON object now.',
        });
      }
    } catch (fetchError) {
      // Network/HTTP error — retry if attempts remain
      lastError = fetchError as Error;
      console.warn(`[sovernstack] API call failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${lastError.message}`);

      if (attempt === MAX_RETRIES) {
        break;
      }

      // Wait a bit before retry (exponential backoff: 1s, 2s)
      const waitMs = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  // All retries exhausted — return what we have (or an error result)
  const durationMs = Date.now() - startTime;
  const rawContent = lastResponse?.message ?? '';

  console.error(`[sovernstack] All retries exhausted. Returning fallback.`);

  return {
    content: rawContent || (lastError?.message ?? 'Unknown error'),
    parsed: null, // Caller should handle null parsed — orchestrator will show error
    durationMs,
    model: lastResponse?.model ?? SOVERNSTACK_CONFIG.model,
    tokensUsed: lastResponse?.usage?.total_tokens,
  };
}
