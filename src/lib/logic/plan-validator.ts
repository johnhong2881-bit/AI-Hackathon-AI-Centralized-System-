// ============================================================
// Plan Validator — Pre-assignment structural checks
// ============================================================
// Runs AFTER Task Decomposition (Step 2) but BEFORE Skill Matching (Step 3).
// At this point tasks have no memberAssignments yet, so we do a
// rough capacity check: total task hours vs total team capacity.
// The REAL feasibility check happens later in Step 4 (scheduler)
// which accounts for dependencies, per-day availability, and skill matching.
//
// Checks:
//   1. rubricCoverageComplete — every rubric item has at least 1 task
//   2. allTasksHaveMembers — no task is left unassigned (pre-check)
//   3. noCircularDependencies — Kahn's algorithm
//   4. deadlineFeasible — team capacity vs total hours (rough pre-check)
// ============================================================

import type { PlanResult, RubricResult, DeadlineInfo, PlanValidationResult, Member } from '../../types/types';

export function validatePlan(
  plan: PlanResult,
  rubric: RubricResult,
  deadline: DeadlineInfo,
  members?: Member[],
): PlanValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check 1: rubricCoverageComplete
  const coveredIds = new Set<string>();
  for (const task of plan.tasks) {
    for (const id of task.relatedRubricIds) {
      coveredIds.add(id);
    }
  }
  const uncoveredRubricIds = rubric.items
    .map((item) => item.id)
    .filter((id) => !coveredIds.has(id));
  const rubricCoverageComplete = uncoveredRubricIds.length === 0;
  if (!rubricCoverageComplete) {
    issues.push(`Rubric items not covered by any task: ${uncoveredRubricIds.join(', ')}`);
    suggestions.push('Add tasks that address the uncovered rubric items or link existing tasks to them.');
  }

  // Check 2: allTasksHaveMembers (pre-check — will be properly assigned in Step 3)
  const unassignedTasks = plan.tasks.filter(
    (t) => t.assignedTo === null && (!t.memberAssignments || t.memberAssignments.length === 0),
  );
  const allTasksHaveMembers = unassignedTasks.length === 0;
  if (!allTasksHaveMembers) {
    // Not a failure at this stage — tasks haven't been through skill matching yet
    // Just a warning
    suggestions.push(`${unassignedTasks.length} tasks without assigned members — will be resolved by Skill Matching (Step 3).`);
  }

  // Check 3: noCircularDependencies (Kahn's algorithm)
  const taskIds = new Set(plan.tasks.map((t) => t.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const task of plan.tasks) {
    inDegree.set(task.id, 0);
    adjacency.set(task.id, []);
  }
  for (const task of plan.tasks) {
    for (const depId of task.dependencies) {
      if (taskIds.has(depId)) {
        adjacency.get(depId)!.push(task.id);
        inDegree.set(task.id, inDegree.get(task.id)! + 1);
      }
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processed++;
    for (const neighbor of adjacency.get(current) || []) {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }
  const noCircularDependencies = processed === plan.tasks.length;
  if (!noCircularDependencies) {
    issues.push('Circular dependencies detected in task dependency graph.');
    suggestions.push('Remove or break circular dependencies by reordering task relationships.');
  }

  // Check 4: deadlineFeasible — team capacity vs total task hours (rough pre-check)
  // This is a ROUGH check because:
  //   - Tasks don't have member assignments yet (skill matching hasn't run)
  //   - It doesn't account for dependencies (sequential work can't parallelize)
  //   - It doesn't account for per-day availability constraints
  // The REAL check happens in Step 4 (resource-constrained scheduler)
  let deadlineFeasible: boolean;
  let feasibilityNote = '';

  if (deadline.isOverdue) {
    deadlineFeasible = false;
    issues.push(`Deadline has already passed (${deadline.daysRemaining} days ago).`);
    suggestions.push('Request a deadline extension or reduce scope drastically.');
  } else if (members && members.length > 0) {
    // Compute total team capacity: sum of (member weekly availability × weeks remaining)
    const weeksRemaining = deadline.daysRemaining / 7;
    const totalTeamCapacity = members.reduce((sum, m) => {
      if (m.weeklyAvailability) {
        // Sum daily availability for a week
        const weeklyHours = m.weeklyAvailability.monday + m.weeklyAvailability.tuesday +
          m.weeklyAvailability.wednesday + m.weeklyAvailability.thursday +
          m.weeklyAvailability.friday + m.weeklyAvailability.saturday +
          m.weeklyAvailability.sunday;
        return sum + (weeklyHours * weeksRemaining);
      }
      return sum + (m.availability * weeksRemaining);
    }, 0);

    // Rough estimate: tasks can parallelize across members, but dependencies force
    // some sequential work. Use 70% efficiency factor (not all work can be parallelized).
    const effectiveCapacity = totalTeamCapacity * 0.7;
    deadlineFeasible = plan.totalEstimatedHours <= effectiveCapacity;
    feasibilityNote = ` (team capacity: ~${Math.round(totalTeamCapacity)}h, effective: ~${Math.round(effectiveCapacity)}h with 70% parallelism factor)`;

    if (!deadlineFeasible) {
      issues.push(
        `Estimated ${plan.totalEstimatedHours}h exceeds team capacity (~${Math.round(effectiveCapacity)}h effective) before deadline${feasibilityNote}.`,
      );
      suggestions.push('Reduce scope, add team members, or request deadline extension. The scheduler (Step 4) will provide a precise assessment.');
    } else {
      suggestions.push(`Estimated ${plan.totalEstimatedHours}h fits within team capacity (~${Math.round(effectiveCapacity)}h effective). Scheduler (Step 4) will confirm.`);
    }
  } else {
    // Fallback: rough single-person check (old behavior)
    deadlineFeasible = plan.totalEstimatedHours < deadline.hoursRemaining;
    if (!deadlineFeasible) {
      issues.push(
        `Estimated ${plan.totalEstimatedHours}h exceeds deadline buffer of ${deadline.hoursRemaining}h remaining.`,
      );
      suggestions.push('Reduce task scope, parallelize tasks, or add resources to fit within the deadline.');
    }
  }

  // allTasksHaveMembers is a warning, not a hard failure at this stage
  const isValid =
    rubricCoverageComplete && noCircularDependencies && deadlineFeasible;

  return {
    isValid,
    rubricCoverageComplete,
    allTasksHaveMembers: allTasksHaveMembers || unassignedTasks.length === plan.tasks.length ? allTasksHaveMembers : true, // soft check at this stage
    noCircularDependencies,
    deadlineFeasible,
    issues,
    suggestions,
    validatedAt: new Date().toISOString(),
  };
}
