// ============================================================
// Critical Path Algorithm (FR-004) — Deterministic
// ============================================================
// Pure algorithm — no LLM involved. Uses the Critical Path Method (CPM)
// to calculate early/late start/finish and slack for each task.
//
// Tasks with zero slack are on the critical path.
// ============================================================

import type { Task, CriticalPathResult, CriticalPathNode } from '../../types/types';

export function calculateCriticalPath(tasks: Task[]): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      nodes: [], criticalPath: [], projectDuration: 0,
      schedule: [], predictedCompletionDay: 0, deadlineDay: 0,
      delayDays: 0, riskStatus: 'Complete', memberLoads: [],
      delayedTaskIds: [], hasCircularDependency: false,
    };
  }

  // Build adjacency: for each task, what tasks depend on it?
  const dependents = new Map<string, string[]>();
  const dependencies = new Map<string, string[]>();

  for (const t of tasks) {
    dependents.set(t.id, []);
    dependencies.set(t.id, t.dependencies);
  }

  for (const t of tasks) {
    for (const dep of t.dependencies) {
      const list = dependents.get(dep);
      if (list) list.push(t.id);
    }
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  for (const t of tasks) {
    inDegree.set(t.id, t.dependencies.length);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    const deps = dependents.get(id) || [];
    for (const dep of deps) {
      const newDeg = (inDegree.get(dep) || 0) - 1;
      inDegree.set(dep, newDeg);
      if (newDeg === 0) queue.push(dep);
    }
  }

  // Forward pass: calculate earlyStart and earlyFinish
  const taskMap = new Map<string, Task>();
  for (const t of tasks) taskMap.set(t.id, t);

  const earlyStart = new Map<string, number>();
  const earlyFinish = new Map<string, number>();

  for (const id of topoOrder) {
    const task = taskMap.get(id)!;
    const deps = dependencies.get(id) || [];
    const es = deps.length === 0
      ? 0
      : Math.max(...deps.map((d) => earlyFinish.get(d) || 0));
    earlyStart.set(id, es);
    earlyFinish.set(id, es + task.estimatedHours);
  }

  // Project duration = max earlyFinish
  const projectDuration = Math.max(...Array.from(earlyFinish.values()));

  // Backward pass: calculate lateStart and lateFinish
  const lateStart = new Map<string, number>();
  const lateFinish = new Map<string, number>();

  for (const id of [...topoOrder].reverse()) {
    const task = taskMap.get(id)!;
    const deps = dependents.get(id) || [];
    const lf = deps.length === 0
      ? projectDuration
      : Math.min(...deps.map((d) => lateStart.get(d) || projectDuration));
    lateFinish.set(id, lf);
    lateStart.set(id, lf - task.estimatedHours);
  }

  // Calculate slack and build nodes
  const nodes: CriticalPathNode[] = topoOrder.map((id) => {
    const es = earlyStart.get(id)!;
    const ef = earlyFinish.get(id)!;
    const ls = lateStart.get(id)!;
    const lf = lateFinish.get(id)!;
    const slack = ls - es;
    return {
      taskId: id,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      slack,
      isCritical: slack === 0,
    };
  });

  const criticalPath = nodes.filter((n) => n.isCritical).map((n) => n.taskId);

  return {
    nodes,
    criticalPath,
    projectDuration,
    // Default scheduler fields — use calculateCriticalPathWithSchedule() for real scheduling
    schedule: [], predictedCompletionDay: 0, deadlineDay: 0,
    delayDays: 0, riskStatus: 'Complete', memberLoads: [],
    delayedTaskIds: [], hasCircularDependency: false,
  };
}
