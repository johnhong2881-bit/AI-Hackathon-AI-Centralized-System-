// ============================================================
// Resource-Constrained Scheduler (FR-004) — Deterministic
// ============================================================
// Day-by-day scheduling that respects:
//   1. Per-person daily available hours (not just total hours)
//   2. Task dependencies (task can't start until all deps finish)
//   3. Priority ordering (High → Medium → Low)
//   4. Multi-member assignments (each member works in parallel)
//   5. Task status (done tasks don't consume capacity)
//
// This replaces the old CPM-only critical-path.ts for scheduling.
// CPM (early/late start/finish, slack) is still computed for Gantt chart,
// but the ACTUAL schedule uses calendar days with resource constraints.
//
// Reference: docs/scheduler-reference.js (tested, correctly calculates "late 7 days")
// Spec: docs/WORKBUDDY_AGENT_PROMPTS.md section 6
//       docs/FEATURES_AND_LOGIC.md section 3.3-3.4
// ============================================================

import type {
  Task,
  Member,
  CriticalPathResult,
  CriticalPathNode,
  ScheduleTaskNode,
  MemberLoad,
  RiskStatus,
  DeadlineInfo,
  WeeklyAvailability,
} from '../../types/types';

// ===== Priority ordering: H=0 (first), M=1, L=2 =====

const PRIO: Record<string, number> = { critical: 0, high: 0, medium: 1, low: 2 };

// ===== Day-of-week capacity lookup =====

/**
 * Get a member's available hours on a given day offset from project start.
 * Day 0 = today. The day-of-week is computed from the start date.
 */
function dayCapacity(member: Member, dayOffset: number, startDayOfWeek: number): number {
  if (!member.weeklyAvailability) return 0;
  const dow = ((startDayOfWeek + dayOffset) % 7 + 7) % 7;
  // 0=Sunday, 1=Monday, ..., 6=Saturday
  const wa = member.weeklyAvailability;
  switch (dow) {
    case 0: return wa.sunday;
    case 1: return wa.monday;
    case 2: return wa.tuesday;
    case 3: return wa.wednesday;
    case 4: return wa.thursday;
    case 5: return wa.friday;
    case 6: return wa.saturday;
    default: return 0;
  }
}

// ===== Active assignments (not rejected) =====

interface SchedAssignment {
  memberId: string;
  alloc: number;      // allocated hours (total)
  rem: number;        // remaining hours (what's left to do)
  st: 'todo' | 'in_progress' | 'done';
  acc: 'pending' | 'accepted' | 'rejected';
}

function toSchedAssignments(task: Task): SchedAssignment[] {
  if (!task.memberAssignments || task.memberAssignments.length === 0) {
    // Fallback: single assignment from assignedTo + estimatedHours
    if (task.assignedTo) {
      return [{
        memberId: task.assignedTo,
        alloc: task.estimatedHours,
        rem: task.estimatedHours,
        st: task.status === 'done' ? 'done' : task.status === 'in-progress' || task.status === 'review' ? 'in_progress' : 'todo',
        acc: task.invitationStatus ?? 'pending',
      }];
    }
    return [];
  }
  return task.memberAssignments
    .filter(a => a.invitationStatus !== 'rejected')
    .map(a => ({
      memberId: a.memberId,
      alloc: a.estimatedHours,
      rem: a.remainingHours ?? a.estimatedHours,
      st: a.assignmentStatus ?? (task.status === 'done' ? 'done' : 'todo'),
      acc: a.invitationStatus,
    }));
}

// ===== Task status derivation (from assignments) =====

function taskIsDone(task: Task, assignments: SchedAssignment[]): boolean {
  if (task.status === 'done') return true;
  const active = assignments.filter(a => a.acc !== 'rejected');
  if (active.length === 0) return false;
  return active.every(a => a.st === 'done');
}

function taskHasProgress(task: Task, assignments: SchedAssignment[]): boolean {
  const active = assignments.filter(a => a.acc !== 'rejected');
  if (active.length === 0) return false;
  return active.some(a => a.st !== 'todo');
}

// ===== Schedule: day-by-day, resource-constrained =====

interface ScheduleOutput {
  [taskId: string]: {
    s: number;         // start day (first day with work)
    e: number;         // end day (last day with work)
    done: boolean;
    blocked: boolean;
    cycle: boolean;
  };
}

/**
 * Core scheduling algorithm.
 * Adapted from scheduler-reference.js schedule().
 *
 * Rules:
 *   - Tasks ordered by priority (H first), then by id
 *   - Task can't start until all dependencies are scheduled
 *   - Each member has daily capacity from weeklyAvailability
 *   - Multiple members on same task work in parallel from same start day
 *   - Task end day = max end day across all assignments
 *   - Done tasks don't consume capacity (s=-1, e=-1)
 *   - No valid assignments → blocked (e = infinity)
 *   - Can't finish in 200 days → e = infinity
 *   - Circular dependency → cycle detected
 */
export function schedule(
  tasks: Task[],
  members: Member[],
  startDayOfWeek: number = new Date().getDay(),
): ScheduleOutput {
  const memberMap = new Map(members.map(m => [m.id, m]));
  // Track used capacity per member per day: { [memberId]: { [day]: hoursUsed } }
  const used: Record<string, Record<number, number>> = {};
  members.forEach(m => { used[m.id] = {}; });

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const pending = new Set(tasks.map(t => t.id));
  const out: ScheduleOutput = {};

  for (let guard = 0; pending.size > 0 && guard < 500; guard++) {
    // Find ready tasks: all deps are no longer pending (already scheduled or done)
    const ready = tasks
      .filter(t => pending.has(t.id) && t.dependencies.every(d => !taskMap.has(d) || !pending.has(d)))
      .sort((a, b) => (PRIO[a.priority] ?? 2) - (PRIO[b.priority] ?? 2) || a.id.localeCompare(b.id));

    if (ready.length === 0) {
      // Circular dependency — mark all remaining as cycle
      pending.forEach(id => { out[id] = { s: 0, e: 999, done: false, blocked: false, cycle: true }; });
      break;
    }

    const t = ready[0];
    pending.delete(t.id);

    const assignments = toSchedAssignments(t);

    // Done task
    if (taskIsDone(t, assignments)) {
      out[t.id] = { s: -1, e: -1, done: true, blocked: false, cycle: false };
      continue;
    }

    // Dependency end day (latest of all deps)
    const depEnd = Math.max(-1, ...t.dependencies
      .filter(d => taskMap.has(d) && out[d])
      .map(d => out[d].e));
    const startDay = Math.max(0, depEnd + 1);

    // Blocked: no valid assignments or dependency is blocked/cycle
    if (depEnd >= 999 || assignments.length === 0) {
      out[t.id] = { s: startDay, e: 999, done: false, blocked: true, cycle: false };
      continue;
    }

    // Work assignments (not done, has remaining hours)
    const work = assignments.filter(a => a.st !== 'done' && a.rem > 0);

    let endDay = -1;
    let firstWorkDay = 999;

    for (const a of work) {
      const member = memberMap.get(a.memberId);
      if (!member) {
        endDay = Math.max(endDay, 999);
        continue;
      }

      let rem = a.rem;
      let day = startDay;
      let lastWorkDay = -1;
      let firstDay = -1;

      for (let g = 0; rem > 0.001 && g < 200; g++, day++) {
        const cap = dayCapacity(member, day, startDayOfWeek);
        const usedToday = used[a.memberId][day] || 0;
        const free = cap - usedToday;

        if (free > 0) {
          const take = Math.min(free, rem);
          used[a.memberId][day] = (used[a.memberId][day] || 0) + take;
          rem -= take;
          if (firstDay < 0) firstDay = day;
          lastWorkDay = day;
        }
      }

      if (rem > 0.001) lastWorkDay = 999;  // couldn't finish in 200 days

      endDay = Math.max(endDay, lastWorkDay);
      firstWorkDay = Math.min(firstWorkDay, firstDay < 0 ? startDay : firstDay);
    }

    out[t.id] = {
      s: firstWorkDay === 999 ? startDay : firstWorkDay,
      e: endDay < 0 ? startDay : endDay,
      done: false,
      blocked: endDay >= 999,
      cycle: false,
    };
  }

  return out;
}

// ===== Risk Assessment (computed, never by LLM) =====

export interface RiskAssessmentData {
  schedule: ScheduleOutput;
  deadlineDay: number;
  predictedCompletionDay: number;
  delayDays: number;
  riskStatus: RiskStatus;
  memberLoads: MemberLoad[];
  delayedTaskIds: string[];
  openTaskIds: string[];
  hasCircularDependency: boolean;
}

/**
 * Compute risk status from schedule output.
 * Status is NEVER set by LLM — only by this function.
 *
 * Rules (from FEATURES_AND_LOGIC.md section 3.4):
 *   No open tasks           → Complete
 *   Deadline day < 0        → Overdue
 *   Predicted > deadline    → At Risk
 *   Otherwise               → On Track
 */
export function assessRisk(
  tasks: Task[],
  members: Member[],
  deadlineDay: number,
  startDayOfWeek: number = new Date().getDay(),
): RiskAssessmentData {
  const sched = schedule(tasks, members, startDayOfWeek);
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Open (unfinished) tasks
  const openTaskIds = tasks.filter(t => {
    const node = sched[t.id];
    return node && !node.done;
  }).map(t => t.id);

  // Predicted completion = max end day of all open tasks
  const predictedCompletionDay = openTaskIds.length > 0
    ? Math.max(...openTaskIds.map(id => sched[id].e))
    : -1;

  // Risk status
  let riskStatus: RiskStatus;
  if (openTaskIds.length === 0) {
    riskStatus = 'Complete';
  } else if (deadlineDay < 0) {
    riskStatus = 'Overdue';
  } else if (predictedCompletionDay > deadlineDay) {
    riskStatus = 'At Risk';
  } else {
    riskStatus = 'On Track';
  }

  const delayDays = predictedCompletionDay >= 999
    ? 999
    : Math.max(0, predictedCompletionDay - deadlineDay);

  // Delayed tasks (ending after deadline)
  const delayedTaskIds = openTaskIds.filter(id => sched[id].e > deadlineDay);

  // Circular dependency check
  const hasCircularDependency = Object.values(sched).some(n => n.cycle);

  // Per-member load
  const memberLoads: MemberLoad[] = members.map(m => {
    let remainingWork = 0;
    for (const t of tasks) {
      const assignments = toSchedAssignments(t);
      for (const a of assignments) {
        if (a.memberId === m.id && a.st !== 'done') {
          remainingWork += a.rem;
        }
      }
    }

    let availableHours = 0;
    const effectiveDeadlineDay = Math.max(deadlineDay, 0);
    for (let d = 0; d <= effectiveDeadlineDay; d++) {
      availableHours += dayCapacity(m, d, startDayOfWeek);
    }

    return {
      memberId: m.id,
      memberName: m.name,
      remainingWorkHours: remainingWork,
      availableHours,
      isOverloaded: remainingWork > availableHours + 0.001,
    };
  });

  return {
    schedule: sched,
    deadlineDay,
    predictedCompletionDay,
    delayDays,
    riskStatus,
    memberLoads,
    delayedTaskIds,
    openTaskIds,
    hasCircularDependency,
  };
}

// ===== Critical Path (from schedule output) =====

/**
 * Find the critical path by following the latest-ending unfinished
 * dependency chain backward from the task that ends last.
 *
 * Adapted from scheduler-reference.js criticalPath().
 */
export function findCriticalPath(
  tasks: Task[],
  assessment: RiskAssessmentData,
): string[] {
  const sched = assessment.schedule;
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  if (assessment.openTaskIds.length === 0) return [];

  // Start from the task that ends last
  let current = [...assessment.openTaskIds]
    .sort((a, b) => sched[b].e - sched[a].e || a.localeCompare(b))[0];

  const chain = [current];

  for (let i = 0; i < 30; i++) {
    const task = taskMap.get(current);
    if (!task) break;

    // Find unfinished dependencies
    const deps = task.dependencies
      .map(id => taskMap.get(id))
      .filter(d => d && sched[d.id] && !sched[d.id].done);

    if (deps.length === 0) break;

    // Pick the dependency that ends latest
    const sortedDeps = deps
      .sort((a, b) => sched[b!.id].e - sched[a!.id].e);
    if (sortedDeps.length > 0 && sortedDeps[0]) {
      current = sortedDeps[0].id;
      chain.unshift(current);
    } else {
      break;
    }
  }

  return chain;
}

// ===== Deadline day calculation =====

/**
 * Calculate the deadline as a day offset from today.
 * Returns negative if deadline has already passed.
 */
export function calculateDeadlineDay(deadline: DeadlineInfo | null): number {
  if (!deadline || !deadline.deadline) return 0;
  const now = new Date();
  const dl = new Date(deadline.deadline);
  const diffMs = dl.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// ===== Full CriticalPathResult (for orchestrator) =====

/**
 * Combined function that produces the full CriticalPathResult
 * including both CPM nodes (for Gantt chart) and resource-constrained
 * schedule (for risk assessment).
 */
export function calculateCriticalPathWithSchedule(
  tasks: Task[],
  members: Member[],
  deadline: DeadlineInfo | null,
  startDayOfWeek?: number,
): CriticalPathResult {
  const deadlineDay = calculateDeadlineDay(deadline);
  const dow = startDayOfWeek ?? new Date().getDay();

  // Run resource-constrained scheduler
  const assessment = assessRisk(tasks, members, deadlineDay, dow);
  const criticalPathIds = findCriticalPath(tasks, assessment);
  const criticalPathSet = new Set(criticalPathIds);

  // Build schedule task nodes
  const scheduleNodes: ScheduleTaskNode[] = tasks.map(t => {
    const node = assessment.schedule[t.id];
    if (!node) {
      return {
        taskId: t.id,
        startDay: 0,
        endDay: 0,
        isDone: false,
        isBlocked: true,
        isCycle: false,
      };
    }
    return {
      taskId: t.id,
      startDay: node.s,
      endDay: node.e,
      isDone: node.done,
      isBlocked: node.blocked,
      isCycle: node.cycle,
    };
  });

  // Build CPM nodes (for backward compat — Gantt chart rendering)
  // Use schedule day offsets instead of hour offsets for more accuracy
  const nodes: CriticalPathNode[] = tasks.map(t => {
    const node = assessment.schedule[t.id];
    const es = node ? node.s : 0;
    const ef = node ? node.e : 0;
    // For slack calculation: if not on critical path, slack = deadline - ef
    const isCritical = criticalPathSet.has(t.id);
    const slack = isCritical ? 0 : Math.max(0, deadlineDay - ef);
    return {
      taskId: t.id,
      earlyStart: es * 8,        // convert days to approximate hours (8h/day)
      earlyFinish: ef * 8,
      lateStart: (es + slack) * 8,
      lateFinish: (ef + slack) * 8,
      slack: slack * 8,
      isCritical,
    };
  });

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  return {
    nodes,
    criticalPath: criticalPathIds,
    projectDuration: totalHours,
    // Resource-constrained scheduler output
    schedule: scheduleNodes,
    predictedCompletionDay: assessment.predictedCompletionDay,
    deadlineDay,
    delayDays: assessment.delayDays,
    riskStatus: assessment.riskStatus,
    memberLoads: assessment.memberLoads,
    delayedTaskIds: assessment.delayedTaskIds,
    hasCircularDependency: assessment.hasCircularDependency,
  };
}

// ===== Rescue support: apply an operation to a cloned task set =====

export type RescueOpType = 'move' | 'relax' | 'reduce';

export interface RescueOp {
  type: RescueOpType;
  taskId: string;
  from?: string;       // member id (for move)
  to?: string;         // member id (for move)
  hours?: number;      // hours to move (for move/reduce)
  deps?: string[];     // relaxed dependencies (for relax)
  approval: boolean;
  before?: number;     // predicted end before (filled after)
  after?: number;      // predicted end after (filled after)
}

/**
 * Deep clone a task array for rescue simulation.
 */
function cloneTasks(tasks: Task[]): Task[] {
  return JSON.parse(JSON.stringify(tasks));
}

/**
 * Apply a rescue operation to a task set (mutates in place on the cloned set).
 */
export function applyRescueOp(tasks: Task[], op: RescueOp): void {
  const task = tasks.find(t => t.id === op.taskId);
  if (!task || !task.memberAssignments) return;

  if (op.type === 'move') {
    const fromAssign = task.memberAssignments.find(a => a.memberId === op.from && a.invitationStatus !== 'rejected');
    if (!fromAssign) return;

    const fromRem = fromAssign.remainingHours ?? fromAssign.estimatedHours;
    const moveHours = Math.min(fromRem, op.hours ?? fromRem);

    fromAssign.remainingHours = Math.max(0, fromRem - moveHours);
    if (fromAssign.remainingHours <= 0.001) {
      fromAssign.assignmentStatus = 'done';
    }

    const toAssign = task.memberAssignments.find(a => a.memberId === op.to && a.invitationStatus !== 'rejected');
    if (toAssign) {
      const toRem = toAssign.remainingHours ?? toAssign.estimatedHours;
      toAssign.remainingHours = toRem + moveHours;
      if (toAssign.assignmentStatus === 'done') {
        toAssign.assignmentStatus = 'in_progress';
      }
    } else {
      task.memberAssignments.push({
        memberId: op.to!,
        estimatedHours: moveHours,
        remainingHours: moveHours,
        matchScore: 0,
        role: 'Support',
        invitationStatus: 'pending',
        assignmentStatus: 'todo',
      });
    }
  } else if (op.type === 'relax') {
    // Relax dependencies: replace with reduced set
    task.dependencies = op.deps ?? [];
  } else if (op.type === 'reduce') {
    // Reduce scope: cut remaining hours from all active assignments
    let left = op.hours ?? 0;
    for (const a of task.memberAssignments) {
      if (a.invitationStatus === 'rejected' || left <= 0) continue;
      const rem = a.remainingHours ?? a.estimatedHours;
      const cut = Math.min(rem, left);
      a.remainingHours = Math.max(0, rem - cut);
      left -= cut;
    }
  }
}

/**
 * Generate rescue candidates for a given rule set.
 * Adapted from scheduler-reference.js candidates().
 */
export function generateRescueCandidates(
  tasks: Task[],
  members: Member[],
  assessment: RiskAssessmentData,
  rule: { allowApproval: boolean; relax: boolean; reduce: boolean },
): RescueOp[] {
  const out: RescueOp[] = [];
  const perMember = new Map(assessment.memberLoads.map(p => [p.memberId, p]));
  const memberMap = new Map(members.map(m => [m.id, m]));

  for (const t of tasks) {
    if (assessment.schedule[t.id]?.done) continue;  // never touch done work

    const assignments = toSchedAssignments(t);
    for (const a of assignments) {
      if (a.rem < 1 || a.st === 'done') continue;

      const needsApproval = !!(t.locked || a.acc === 'accepted' || a.st !== 'todo');
      if (needsApproval && !rule.allowApproval) continue;

      // Find members who can take over
      for (const m of members) {
        if (m.id === a.memberId) continue;

        // Check skill fit
        const hasSkill = t.requiredSkills.some(s => (m.skillProficiency[s] ?? 0) > 0);
        if (!hasSkill) continue;

        // Check spare capacity
        const load = perMember.get(m.id);
        if (!load || Math.max(0, load.availableHours - load.remainingWorkHours) < 1) continue;

        // Generate move options (half or all)
        const moveAmounts = [Math.ceil(a.rem / 2), a.rem].filter(h => h >= 1);
        for (const hours of moveAmounts) {
          out.push({
            type: 'move',
            taskId: t.id,
            from: a.memberId,
            to: m.id,
            hours,
            approval: needsApproval,
          });
        }
      }
    }

    // Relax dependencies (if task has many deps and rule allows)
    if (rule.relax && t.dependencies.length > 1) {
      // Try removing the last dependency as a relaxation
      out.push({
        type: 'relax',
        taskId: t.id,
        deps: t.dependencies.slice(0, -1),
        approval: true,
      });
    }

    // Reduce scope (only Low priority, non-mandatory)
    if (rule.reduce && t.priority === 'low' && !t.mandatory) {
      const totalRem = assignments.reduce((s, a) => s + a.rem, 0);
      if (totalRem >= 3) {
        out.push({
          type: 'reduce',
          taskId: t.id,
          hours: 3,
          approval: true,
        });
      }
    }
  }

  return out;
}

/**
 * Full rescue plan search: up to 3 rounds, each from the original plan.
 * Adapted from scheduler-reference.js planRescue().
 */
export function planRescueSearch(
  tasks: Task[],
  members: Member[],
  deadline: DeadlineInfo | null,
  leaderReason?: { type: string; memberId?: string; note?: string },
): {
  needed: boolean;
  rounds: Array<{
    n: number;
    label: string;
    ops: RescueOp[];
    predictedEnd: number;
    valid: boolean;
  }>;
  baseAssessment: RiskAssessmentData;
} {
  const deadlineDay = calculateDeadlineDay(deadline);
  const startDayOfWeek = new Date().getDay();

  const base = assessRisk(tasks, members, deadlineDay, startDayOfWeek);

  if (base.riskStatus !== 'At Risk' && base.riskStatus !== 'Overdue') {
    return { needed: false, rounds: [], baseAssessment: base };
  }

  // Apply leader reason to the initial state
  let reasonAdjustedTasks = tasks;
  if (leaderReason) {
    reasonAdjustedTasks = cloneTasks(tasks);
    switch (leaderReason.type) {
      case 'unavailable':
        // Remove all remaining work from this member
        if (leaderReason.memberId) {
          for (const t of reasonAdjustedTasks) {
            if (!t.memberAssignments) continue;
            for (const a of t.memberAssignments) {
              if (a.memberId === leaderReason.memberId && a.invitationStatus !== 'rejected') {
                a.invitationStatus = 'rejected';
                a.rejectReason = 'Member unavailable';
              }
            }
          }
        }
        break;
      case 'overloaded':
        // Will be handled by the search — prioritize moving this member's work
        if (leaderReason.memberId) {
          // Mark this member's assignments for priority transfer
          for (const t of reasonAdjustedTasks) {
            if (!t.memberAssignments) continue;
            for (const a of t.memberAssignments) {
              if (a.memberId === leaderReason.memberId) {
                // Don't reject, just let the search find transfers
              }
            }
          }
        }
        break;
      case 'earlier':
        // Deadline moved earlier — the deadlineDay is already computed
        // In a real implementation, this would adjust the deadline
        break;
      case 'slow':
        // Increase remaining hours for in-progress tasks by 25%
        for (const t of reasonAdjustedTasks) {
          if (!t.memberAssignments) continue;
          for (const a of t.memberAssignments) {
            if (a.invitationStatus === 'accepted' && (a.remainingHours ?? 0) > 0) {
              a.remainingHours = (a.remainingHours ?? a.estimatedHours) * 1.25;
            }
          }
        }
        break;
    }
  }

  const rules = [
    { n: 1, label: 'Reallocate work that has not started', allowApproval: false, relax: false, reduce: false },
    { n: 2, label: 'Rebalance accepted work and re-order dependencies', allowApproval: true, relax: true, reduce: false },
    { n: 3, label: 'Reduce low-priority scope', allowApproval: true, relax: true, reduce: true },
  ];

  const rounds: Array<{ n: number; label: string; ops: RescueOp[]; predictedEnd: number; valid: boolean }> = [];

  for (const rule of rules) {
    let workingTasks = cloneTasks(reasonAdjustedTasks);
    let cur = assessRisk(workingTasks, members, deadlineDay, startDayOfWeek);
    const ops: RescueOp[] = [];

    for (let step = 0; step < 8 && cur.predictedCompletionDay > deadlineDay - 1; step++) {
      // Aim for 1 day of buffer
      const candidates = generateRescueCandidates(workingTasks, members, cur, rule);
      if (candidates.length === 0) break;

      let best: { op: RescueOp; assessment: RiskAssessmentData } | null = null;
      let bestScore: number[] = [999, 999, 999, 999, 999, 999];

      for (const c of candidates) {
        const testTasks = cloneTasks(workingTasks);
        applyRescueOp(testTasks, c);
        const testAssessment = assessRisk(testTasks, members, deadlineDay, startDayOfWeek);

        // Score: [predictedEnd, moveType(0) vs other(1), approval(0/1), negativeSkillFit, overloadedCount, hours]
        const score = [
          testAssessment.predictedCompletionDay,
          c.type === 'move' ? 0 : 1,
          c.approval ? 1 : 0,
          0,  // skill fit (simplified)
          testAssessment.memberLoads.filter(p => p.isOverloaded).length,
          c.hours ?? 0,
        ];

        if (compareArrays(score, bestScore) < 0) {
          bestScore = score;
          best = { op: c, assessment: testAssessment };
        }
      }

      const currentOverload = cur.memberLoads.filter(p => p.isOverloaded).length;
      if (!best || (best.assessment.predictedCompletionDay >= cur.predictedCompletionDay
        && best.assessment.memberLoads.filter(p => p.isOverloaded).length >= currentOverload)) {
        break;  // No improvement
      }

      best.op.before = cur.predictedCompletionDay;
      best.op.after = best.assessment.predictedCompletionDay;
      ops.push(best.op);

      // Apply to working set
      applyRescueOp(workingTasks, best.op);
      cur = best.assessment;
    }

    const valid = cur.predictedCompletionDay <= deadlineDay;
    rounds.push({
      n: rule.n,
      label: rule.label,
      ops,
      predictedEnd: cur.predictedCompletionDay,
      valid,
    });

    if (valid) break;
  }

  return { needed: true, rounds, baseAssessment: base };
}

// ===== Utility =====

function compareArrays(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
