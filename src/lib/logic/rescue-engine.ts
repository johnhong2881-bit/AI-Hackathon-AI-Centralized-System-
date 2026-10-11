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
    case 'assign': {
      const toName = toMember?.name ?? op.to ?? 'unknown';
      const hours = op.hours ?? 0;
      return {
        id,
        taskId: op.taskId,
        actionType: 'reassign',
        description: `Assign ${toName} to "${taskTitle}" (${hours}h) — task was previously unassigned`,
        priority,
        estimatedImpact: saved > 0
          ? `Unblocks critical path, predicted end ${before} → ${after} days (saves ${saved}d)`
          : `Assigns ${toName} to unblock this task`,
        assignedTo: op.to ?? null,
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

// ===== Normalize tasks: ensure all required fields exist =====
// Tasks coming from the API may be missing optional fields like
// requiredSkills, dependencies, memberAssignments, etc. — the scheduler
// assumes these are always present, so we fill defaults here.

function normalizeTasks(tasks: Task[]): Task[] {
  return tasks.map(t => ({
    ...t,
    requiredSkills: t.requiredSkills ?? [],
    dependencies: t.dependencies ?? [],
    relatedRubricIds: t.relatedRubricIds ?? [],
    memberAssignments: t.memberAssignments ?? [],
    confirmed: t.confirmed ?? false,
    locked: t.locked ?? false,
    mandatory: t.mandatory ?? false,
    invitationStatus: t.invitationStatus ?? 'pending',
    complexity: t.complexity ?? 'medium',
    priority: t.priority ?? 'medium',
    status: t.status ?? 'todo',
    assignedTo: t.assignedTo ?? null,
    estimatedHours: t.estimatedHours ?? 0,
    order: t.order ?? 0,
    createdAt: t.createdAt ?? new Date().toISOString(),
    updatedAt: t.updatedAt ?? new Date().toISOString(),
  }));
}

// ===== Main rescue workflow =====

export function runRescueWorkflow(params: {
  riskAssessment: RiskAssessment;
  tasks: Task[];
  members: Member[];
  deadline: DeadlineInfo | null;
  leaderReason?: { type: string; memberId?: string; note?: string };
  forceRound?: number;
}): RescuePlan {
  const { riskAssessment, tasks, members, deadline, leaderReason, forceRound } = params;
  const now = new Date().toISOString();

  // --- Normalize tasks to ensure all required fields exist ---
  const normalizedTasks = normalizeTasks(tasks);

  // --- Run scheduler-based rescue search (3 rounds) ---
  const searchResult = planRescueSearch(normalizedTasks, members, deadline, leaderReason, forceRound);

  // --- Case 1: Rescue not needed (project is on track or complete) ---
  if (!searchResult.needed) {
    const totalHours = normalizedTasks.reduce((s, t) => s + t.estimatedHours, 0);
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
        workloadDelta: 0,
        beforeRiskLevel: riskAssessment.overallRiskLevel,
        afterRiskLevel: 'none',
        beforeTasksAtRisk: riskAssessment.flags.length,
        afterTasksAtRisk: 0,
        beforeDeadlineBuffer: Math.max(0, (searchResult.baseAssessment.deadlineDay - searchResult.baseAssessment.predictedCompletionDay) * 8),
        afterDeadlineBuffer: Math.max(0, (searchResult.baseAssessment.deadlineDay - searchResult.baseAssessment.predictedCompletionDay) * 8),
        beforePredictedDay: searchResult.baseAssessment.predictedCompletionDay,
        afterPredictedDay: searchResult.baseAssessment.predictedCompletionDay,
        deadlineDay: searchResult.baseAssessment.deadlineDay,
        improvementSummary: 'No rescue needed — project is on track.',
      },
    };
  }

  // --- Case 2: Rescue needed — find best round ---
  const bestRound = searchResult.rounds.find(r => r.valid) ?? searchResult.rounds[searchResult.rounds.length - 1];
  const baseAssessment = searchResult.baseAssessment;

  // --- Compute after-state by applying ops to a clone ---
  const afterTasks = cloneTasks(normalizedTasks);
  for (const op of bestRound.ops) {
    applyRescueOp(afterTasks, op);
  }
  const deadlineDay = calculateDeadlineDay(deadline);
  const afterAssessment = assessRisk(afterTasks, members, deadlineDay);

  // --- Convert RescueOps to RescueActions ---
  const memberMap = new Map(members.map(m => [m.id, m]));
  const taskMap = new Map(normalizedTasks.map(t => [t.id, t]));

  const actions: RescueAction[] = bestRound.ops.map((op, i) => {
    const task = taskMap.get(op.taskId);
    const fromMember = op.from ? memberMap.get(op.from) : null;
    const toMember = op.to ? memberMap.get(op.to) : null;
    return convertOpToAction(op, i, task, fromMember, toMember, members);
  });

  // --- Build comparison result ---
  // beforeHours = "Original Workload" — only work currently assigned to members (43h)
  // afterHours  = "Proposed Workload" — total remaining work after rescue (56h)
  //   includes newly assigned tasks + any scope reductions
  // The delta (afterHours - beforeHours) shows hidden work the rescue exposed.
  function totalRemainingWork(tasks: Task[]): number {
    return tasks.reduce((sum, t) => {
      if (t.status === 'done') return sum;
      if (t.memberAssignments && t.memberAssignments.length > 0) {
        const assigned = t.memberAssignments
          .filter(a => a.invitationStatus !== 'rejected')
          .reduce((s, a) => s + (a.remainingHours ?? a.estimatedHours), 0);
        return sum + assigned;
      }
      return sum + t.estimatedHours;
    }, 0);
  }

  // Original workload = only work currently assigned to members (excludes unassigned tasks)
  const beforeHours = baseAssessment.memberLoads.reduce((s, m) => s + m.remainingWorkHours, 0);
  // Proposed workload = total remaining work after rescue (includes newly assigned + reductions)
  const afterHours = totalRemainingWork(afterTasks);
  const workloadDelta = Math.round((afterHours - beforeHours) * 10) / 10;
  const hoursSaved = Math.max(0, Math.round((totalRemainingWork(normalizedTasks) - afterHours) * 10) / 10);

  const beforeRiskLevel = riskStatusToLevel(baseAssessment.riskStatus);
  const afterRiskLevel = riskStatusToLevel(afterAssessment.riskStatus);

  const beforeTasksAtRisk = baseAssessment.delayedTaskIds.length;
  const afterTasksAtRisk = afterAssessment.delayedTaskIds.length;

  // Clamp to 0 — negative buffer means "over deadline", display as 0h buffer (not -7936h)
  // The risk level (At Risk / Overdue) already conveys the negative situation
  const beforeBuffer = Math.max(0, Math.round((baseAssessment.deadlineDay - baseAssessment.predictedCompletionDay) * 8 * 10) / 10);
  const afterBuffer = Math.max(0, Math.round((afterAssessment.deadlineDay - afterAssessment.predictedCompletionDay) * 8 * 10) / 10);

  const comparisonResult: RescueComparisonResult = {
    beforeHours: Math.round(beforeHours * 10) / 10,
    afterHours: Math.round(afterHours * 10) / 10,
    hoursSaved,
    workloadDelta,
    beforeRiskLevel,
    afterRiskLevel,
    beforeTasksAtRisk,
    afterTasksAtRisk,
    beforeDeadlineBuffer: beforeBuffer,
    afterDeadlineBuffer: afterBuffer,
    beforePredictedDay: baseAssessment.predictedCompletionDay,
    afterPredictedDay: afterAssessment.predictedCompletionDay,
    deadlineDay,
    improvementSummary: bestRound.valid
      ? `Rescue plan resolves deadline risk in Round ${bestRound.n}: ${bestRound.label}. Predicted end: Day ${bestRound.predictedEnd} (deadline: Day ${deadlineDay}).`
      : bestRound.predictedEnd >= 999
        ? `Rescue plan in Round ${bestRound.n}: ${bestRound.label}. Some tasks remain blocked (unassigned) — consider manual assignment or scope reduction.`
        : `Rescue plan partially improves timeline in Round ${bestRound.n}: ${bestRound.label}. Predicted end: Day ${bestRound.predictedEnd} (still ${Math.max(0, bestRound.predictedEnd - deadlineDay)}d over deadline). Consider manual intervention.`,
  };

  // --- Determine approval needs ---
  const needsLeaderApproval = bestRound.ops.some(op => op.approval);
  const approvalStatus = needsLeaderApproval ? 'pending' : 'approved';

  // --- Build workflow step history (4-step AI Agent flow) ---
  const blockedCount = Object.values(baseAssessment.schedule).filter(n => n.blocked).length;
  const afterBlockedCount = Object.values(afterAssessment.schedule).filter(n => n.blocked).length;
  const stepHistory: RescueStepRecord[] = [
    {
      step: 'diagnose', round: 1, timestamp: now,
      description: 'Diagnosed project health — ran scheduler to assess deadline risk',
      result: `Risk: ${baseAssessment.riskStatus}, predicted day ${baseAssessment.predictedCompletionDay >= 999 ? 'Blocked' : baseAssessment.predictedCompletionDay}, deadline day ${baseAssessment.deadlineDay}, ${baseAssessment.delayedTaskIds.length} tasks delayed, ${blockedCount} blocked${leaderReason ? `, reason: ${leaderReason.type}` : ''}`,
    },
    {
      step: 'plan', round: bestRound.n, timestamp: now,
      description: `Planned rescue operations — 3-round search (reallocate → rebalance → reduce scope)`,
      result: `Best result: Round ${bestRound.n} (${bestRound.label}) with ${bestRound.ops.length} operations${needsLeaderApproval ? ' — leader approval required' : ''}`,
    },
    {
      step: 'simulate', round: bestRound.n, timestamp: now,
      description: `Simulated rescue plan by re-running scheduler on modified task set`,
      result: `Predicted end: ${bestRound.predictedEnd >= 999 ? 'Blocked' : 'Day ' + bestRound.predictedEnd} (${bestRound.valid ? 'meets deadline' : 'still over deadline'}), blocked: ${blockedCount} → ${afterBlockedCount}`,
    },
    {
      step: 'validate', round: bestRound.n, timestamp: now,
      description: 'Self-validated — compared before/after metrics against deadline',
      result: bestRound.valid
        ? `✅ Plan resolves deadline risk (Day ${bestRound.predictedEnd} ≤ Day ${deadlineDay}), ${hoursSaved}h saved`
        : bestRound.predictedEnd >= 999
          ? `⚠️ ${afterBlockedCount} task(s) remain blocked — manual assignment needed`
          : `⚠️ Still ${Math.max(0, bestRound.predictedEnd - deadlineDay)}d over deadline — partial improvement only`,
    },
  ];

  const workflow: RescueWorkflowState = {
    currentStep: 'validate',
    optimizationRound: bestRound.n,
    maxRounds: 3,
    stepHistory,
  };

  // --- Projected recovery ---
  const projectedRecovery = bestRound.valid
    ? `On track for deadline with ~${Math.max(0, afterBuffer / 8).toFixed(0)} day buffer`
    : bestRound.predictedEnd >= 999
      ? `Some tasks remain blocked — manual assignment needed for unassigned tasks`
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
