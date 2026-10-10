// ============================================================
// Agent Types — Pipeline orchestration types
// ============================================================

import type {
  RubricResult,
  PlanResult,
  SkillMatchResult,
  CriticalPathResult,
  RiskAssessment,
  RescuePlan,
  Assignment,
  Member,
  ProjectProgress,
  DeadlineInfo,
} from '../../types/types';

// ===== Agent Identity =====

export type AgentId =
  | 'rubric-agent'
  | 'task-agent'
  | 'skill-agent'
  | 'critical-path-agent'
  | 'risk-agent'
  | 'rescue-agent';

export interface AgentInfo {
  id: AgentId;
  name: string;
  icon: string;
  description: string;
  frId: string;
  type: 'llm' | 'deterministic' | 'hybrid';
}

export const AGENTS: AgentInfo[] = [
  { id: 'rubric-agent', name: 'Rubric Intelligence Agent', icon: '📋', description: 'Parse rubric into structured criteria', frId: 'FR-001', type: 'llm' },
  { id: 'task-agent', name: 'Task Decomposition Agent', icon: '🧩', description: 'Break assignment into actionable tasks', frId: 'FR-002', type: 'llm' },
  { id: 'skill-agent', name: 'Skill Matching Agent', icon: '🎯', description: 'Match tasks to team members', frId: 'FR-003', type: 'llm' },
  { id: 'critical-path-agent', name: 'Critical Path Agent', icon: '📊', description: 'Calculate critical path & timeline', frId: 'FR-004', type: 'deterministic' },
  { id: 'risk-agent', name: 'Risk Detection Agent', icon: '⚠️', description: 'Identify at-risk tasks', frId: 'FR-006', type: 'llm' },
  { id: 'rescue-agent', name: 'Rescue Plan Agent', icon: '🛡️', description: 'Generate rescue actions', frId: 'FR-012', type: 'hybrid' },
];

// ===== Pipeline Step State =====

export type StepStatus = 'pending' | 'running' | 'completed' | 'error' | 'skipped';

export interface PipelineStep {
  agent: AgentInfo;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: string; // human-readable summary
  error?: string;
  logs: string[]; // step-by-step execution logs for visibility
}

// ===== Pipeline State =====

export interface PipelineState {
  steps: PipelineStep[];
  currentStepIndex: number;
  isRunning: boolean;
  isComplete: boolean;
  // Accumulated outputs
  assignment: Assignment | null;
  rubric: RubricResult | null;
  plan: PlanResult | null;
  members: Member[];
  skillMatch: SkillMatchResult | null;
  criticalPath: CriticalPathResult | null;
  riskAssessment: RiskAssessment | null;
  rescuePlan: RescuePlan | null;
  progress: ProjectProgress | null;
  deadline: DeadlineInfo | null;
}

// ===== LLM Call Abstraction =====

/**
 * LLM call interface — designed to be swappable.
 * - Current: MockLLM returns mock data
 * - Future: WorkBuddyLLM calls cloud.llm.chat.completions.create()
 */
export interface LLMCallParams {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
}

export interface LLMCallResult {
  content: string;
  parsed: unknown; // JSON-parsed if responseFormat was json_object
  durationMs: number;
  model: string;
  tokensUsed?: number;
}
