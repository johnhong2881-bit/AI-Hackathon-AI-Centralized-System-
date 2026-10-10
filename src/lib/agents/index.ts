// Barrel exports for agents module
// LLM agent layer: prompts, mock-llm, orchestrator, agent types
// Deterministic logic (critical-path, plan-validator, rescue-engine, etc.)
// has been moved to src/lib/logic/ — re-exported here for backward compat.

export { AGENTS } from './types';
export type { AgentId, AgentInfo, PipelineStep, PipelineState, StepStatus, LLMCallParams, LLMCallResult } from './types';
export { runPipeline, createPipelineState } from './orchestrator';
export type { ProgressCallback } from './orchestrator';

// Re-export deterministic logic from ../logic/ for backward compatibility
export { calculateCriticalPath } from '../logic/critical-path';
export { validatePlan } from '../logic/plan-validator';
export { runRescueWorkflow } from '../logic/rescue-engine';
export { calculateRescueComparison } from '../logic/rescue-comparison';
export { assignMultiMember } from '../logic/multi-member-assigner';

export {
  RUBRIC_AGENT_SYSTEM, RUBRIC_AGENT_USER,
  TASK_AGENT_SYSTEM, TASK_AGENT_USER,
  SKILL_AGENT_SYSTEM, SKILL_AGENT_USER,
  RISK_AGENT_SYSTEM, RISK_AGENT_USER,
  RESCUE_AGENT_SYSTEM, RESCUE_AGENT_USER,
  buildRubricAgentCall, buildTaskAgentCall, buildSkillAgentCall, buildRiskAgentCall, buildRescueAgentCall,
} from './prompts';
export type { BeforeAfterData } from './prompts';
export { callRubricAgent, callTaskAgent, callSkillAgent, callRiskAgent, callRescueAgent, getLLMMode } from './mock-llm';
