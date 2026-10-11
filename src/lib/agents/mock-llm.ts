// ============================================================
// LLM Layer — Mock / Cloud Router (Swappable)
// ============================================================
// This file is the single entry point for all LLM calls.
// It automatically routes to:
//   1. Real WorkBuddy Cloud LLM (cloud-llm.ts) when cloud config is filled in
//   2. SovernStack API (external-llm.ts) when SovernStack API key is set
//   3. Mock LLM (below) as fallback
//
// The interface (LLMCallParams -> LLMCallResult) stays the same,
// so NO other code needs to change when switching.
//
// To activate real LLM:
//   1. Ask AI to run workbuddy_cloud_service with action="activate"
//   2. Copy the returned publicConfig values into src/lib/cloud/config.ts
//   3. That's it — this router will automatically use real LLM.
// ============================================================

import type { LLMCallParams, LLMCallResult } from './types';
import { mockRubric, mockPlanResult, mockSkillMatch, mockRiskAssessment, mockRescuePlan } from '../mock';
import { isCloudConfigured, isSovernStackConfigured, getLLMMode as getConfigLLMMode } from '../cloud/config';
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

// ===== Simulated network latency (ms) =====

const SIMULATED_LATENCY = {
  'rubric-agent': 1800,
  'task-agent': 2400,
  'skill-agent': 1500,
  'risk-agent': 2000,
  'rescue-agent': 2200,
};

// ===== Mock LLM implementation (fallback) =====

function mockLLMCall(params: LLMCallParams, agentId: string): Promise<LLMCallResult> {
  const latency = SIMULATED_LATENCY[agentId as keyof typeof SIMULATED_LATENCY] || 1500;

  return new Promise((resolve) => {
    setTimeout(() => {
      // Determine which mock data to return based on the system prompt text
      let parsed: unknown;

      if (params.systemPrompt.includes('Rubric Intelligence')) {
        parsed = mockRubric;
      } else if (params.systemPrompt.includes('Task Decomposition')) {
        parsed = mockPlanResult;
      } else if (params.systemPrompt.includes('Skill Matching')) {
        parsed = mockSkillMatch;
      } else if (params.systemPrompt.includes('Risk Explainer')) {
        parsed = mockRiskAssessment;
      } else if (params.systemPrompt.includes('Rescue Assistant')) {
        parsed = mockRescuePlan;
      } else {
        // Fallback: match by agentId for safety
        switch (agentId) {
          case 'rubric-agent': parsed = mockRubric; break;
          case 'task-agent': parsed = mockPlanResult; break;
          case 'skill-agent': parsed = mockSkillMatch; break;
          case 'risk-agent': parsed = mockRiskAssessment; break;
          case 'rescue-agent': parsed = mockRescuePlan; break;
          default: parsed = { message: 'Unknown agent type' };
        }
      }

      resolve({
        content: JSON.stringify(parsed, null, 2),
        parsed,
        durationMs: latency,
        model: 'mock-llm (set SovernStack API key in .env to switch to real LLM)',
        tokensUsed: Math.floor(Math.random() * 2000) + 500,
      });
    }, latency);
  });
}

// ===== Router: automatically uses real LLM when configured =====

/**
 * Routes to the appropriate LLM backend:
 *   1. WorkBuddy Cloud SDK (if endpoint + publishableKey set)
 *   2. SovernStack API via external-llm.ts (if API key set)
 *   3. Mock LLM (fallback)
 */
async function routeLLMCall(params: LLMCallParams, agentId: string): Promise<LLMCallResult> {
  if (isCloudConfigured()) {
    // Dynamic import avoids loading the SDK when not needed
    const { realLLMCall } = await import('./cloud-llm');
    return realLLMCall(params);
  }
  if (isSovernStackConfigured()) {
    // Dynamic import avoids loading external-llm.ts when not needed
    const { sovernStackCall } = await import('./external-llm');
    return sovernStackCall(params);
  }
  return mockLLMCall(params, agentId);
}

// ===== Agent-specific call wrappers =====
// These have identical signatures in cloud-llm.ts, so the router
// transparently swaps between mock and real.

export async function callRubricAgent(assignment: Assignment): Promise<{
  result: LLMCallResult;
  data: RubricResult;
}> {
  const { buildRubricAgentCall } = await import('./prompts');
  const params = buildRubricAgentCall(assignment);
  const result = await routeLLMCall(params, 'rubric-agent');
  return { result, data: result.parsed as RubricResult };
}

export async function callTaskAgent(
  assignment: Assignment,
  rubric: RubricResult
): Promise<{ result: LLMCallResult; data: PlanResult }> {
  const { buildTaskAgentCall } = await import('./prompts');
  const params = buildTaskAgentCall(assignment, rubric);
  const result = await routeLLMCall(params, 'task-agent');
  return { result, data: result.parsed as PlanResult };
}

export async function callSkillAgent(
  tasks: Task[],
  members: Member[]
): Promise<{ result: LLMCallResult; data: SkillMatchResult }> {
  const { buildSkillAgentCall } = await import('./prompts');
  const params = buildSkillAgentCall(tasks, members);
  const result = await routeLLMCall(params, 'skill-agent');
  return { result, data: result.parsed as SkillMatchResult };
}

export async function callRiskAgent(
  tasks: Task[],
  members: Member[],
  deadline: DeadlineInfo | null,
  progress: ProjectProgress | null,
  schedulerFacts?: {
    riskStatus: string;
    predictedCompletionDay: number;
    deadlineDay: number;
    delayDays: number;
    delayedTaskIds: string[];
    criticalPath: string[];
    memberLoads: Array<{ memberId: string; memberName: string; remainingWorkHours: number; availableHours: number; isOverloaded: boolean }>;
  }
): Promise<{ result: LLMCallResult; data: RiskAssessment }> {
  const { buildRiskAgentCall } = await import('./prompts');
  const params = buildRiskAgentCall(tasks, members, deadline, progress, schedulerFacts);
  const result = await routeLLMCall(params, 'risk-agent');
  return { result, data: result.parsed as RiskAssessment };
}

export async function callRescueAgent(
  riskAssessment: RiskAssessment,
  tasks: Task[],
  members: Member[],
  leaderReason?: { type: string; memberId?: string; note?: string }
): Promise<{ result: LLMCallResult; data: RescuePlan }> {
  const { buildRescueAgentCall } = await import('./prompts');
  const params = buildRescueAgentCall(riskAssessment, tasks, members, null, leaderReason);
  const result = await routeLLMCall(params, 'rescue-agent');
  return { result, data: result.parsed as RescuePlan };
}

// Export status helper for UI display — delegates to config.ts which reads .env
export function getLLMMode(): 'mock' | 'cloud' | 'sovern' {
  return getConfigLLMMode();
}
