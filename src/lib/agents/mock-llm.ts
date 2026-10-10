// ============================================================
// Mock LLM Layer — Swappable with WorkBuddy Cloud LLM
// ============================================================
// This file simulates LLM calls by returning pre-built mock data.
// When WorkBuddy cloud-service is activated, replace the functions
// below with real cloud.llm.chat.completions.create() calls.
//
// The interface (LLMCallParams → LLMCallResult) stays the same,
// so NO other code needs to change.
// ============================================================

import type { LLMCallParams, LLMCallResult } from './types';
import { mockRubric, mockPlanResult, mockSkillMatch, mockRiskAssessment, mockRescuePlan } from '../mock';
import type { RubricResult, PlanResult, SkillMatchResult, RiskAssessment, RescuePlan } from '../../types/types';

// ===== Simulated network latency (ms) =====

const SIMULATED_LATENCY = {
  'rubric-agent': 1800,
  'task-agent': 2400,
  'skill-agent': 1500,
  'risk-agent': 2000,
  'rescue-agent': 2200,
};

// ===== Mock LLM implementations =====

function mockLLMCall(params: LLMCallParams, agentId: string): Promise<LLMCallResult> {
  const latency = SIMULATED_LATENCY[agentId as keyof typeof SIMULATED_LATENCY] || 1500;

  return new Promise((resolve) => {
    setTimeout(() => {
      // Determine which mock data to return based on the system prompt
      let parsed: unknown;

      if (params.systemPrompt.includes('RubricIntelligence')) {
        parsed = mockRubric;
      } else if (params.systemPrompt.includes('TaskDecomposer')) {
        parsed = mockPlanResult;
      } else if (params.systemPrompt.includes('SkillMatcher')) {
        parsed = mockSkillMatch;
      } else if (params.systemPrompt.includes('RiskDetector')) {
        parsed = mockRiskAssessment;
      } else if (params.systemPrompt.includes('RescuePlanner')) {
        parsed = mockRescuePlan;
      } else {
        parsed = { message: 'Unknown agent type' };
      }

      resolve({
        content: JSON.stringify(parsed, null, 2),
        parsed,
        durationMs: latency,
        model: 'mock-llm (swap for cloud.llm when WorkBuddy is activated)',
        tokensUsed: Math.floor(Math.random() * 2000) + 500,
      });
    }, latency);
  });
}

// ===== Agent-specific call wrappers =====

export async function callRubricAgent(assignment: import('../../types/types').Assignment): Promise<{
  result: LLMCallResult;
  data: RubricResult;
}> {
  const { buildRubricAgentCall } = await import('./prompts');
  const params = buildRubricAgentCall(assignment);
  const result = await mockLLMCall(params, 'rubric-agent');
  return { result, data: result.parsed as RubricResult };
}

export async function callTaskAgent(
  assignment: import('../../types/types').Assignment,
  rubric: RubricResult
): Promise<{ result: LLMCallResult; data: PlanResult }> {
  const { buildTaskAgentCall } = await import('./prompts');
  const params = buildTaskAgentCall(assignment, rubric);
  const result = await mockLLMCall(params, 'task-agent');
  return { result, data: result.parsed as PlanResult };
}

export async function callSkillAgent(
  tasks: import('../../types/types').Task[],
  members: import('../../types/types').Member[]
): Promise<{ result: LLMCallResult; data: SkillMatchResult }> {
  const { buildSkillAgentCall } = await import('./prompts');
  const params = buildSkillAgentCall(tasks, members);
  const result = await mockLLMCall(params, 'skill-agent');
  return { result, data: result.parsed as SkillMatchResult };
}

export async function callRiskAgent(
  tasks: import('../../types/types').Task[],
  members: import('../../types/types').Member[],
  deadline: import('../../types/types').DeadlineInfo | null,
  progress: import('../../types/types').ProjectProgress | null
): Promise<{ result: LLMCallResult; data: RiskAssessment }> {
  const { buildRiskAgentCall } = await import('./prompts');
  const params = buildRiskAgentCall(tasks, members, deadline, progress);
  const result = await mockLLMCall(params, 'risk-agent');
  return { result, data: result.parsed as RiskAssessment };
}

export async function callRescueAgent(
  riskAssessment: RiskAssessment,
  tasks: import('../../types/types').Task[],
  members: import('../../types/types').Member[]
): Promise<{ result: LLMCallResult; data: RescuePlan }> {
  const { buildRescueAgentCall } = await import('./prompts');
  const params = buildRescueAgentCall(riskAssessment, tasks, members);
  const result = await mockLLMCall(params, 'rescue-agent');
  return { result, data: result.parsed as RescuePlan };
}

// ===== Real WorkBuddy LLM (for when cloud-service is activated) =====
// Uncomment and use this when cloud-service is activated:
//
// import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk';
//
// const cloud = createWorkBuddyCloud({
//   endpoint: publicConfig.endpoint,
//   publishableKey: publicConfig.publishableKey,
// });
//
// async function realLLMCall(params: LLMCallParams): Promise<LLMCallResult> {
//   const startTime = Date.now();
//   let content = '';
//
//   for await (const chunk of cloud.llm.chat.completions.create({
//     model: 'model-id-from-list',
//     messages: [
//       { role: 'system', content: params.systemPrompt },
//       { role: 'user', content: params.userPrompt },
//     ],
//     stream: true,
//     temperature: params.temperature ?? 0.3,
//     response_format: params.responseFormat === 'json_object'
//       ? { type: 'json_object' }
//       : undefined,
//   })) {
//     const delta = chunk.choices[0]?.delta?.content;
//     if (delta) content += delta;
//   }
//
//   return {
//     content,
//     parsed: params.responseFormat === 'json_object' ? JSON.parse(content) : content,
//     durationMs: Date.now() - startTime,
//     model: 'workbuddy-cloud-llm',
//   };
// }
