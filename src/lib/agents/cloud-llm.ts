// ============================================================
// Real WorkBuddy Cloud LLM — Production Implementation
// ============================================================
// This file implements LLM calls using the WorkBuddy Cloud SDK.
// It is a drop-in replacement for mock-llm.ts.
//
// Key differences from the mock:
//   - Uses cloud.llm.chat.completions.create() with stream: true
//   - Fetches real model list via cloud.llm.models.list()
//   - Collects SSE chunks and parses JSON from accumulated text
//   - Handles CloudOpenAIError with proper error codes
//
// The interface (LLMCallParams -> LLMCallResult) is identical to
// mock-llm.ts, so the orchestrator and all API routes work
// without changes when switching between mock and real.
//
// Reference: cloud-service skill > references/llm/code-generation.md
// ============================================================

import type { LLMCallParams, LLMCallResult } from './types';
import type {
  RubricResult,
  PlanResult,
  SkillMatchResult,
  RiskAssessment,
  RescuePlan,
  Assignment,
  Task,
  Member,
  DeadlineInfo,
  ProjectProgress,
} from '../../types/types';
import { CLOUD_CONFIG, isCloudConfigured } from '../cloud/config';

// ===== Lazy SDK import (avoids import error when SDK not installed) =====

let cloudClient: ReturnType<typeof getCloudClient> | null = null;
let cachedModelId: string | null = null;

// We use dynamic import so the app doesn't crash if the SDK package
// is not yet installed (during development with mock mode).
async function getCloudClient() {
  const { createWorkBuddyCloud } = await import('@tencent-ai/workbuddy-cloud-sdk');

  return createWorkBuddyCloud({
    endpoint: CLOUD_CONFIG.endpoint,
    publishableKey: CLOUD_CONFIG.publishableKey,
    ...(CLOUD_CONFIG.oauthRelayBaseUrl
      ? { oauthRelayBaseUrl: CLOUD_CONFIG.oauthRelayBaseUrl }
      : {}),
  });
}

async function getCloud() {
  if (!cloudClient) {
    cloudClient = getCloudClient();
  }
  return cloudClient;
}

// ===== Model list (fetch once, cache) =====

async function getModelId(): Promise<string> {
  if (cachedModelId) return cachedModelId;

  const cloud = await getCloud();
  const models = await cloud.llm.models.list();

  if (!models || models.length === 0) {
    throw new Error('[cloud-llm] No models available from cloud service');
  }

  // Pick the first non-disabled model (disabled === true means non-selectable)
  const model = models.find((m: { disabled?: boolean }) => m.disabled !== true);
  if (!model) {
    throw new Error('[cloud-llm] All models are currently disabled');
  }

  cachedModelId = model.id;
  return cachedModelId!;
}

// ===== Real LLM call — streaming SSE collection =====

/**
 * Calls cloud.llm.chat.completions.create() with stream: true.
 * Collects all content deltas and returns the full response.
 *
 * Per the SDK docs:
 * - stream: true is REQUIRED (non-streaming is not supported)
 * - messages[0] must be a system message
 * - For JSON output, use response_format: { type: 'json_object' }
 * - Collect chunk.choices[0]?.delta?.content until stream ends
 */
export async function realLLMCall(params: LLMCallParams): Promise<LLMCallResult> {
  if (!isCloudConfigured()) {
    throw new Error(
      '[cloud-llm] Cloud service not configured. ' +
      'Run workbuddy_cloud_service activate and fill in src/lib/cloud/config.ts.'
    );
  }

  const cloud = await getCloud();
  const modelId = await getModelId();
  const startTime = Date.now();

  let content = '';
  let totalTokens: number | undefined;

  // Build messages — system must be first (required by SDK)
  const messages = [
    { role: 'system' as const, content: params.systemPrompt },
    { role: 'user' as const, content: params.userPrompt },
  ];

  // Build create params — SDK requires stream: true (non-streaming not supported)
  const createParams: {
    model: string;
    messages: { role: 'system' | 'user'; content: string }[];
    stream: true;
    stream_options?: { include_usage: boolean };
    temperature?: number;
    response_format?: { type: 'json_object' };
  } = {
    model: modelId,
    messages,
    stream: true as const,
    stream_options: { include_usage: true },
  };

  if (params.temperature !== undefined) {
    createParams.temperature = params.temperature;
  }

  if (params.responseFormat === 'json_object') {
    createParams.response_format = { type: 'json_object' };
  }

  try {
    // Stream is required — use for-await to consume SSE chunks
    for await (const chunk of cloud.llm.chat.completions.create(createParams)) {
      const delta = chunk.choices?.[0]?.delta;

      // Accumulate content deltas (skip null/empty)
      if (delta?.content) {
        content += delta.content;
      }

      // Capture usage tokens (appears in final chunk when include_usage is set)
      if (chunk.usage?.total_tokens !== undefined) {
        totalTokens = chunk.usage.total_tokens;
      }
    }
  } catch (error: unknown) {
    // CloudOpenAIError has error.code prefix for routing
    const err = error as { error?: { code?: string; message?: string }; requestId?: string };
    const code = err.error?.code ?? 'unknown';
    const message = err.error?.message ?? String(error);

    if (code.startsWith('request_')) {
      throw new Error(`[cloud-llm] Parameter error (${code}): ${message}`);
    } else if (code.startsWith('auth_')) {
      throw new Error(`[cloud-llm] Auth error (${code}): ${message}. Check endpoint/publishableKey.`);
    } else if (code.startsWith('quota_')) {
      throw new Error(`[cloud-llm] Quota error (${code}): ${message}`);
    } else if (code.startsWith('gateway_') || code.startsWith('model_')) {
      throw new Error(`[cloud-llm] Service unavailable (${code}): ${message}. Try again later.`);
    } else {
      throw new Error(`[cloud-llm] Error (${code}): ${message}`);
    }
  }

  const durationMs = Date.now() - startTime;

  // Parse JSON if response_format was json_object
  let parsed: unknown = content;
  if (params.responseFormat === 'json_object' && content) {
    try {
      parsed = JSON.parse(content);
    } catch {
      // If JSON parsing fails, return raw content and let caller handle it
      console.warn('[cloud-llm] Failed to parse JSON response, returning raw content');
      parsed = content;
    }
  }

  return {
    content,
    parsed,
    durationMs,
    model: `workbuddy-cloud-llm (${modelId})`,
    tokensUsed: totalTokens,
  };
}

// ===== Agent-specific call wrappers (same signatures as mock-llm.ts) =====

export async function callRubricAgent(assignment: Assignment): Promise<{
  result: LLMCallResult;
  data: RubricResult;
}> {
  const { buildRubricAgentCall } = await import('./prompts');
  const params = buildRubricAgentCall(assignment);
  const result = await realLLMCall(params);
  return { result, data: result.parsed as RubricResult };
}

export async function callTaskAgent(
  assignment: Assignment,
  rubric: RubricResult
): Promise<{ result: LLMCallResult; data: PlanResult }> {
  const { buildTaskAgentCall } = await import('./prompts');
  const params = buildTaskAgentCall(assignment, rubric);
  const result = await realLLMCall(params);
  return { result, data: result.parsed as PlanResult };
}

export async function callSkillAgent(
  tasks: Task[],
  members: Member[]
): Promise<{ result: LLMCallResult; data: SkillMatchResult }> {
  const { buildSkillAgentCall } = await import('./prompts');
  const params = buildSkillAgentCall(tasks, members);
  const result = await realLLMCall(params);
  return { result, data: result.parsed as SkillMatchResult };
}

export async function callRiskAgent(
  tasks: Task[],
  members: Member[],
  deadline: DeadlineInfo | null,
  progress: ProjectProgress | null
): Promise<{ result: LLMCallResult; data: RiskAssessment }> {
  const { buildRiskAgentCall } = await import('./prompts');
  const params = buildRiskAgentCall(tasks, members, deadline, progress);
  const result = await realLLMCall(params);
  return { result, data: result.parsed as RiskAssessment };
}

export async function callRescueAgent(
  riskAssessment: RiskAssessment,
  tasks: Task[],
  members: Member[]
): Promise<{ result: LLMCallResult; data: RescuePlan }> {
  const { buildRescueAgentCall } = await import('./prompts');
  const params = buildRescueAgentCall(riskAssessment, tasks, members);
  const result = await realLLMCall(params);
  return { result, data: result.parsed as RescuePlan };
}
