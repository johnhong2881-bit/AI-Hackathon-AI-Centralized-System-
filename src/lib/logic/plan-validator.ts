import type { PlanResult, RubricResult, DeadlineInfo, PlanValidationResult } from '../../types/types';

export function validatePlan(
  plan: PlanResult,
  rubric: RubricResult,
  deadline: DeadlineInfo,
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

  // Check 2: allTasksHaveMembers
  const unassignedTasks = plan.tasks.filter(
    (t) => t.assignedTo === null && (!t.memberAssignments || t.memberAssignments.length === 0),
  );
  const allTasksHaveMembers = unassignedTasks.length === 0;
  if (!allTasksHaveMembers) {
    issues.push(`Tasks without assigned members: ${unassignedTasks.map((t) => t.id).join(', ')}`);
    suggestions.push('Assign members to all tasks or use the skill matching pipeline to find suitable members.');
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

  // Check 4: deadlineFeasible
  const deadlineFeasible = plan.totalEstimatedHours < deadline.hoursRemaining;
  if (!deadlineFeasible) {
    issues.push(
      `Estimated ${plan.totalEstimatedHours}h exceeds deadline buffer of ${deadline.hoursRemaining}h remaining.`,
    );
    suggestions.push('Reduce task scope, parallelize tasks, or add resources to fit within the deadline.');
  }

  const isValid =
    rubricCoverageComplete && allTasksHaveMembers && noCircularDependencies && deadlineFeasible;

  return {
    isValid,
    rubricCoverageComplete,
    allTasksHaveMembers,
    noCircularDependencies,
    deadlineFeasible,
    issues,
    suggestions,
    validatedAt: new Date().toISOString(),
  };
}
