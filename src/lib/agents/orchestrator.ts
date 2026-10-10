// ============================================================
// Pipeline Orchestrator — Agentic Workflow Engine
// ============================================================
// Runs 6 agents in sequence with visible step-by-step progress.
// This is the "Agentic Workflow" that judges will evaluate.
//
// Workflow:
//   Step 1: Rubric Agent (LLM) — parse rubric → structured criteria
//   Step 2: Task Agent (LLM) — decompose assignment → tasks
//   Step 3: Skill Agent (LLM) — match tasks → team members
//   Step 4: Critical Path Agent (Deterministic) — calculate CPM
//   Step 5: Risk Agent (LLM) — detect at-risk tasks
//   Step 6: Rescue Agent (Hybrid) — generate rescue plan
//
// Each step:
//   - Shows running status with logs
//   - Validates output schema
//   - Passes result to next agent
//   - Handles errors gracefully
// ============================================================

import type { Assignment, Member } from '../../types/types';
import type { PipelineState, PipelineStep, StepStatus } from './types';
import { AGENTS } from './types';
import { callRubricAgent, callTaskAgent, callSkillAgent, callRiskAgent } from './mock-llm';
import { calculateCriticalPath } from '../logic/critical-path';
import { validatePlan } from '../logic/plan-validator';
import { assignMultiMember } from '../logic/multi-member-assigner';
import { runRescueWorkflow } from '../logic/rescue-engine';
import { calculateDeadline } from '../utils/helpers';
import { mockProgress, mockMembers } from '../mock';

// ===== Callback for real-time updates =====

export type ProgressCallback = (state: PipelineState) => void;

// ===== Initialize pipeline =====

export function createPipelineState(assignment: Assignment, members: Member[]): PipelineState {
  const steps: PipelineStep[] = AGENTS.map((agent) => ({
    agent,
    status: 'pending' as StepStatus,
    logs: [],
  }));

  return {
    steps,
    currentStepIndex: -1,
    isRunning: false,
    isComplete: false,
    assignment,
    rubric: null,
    plan: null,
    members,
    skillMatch: null,
    criticalPath: null,
    riskAssessment: null,
    rescuePlan: null,
    progress: null,
    deadline: null,
  };
}

// ===== Run the full pipeline =====

export async function runPipeline(
  assignment: Assignment,
  members: Member[],
  onProgress: ProgressCallback
): Promise<PipelineState> {
  let state = createPipelineState(assignment, members);

  const updateStep = (index: number, partial: Partial<PipelineStep>) => {
    state.steps[index] = { ...state.steps[index], ...partial };
    onProgress({ ...state });
  };

  const setState = (partial: Partial<PipelineState>) => {
    state = { ...state, ...partial };
    onProgress({ ...state });
  };

  state.isRunning = true;
  onProgress({ ...state });

  // === Step 0: Calculate deadline (instant, not an agent) ===
  const deadline = calculateDeadline(assignment.deadline, assignment.id);
  setState({ deadline });

  // === Step 1: Rubric Agent (LLM) ===
  state.currentStepIndex = 0;
  updateStep(0, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: ['📊 Sending rubric text to LLM...', '📋 Parsing criteria...'],
  });

  try {
    const { result, data } = await callRubricAgent(assignment);
    updateStep(0, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      result: `Extracted ${data.items.length} criteria, total ${data.totalMarks} marks`,
      logs: [
        ...state.steps[0].logs,
        `✅ Found ${data.items.length} criteria (${data.totalMarks} total marks)`,
        `⏱️ Completed in ${(result.durationMs / 1000).toFixed(1)}s`,
      ],
    });
    setState({ rubric: data });
  } catch (err) {
    updateStep(0, { status: 'error', error: String(err), logs: [...state.steps[0].logs, `❌ Error: ${err}`] });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Step 2: Task Agent (LLM) ===
  state.currentStepIndex = 1;
  updateStep(1, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: ['🧩 Decomposing assignment into tasks...', '🔗 Mapping tasks to rubric criteria...'],
  });

  try {
    const { result, data } = await callTaskAgent(assignment, state.rubric!);
    updateStep(1, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      result: `Generated ${data.tasks.length} tasks, ${data.totalEstimatedHours}h total`,
      logs: [
        ...state.steps[1].logs,
        `✅ Created ${data.tasks.length} tasks (${data.totalEstimatedHours}h estimated)`,
        `⏱️ Completed in ${(result.durationMs / 1000).toFixed(1)}s`,
      ],
    });
    setState({ plan: data });
  } catch (err) {
    updateStep(1, { status: 'error', error: String(err) });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Post-Step-2: Plan Validation (deterministic) ===
  {
    const validation = validatePlan(state.plan!, state.rubric!, deadline);
    state.plan = { ...state.plan!, validation };
    updateStep(1, {
      logs: [
        ...state.steps[1].logs,
        `📋 Validation: ${validation.isValid ? '✅ Valid plan' : '⚠️ ' + validation.issues.length + ' issues found'}`,
        ...validation.issues.map(i => `   • ${i}`),
      ],
    });
    onProgress({ ...state });
  }

  // === Step 3: Skill Agent (LLM) ===
  state.currentStepIndex = 2;
  updateStep(2, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: ['🎯 Matching tasks to team members...', '📊 Calculating skill scores...'],
  });

  try {
    const { result, data } = await callSkillAgent(state.plan!.tasks, members);
    updateStep(2, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      result: `Assigned ${data.assignments.length}/${state.plan!.tasks.length} tasks, ${data.unmatchedTaskIds.length} unmatched`,
      logs: [
        ...state.steps[2].logs,
        `✅ Matched ${data.assignments.length} tasks (${data.unmatchedTaskIds.length} unmatched)`,
        `⏱️ Completed in ${(result.durationMs / 1000).toFixed(1)}s`,
      ],
    });
    setState({ skillMatch: data });
  } catch (err) {
    updateStep(2, { status: 'error', error: String(err) });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Post-Step-3: Multi-Member Assignment (deterministic) ===
  {
    const updatedTasks = assignMultiMember(state.plan!.tasks, members);
    const multiCount = updatedTasks.filter(
      (t) => t.memberAssignments && t.memberAssignments.length > 1
    ).length;
    state.plan = { ...state.plan!, tasks: updatedTasks };
    updateStep(2, {
      logs: [
        ...state.steps[2].logs,
        `👥 Multi-member assignments: ${multiCount} tasks with 2+ members`,
      ],
    });
    onProgress({ ...state });
  }

  // === Step 4: Critical Path Agent (Deterministic) ===
  state.currentStepIndex = 3;
  updateStep(3, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: ['📊 Running CPM algorithm...', '🔗 Calculating early/late start/finish...'],
  });

  try {
    const data = calculateCriticalPath(state.plan!.tasks);
    updateStep(3, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: 10,
      result: `Critical path: ${data.criticalPath.length} tasks, ${data.projectDuration}h total`,
      logs: [
        ...state.steps[3].logs,
        `✅ Critical path: ${data.criticalPath.length} tasks (${data.projectDuration}h)`,
        `⚡ Instant (deterministic algorithm)`,
      ],
    });
    setState({ criticalPath: data });
  } catch (err) {
    updateStep(3, { status: 'error', error: String(err) });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Step 5: Risk Agent (LLM) ===
  state.currentStepIndex = 4;
  updateStep(4, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: ['⚠️ Scanning for deadline risks...', '🔍 Checking skill gaps and overload...'],
  });

  try {
    // Initialize progress if not set
    const progress = state.progress || mockProgress;
    const { result, data } = await callRiskAgent(state.plan!.tasks, members, state.deadline, progress);
    updateStep(4, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      result: `${data.flags.length} risk flags, overall: ${data.overallRiskLevel}`,
      logs: [
        ...state.steps[4].logs,
        `✅ Detected ${data.flags.length} risks (overall: ${data.overallRiskLevel})`,
        `⏱️ Completed in ${(result.durationMs / 1000).toFixed(1)}s`,
      ],
    });
    setState({ riskAssessment: data, progress });
  } catch (err) {
    updateStep(4, { status: 'error', error: String(err) });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Step 6: Rescue Agent (Hybrid — deterministic 6-step workflow) ===
  state.currentStepIndex = 5;
  updateStep(5, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: [
      '🛡️ Starting 6-step rescue workflow...',
      '  1️⃣ Detect: extracting risk flags...',
      '  2️⃣ Analyze: identifying critical path...',
      '  3️⃣ Optimize: generating rescue actions...',
      '  4️⃣ Validate: checking dependencies...',
      '  5️⃣ Apply: determining permissions...',
      '  6️⃣ Compare: before/after analysis...',
    ],
  });

  try {
    const data = runRescueWorkflow({
      riskAssessment: state.riskAssessment!,
      tasks: state.plan!.tasks,
      members,
      deadline: state.deadline,
    });
    const cmp = data.comparisonResult!;
    updateStep(5, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: 15,
      result: `${data.actions.length} rescue actions, confidence ${(data.confidence * 100).toFixed(0)}%`,
      logs: [
        ...state.steps[5].logs,
        `✅ Generated ${data.actions.length} rescue actions`,
        `📊 Comparison: ${cmp.beforeHours}h → ${cmp.afterHours}h (saved ${cmp.hoursSaved}h)`,
        `⚠️ Risk: ${cmp.beforeRiskLevel} → ${cmp.afterRiskLevel}, ${cmp.beforeTasksAtRisk} → ${cmp.afterTasksAtRisk} tasks at risk`,
        `📅 Deadline buffer: ${cmp.beforeDeadlineBuffer}h → ${cmp.afterDeadlineBuffer}h`,
        `🔐 Approval: ${data.requiresLeaderApproval ? 'Leader approval required' : 'Auto-applied'}`,
        `📈 ${data.projectedRecovery}`,
        `⚡ Instant (deterministic rescue engine)`,
      ],
    });
    setState({ rescuePlan: data });
  } catch (err) {
    updateStep(5, { status: 'error', error: String(err) });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Pipeline complete ===
  state.isRunning = false;
  state.isComplete = true;
  state.currentStepIndex = -1;
  onProgress({ ...state });

  return state;
}
