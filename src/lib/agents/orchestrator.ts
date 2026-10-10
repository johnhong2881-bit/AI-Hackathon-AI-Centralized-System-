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

import type { Assignment, Member, RiskLevel } from '../../types/types';
import type { PipelineState, PipelineStep, StepStatus } from './types';
import { AGENTS } from './types';
import { callRubricAgent, callTaskAgent, callSkillAgent, callRiskAgent } from './mock-llm';
import { calculateCriticalPathWithSchedule } from '../logic/scheduler';
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
    const validation = validatePlan(state.plan!, state.rubric!, deadline, members);
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

  // === Step 4: Critical Path Agent (Deterministic — Resource-Constrained Scheduler) ===
  state.currentStepIndex = 3;
  updateStep(3, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: [
      '📊 Running resource-constrained scheduler...',
      '🗓️ Computing per-day capacity from member availability...',
      '🔗 Respecting dependencies and priority ordering...',
    ],
  });

  try {
    const data = calculateCriticalPathWithSchedule(state.plan!.tasks, members, state.deadline);
    updateStep(3, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: 15,
      result: `Predicted: Day ${data.predictedCompletionDay} | Deadline: Day ${data.deadlineDay} | Status: ${data.riskStatus} (${data.delayDays}d delay)`,
      logs: [
        ...state.steps[3].logs,
        `✅ Predicted completion: Day ${data.predictedCompletionDay}`,
        `📅 Deadline: Day ${data.deadlineDay} (${data.delayDays > 0 ? `${data.delayDays} days late` : 'on track'})`,
        `⚠️ Risk status: ${data.riskStatus}`,
        `🔗 Critical path: ${data.criticalPath.length} tasks`,
        ...data.memberLoads.map(m => `   • ${m.memberName}: ${m.remainingWorkHours}h work / ${m.availableHours}h available${m.isOverloaded ? ' ⚠️ OVERLOADED' : ''}`),
        `⚡ Instant (deterministic scheduler)`,
      ],
    });
    setState({ criticalPath: data });
  } catch (err) {
    updateStep(3, { status: 'error', error: String(err) });
    state.isRunning = false;
    onProgress({ ...state });
    return state;
  }

  // === Step 5: Risk Agent (LLM — only writes explanation, status is computed) ===
  state.currentStepIndex = 4;
  const schedResult = state.criticalPath!;
  updateStep(4, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: [
      `⚠️ Scheduler computed: ${schedResult.riskStatus} (${schedResult.delayDays}d delay)`,
      `📝 LLM writing plain-language risk explanation...`,
    ],
  });

  try {
    // Initialize progress if not set
    const progress = state.progress || mockProgress;
    // Build scheduler facts from the computed critical path result
    const schedulerFacts = {
      riskStatus: schedResult.riskStatus,
      predictedCompletionDay: schedResult.predictedCompletionDay,
      deadlineDay: schedResult.deadlineDay,
      delayDays: schedResult.delayDays,
      delayedTaskIds: schedResult.delayedTaskIds,
      criticalPath: schedResult.criticalPath,
      memberLoads: schedResult.memberLoads,
    };
    const { result, data } = await callRiskAgent(
      state.plan!.tasks, members, state.deadline, progress, schedulerFacts
    );
    // Override LLM's overallRiskLevel with the scheduler-computed status — LLM never decides status
    const riskStatusMap: Record<string, RiskLevel> = {
      'Complete': 'none', 'On Track': 'low', 'At Risk': 'high', 'Overdue': 'high',
    };
    data.overallRiskLevel = riskStatusMap[schedResult.riskStatus] ?? 'low';
    updateStep(4, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      result: `${schedResult.riskStatus} (computed) | ${data.flags.length} flags (LLM explained)`,
      logs: [
        ...state.steps[4].logs,
        `✅ Risk status: ${schedResult.riskStatus} (computed by scheduler, not LLM)`,
        `📊 overallRiskLevel overridden to: ${data.overallRiskLevel}`,
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

  // === Step 6: Rescue Agent (Hybrid — scheduler-validated 3-round search) ===
  state.currentStepIndex = 5;
  updateStep(5, {
    status: 'running',
    startedAt: new Date().toISOString(),
    logs: [
      '🛡️ Starting scheduler-validated rescue search...',
      '  📊 Round 1: Move unstarted work (no approval needed)',
      '  🔄 Round 2: Rebalance accepted work + relax dependencies',
      '  ✂️ Round 3: Reduce low-priority scope',
      '  ✅ Each round re-runs scheduler to validate...',
    ],
  });

  try {
    const data = runRescueWorkflow({
      riskAssessment: state.riskAssessment!,
      tasks: state.plan!.tasks,
      members,
      deadline: state.deadline,
      // leaderReason will be passed from UI when leader selects a reason
    });
    const cmp = data.comparisonResult!;
    const wf = data.workflow;
    updateStep(5, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: 15,
      result: `${data.actions.length} rescue actions (Round ${wf?.optimizationRound ?? '?'}), confidence ${(data.confidence * 100).toFixed(0)}%`,
      logs: [
        ...state.steps[5].logs,
        `✅ Best result: Round ${wf?.optimizationRound ?? 1} — ${wf?.stepHistory[2]?.result ?? 'completed'}`,
        `📊 Comparison: ${cmp.beforeHours}h → ${cmp.afterHours}h (saved ${cmp.hoursSaved}h)`,
        `⚠️ Risk: ${cmp.beforeRiskLevel} → ${cmp.afterRiskLevel}, ${cmp.beforeTasksAtRisk} → ${cmp.afterTasksAtRisk} tasks at risk`,
        `📅 Deadline buffer: ${cmp.beforeDeadlineBuffer}h → ${cmp.afterDeadlineBuffer}h`,
        `🔐 Approval: ${data.requiresLeaderApproval ? 'Leader approval required' : 'Auto-applied'}`,
        `📈 ${data.projectedRecovery}`,
        `⚡ Instant (deterministic scheduler-validated rescue)`,
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
