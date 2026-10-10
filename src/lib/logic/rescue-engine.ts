// ============================================================
// Rescue Engine — Scheduler-Validated 3-Round Rescue Plan
// ============================================================
// Uses planRescueSearch() from scheduler.ts which:
//   1. Runs the resource-constrained scheduler to get baseline
//   2. Tries 3 rounds of increasing aggressiveness:
//      Round 1: Move unstarted work (no approval needed)
//      Round 2: Rebalance accepted work + relax dependencies
//      Round 3: Reduce low-priority scope
//   3. Each round validates by re-running the scheduler
//   4. Stops at first round that meets the deadline
//
// Leader reason (optional) adjusts the search strategy:
//   unavailable → remove all of member's work
//   overloaded → prioritize transferring that member's work
//   slow → increase remaining hours +25%
//   mismatch → focus on skill-mismatched tasks
//   earlier → recalculate with earlier deadline
//
// Spec: docs/WORKBUDDY_AGENT_PROMPTS.md section 6
//       docs/FEATURES_AND_LOGIC.md section 3.5
// ============================================================

import type {
  RiskAssessment,
  Task,
  Member,
  DeadlineInfo,
  RescuePlan,
  RescueAction,
  RescueWorkflowState,
  RescueStepRecord,
  RescueComparisonResult,
  Priority,
  RiskLevel,
} from '../../types/types';
import {
  planRescueSearch,
  assessRisk,
  applyRescueOp,
  calculateDeadlineDay,
  type RescueOp,
} from './scheduler';

// ===== RescueOp → RescueAction conversion =====

function convertOpToAction(
  op: RescueOp,
  index: number,
  task: Task | undefined,
  fromMember: Member | null | undefined,
  toMember: Member | null | undefined,
  members: Member[],
): RescueAction {
  const id = `res-${String(index + 1).padStart(3, '0')}`;
  const taskTitle = task?.title ?? op.taskId;
  const priority: Priority = task?.priority ?? 'medium';
  const before = op.before ?? 0;
  const after = op.after ?? 0;
  const saved = Math.max(0, before - after);

  switch (op.type) {
    case 'move': {
      const fromName = fromMember?.name ?? op.from ?? 'unknown';
      const toName = toMember?.name ?? op.to ?? 'unknown';
      const hours = op.hours ?? 0;
      return {
        id,
        taskId: op.taskId,
        actionType: 'reassign',
        description: `Move ${hours}h of "${taskTitle}" from ${fromName} to ${toName}`,
        priority,
        estimatedImpact: saved > 0
          ? `Reduces ${fromName}'s load, predicted end ${before} → ${after} days (saves ${saved}d)`
          : `Rebalances ${fromName}'s load to ${toName}`,
        assignedTo: op.to ?? null,
      };
    }
    case 'relax': {
      const originalDeps = task?.dependencies.length ?? 0;
      const newDeps = op.deps?.length ?? 0;
      const removed = originalDeps - newDeps;
      return {
        id,
        taskId: op.taskId,
        actionType: 'reorder',
        description: `Relax ${removed} dependency(${removed !== 1 ? 's' : ''}) on "${taskTitle}" to enable parallel work`,
        priority,
        estimatedImpact: saved > 0
          ? `Unblocks parallel work, predicted end ${before} → ${after} days (saves ${saved}d)`
          : `Allows earlier start for downstream tasks`,
        assignedTo: task?.assignedTo ?? null,
      };
    }
    case 'reduce': {
      const hours = op.hours ?? 0;
      return {
        id,
        taskId: op.taskId,
        actionType: 'reduce_scope',
        description: `Reduce scope on "${taskTitle}" by ${hours}h (low priority, non-mandatory)`,
        priority,
        estimatedImpact: saved > 0
          ? `Cuts ${hours}h of work, predicted end ${before} → ${after} days (saves ${saved}d)`
          : `Reduces ${hours}h of low-priority work`,
        assignedTo: task?.assignedTo ?? null,
      };
    }
    default:
      return {
        id,
        taskId: op.taskId,
        actionType: 'escalate',
        description: `Review "${taskTitle}" for manual intervention`,
        priority,
        estimatedImpact: 'Manual review required',
        assignedTo: task?.assignedTo ?? null,
      };
  }
}

// ===== Risk level mapping from scheduler RiskStatus =====

function riskStatusToLevel(status: string): RiskLevel {
  switch (status) {
    case 'Complete': return 'none';
    case 'On Track': return 'low';
    case 'At Risk': return 'high';
    case 'Overdue': return 'high';
    default: return 'low';
  }
}

// ===== Deep clone tasks for after-state computation =====

function cloneTasks(tasks: Task[]): Task[] {
  return JSON.parse(JSON.stringify(tasks));
}

// ===== Main rescue workflow =====

export function runRescueWorkflow(params: {
  riskAssessment: RiskAssessment;
  tasks: Task[];
  members: Member[];
  deadline: DeadlineInfo | null;
  leaderReason?: { type: string; memberId?: string; note?: string };
}): RescuePlan {
  const { riskAssessment, tasks, members, deadline, leaderReason } = params;
  const now = new Date().toISOString();

  // --- Run scheduler-based rescue search (3 rounds) ---
  const searchResult = planRescueSearch(tasks, members, deadline, leaderReason);

  // --- Case 1: Rescue not needed (project is on track or complete) ---
  if (!searchResult.needed) {
    const totalHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
    return {
      assignmentId: riskAssessment.assignmentId,
      actions: [],
      projectedRecovery: 'Project is on track — no rescue needed.',
      confidence: 1.0,
      generatedAt: now,
      requiresLeaderApproval: false,
      approvalStatus: 'approved',
      comparisonResult: {
        beforeHours: totalHours,
        afterHours: totalHours,
        hoursSaved: 0,
        beforeRiskLevel: riskAssessment.overallRiskLevel,
        afterRiskLevel: 'none',
        beforeTasksAtRisk: riskAssessment.flags.length,
        afterTasksAtRisk: 0,
        beforeDeadlineBuffer: Math.max(0, (searchResult.baseAssessment.deadlineDay - searchResult.baseAssessment.predictedCompletionDay) * 8),
        afterDeadlineBuffer: Math.max(0, (searchResult.baseAssessment.deadlineDay - searchResult.baseAssessment.predictedCompletionDay) * 8),
        improvementSummary: 'No rescue needed — project is on track.',
      },
    };
  }

  // --- Case 2: Rescue needed — find best round ---
  const bestRound = searchResult.rounds.find(r => r.valid) ?? searchResult.rounds[searchResult.rounds.length - 1];
  const baseAssessment = searchResult.baseAssessment;

  // --- Compute after-state by applying ops to a clone ---
  const afterTasks = cloneTasks(tasks);
  for (const op of bestRound.ops) {
    applyRescueOp(afterTasks, op);
  }
  const deadlineDay = calculateDeadlineDay(deadline);
  const afterAssessment = assessRisk(afterTasks, members, deadlineDay);

  // --- Convert RescueOps to RescueActions ---
  const memberMap = new Map(members.map(m => [m.id, m]));
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  const actions: RescueAction[] = bestRound.ops.map((op, i) => {
    const task = taskMap.get(op.taskId);
    const fromMember = op.from ? memberMap.get(op.from) : null;
    const toMember = op.to ? memberMap.get(op.to) : null;
    return convertOpToAction(op, i, task, fromMember, toMember, members);
  });

  // --- Build comparison result ---
  const beforeHours = baseAssessment.memberLoads.reduce((s, m) => s + m.remainingWorkHours, 0);
  const afterHours = afterAssessment.memberLoads.reduce((s, m) => s + m.remainingWorkHours, 0);
  const hoursSaved = Math.max(0, Math.round((beforeHours - afterHours) * 10) / 10);

  const beforeRiskLevel = riskStatusToLevel(baseAssessment.riskStatus);
  const afterRiskLevel = riskStatusToLevel(afterAssessment.riskStatus);

  const beforeTasksAtRisk = baseAssessment.delayedTaskIds.length;
  const afterTasksAtRisk = afterAssessment.delayedTaskIds.length;

  const beforeBuffer = Math.round((baseAssessment.deadlineDay - baseAssessment.predictedCompletionDay) * 8 * 10) / 10;
  const afterBuffer = Math.round((afterAssessment.deadlineDay - afterAssessment.predictedCompletionDay) * 8 * 10) / 10;

  const comparisonResult: RescueComparisonResult = {
    beforeHours: Math.round(beforeHours * 10) / 10,
    afterHours: Math.round(afterHours * 10) / 10,
    hoursSaved,
    beforeRiskLevel,
    afterRiskLevel,
    beforeTasksAtRisk,
    afterTasksAtRisk,
    beforeDeadlineBuffer: beforeBuffer,
    afterDeadlineBuffer: afterBuffer,
    improvementSummary: bestRound.valid
      ? `Rescue plan resolves deadline risk in Round ${bestRound.n}: ${bestRound.label}. Predicted end: Day ${bestRound.predictedEnd} (deadline: Day ${deadlineDay}).`
      : `Rescue plan partially improves timeline in Round ${bestRound.n}: ${bestRound.label}. Predicted end: Day ${bestRound.predictedEnd} (still ${Math.max(0, bestRound.predictedEnd - deadlineDay)}d over deadline). Consider manual intervention.`,
  };

  // --- Determine approval needs ---
  const needsLeaderApproval = bestRound.ops.some(op => op.approval);
  const approvalStatus = needsLeaderApproval ? 'pending' : 'approved';

  // --- Build workflow step history ---
  const stepHistory: RescueStepRecord[] = [
    {
      step: 'detect', round: 1, timestamp: now,
      description: 'Ran scheduler to check if rescue is needed',
      result: `Base risk: ${baseAssessment.riskStatus} (predicted day ${baseAssessment.predictedCompletionDay}, deadline day ${baseAssessment.deadlineDay}, ${baseAssessment.delayDays}d delay)`,
    },
    {
      step: 'analyze', round: 1, timestamp: now,
      description: 'Analyzed member loads and delayed tasks',
      result: `${baseAssessment.delayedTaskIds.length} tasks delayed, ${baseAssessment.memberLoads.filter(m => m.isOverloaded).length} members overloaded${leaderReason ? `, leader reason: ${leaderReason.type}` : ''}`,
    },
    {
      step: 'optimize', round: bestRound.n, timestamp: now,
      description: `Ran 3-round rescue search — best result: Round ${bestRound.n}`,
      result: `${bestRound.label}: ${bestRound.ops.length} operations, predicted end Day ${bestRound.predictedEnd} (${bestRound.valid ? 'VALID' : 'PARTIAL'})`,
    },
    {
      step: 'validate', round: bestRound.n, timestamp: now,
      description: 'Re-ran scheduler to validate rescue plan',
      result: bestRound.valid
        ? `✅ Plan meets deadline (Day ${bestRound.predictedEnd} ≤ Day ${deadlineDay})`
        : `⚠️ Plan does not fully meet deadline (Day ${bestRound.predictedEnd} > Day ${deadlineDay}), but improves timeline`,
    },
    {
      step: 'apply', round: bestRound.n, timestamp: now,
      description: 'Determined permission rules',
      result: needsLeaderApproval
        ? 'Leader approval required (ops affect accepted/locked tasks)'
        : 'All actions auto-applied (unstarted work only)',
    },
    {
      step: 'compare', round: bestRound.n, timestamp: now,
      description: 'Generated before/after comparison',
      result: `${hoursSaved}h saved, ${beforeTasksAtRisk} → ${afterTasksAtRisk} tasks at risk, buffer ${beforeBuffer}h → ${afterBuffer}h`,
    },
  ];

  const workflow: RescueWorkflowState = {
    currentStep: 'compare',
    optimizationRound: bestRound.n,
    maxRounds: 3,
    stepHistory,
  };

  // --- Projected recovery ---
  const projectedRecovery = bestRound.valid
    ? `On track for deadline with ~${Math.max(0, afterBuffer / 8).toFixed(0)} day buffer`
    : `Improved but still ${Math.max(0, bestRound.predictedEnd - deadlineDay)}d over deadline — consider manual intervention`;

  // --- Confidence based on validation ---
  const confidence = bestRound.valid ? 0.9 : 0.5;

  return {
    assignmentId: riskAssessment.assignmentId,
    actions,
    projectedRecovery,
    confidence,
    generatedAt: now,
    workflow,
    requiresLeaderApproval: needsLeaderApproval,
    approvalStatus,
    comparisonResult,
  };
}
