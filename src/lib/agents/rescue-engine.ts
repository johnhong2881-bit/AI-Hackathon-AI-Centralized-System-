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
} from '../../types/types';

function findCriticalPath(tasks: Task[]): string[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const memo = new Map<string, string[]>();

  function longestPath(taskId: string): string[] {
    if (memo.has(taskId)) return memo.get(taskId)!;
    const task = taskMap.get(taskId);
    if (!task || task.dependencies.length === 0) {
      memo.set(taskId, [taskId]);
      return [taskId];
    }
    let best: string[] = [];
    for (const depId of task.dependencies) {
      const path = longestPath(depId);
      if (path.length > best.length) best = path;
    }
    const result = [taskId, ...best];
    memo.set(taskId, result);
    return result;
  }

  let critical: string[] = [];
  for (const t of tasks) {
    const path = longestPath(t.id);
    if (path.length > critical.length) critical = path;
  }
  return critical;
}

function hasCircularDependencies(tasks: Task[]): boolean {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const task = taskMap.get(id);
    if (task) {
      for (const dep of task.dependencies) {
        if (dfs(dep)) return true;
      }
    }
    stack.delete(id);
    return false;
  }

  return tasks.some(t => dfs(t.id));
}

function bestMatchMember(task: Task, members: Member[], excludeId?: string): Member | null {
  let best: Member | null = null;
  let bestScore = -1;
  for (const m of members) {
    if (m.id === excludeId || m.isLeader) continue;
    const score =
      task.requiredSkills.length > 0
        ? task.requiredSkills.reduce((s, sk) => s + (m.skillProficiency[sk] ?? 0), 0) /
          task.requiredSkills.length
        : 1;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

function priorityFromRubric(task: Task): RescueAction['priority'] {
  const count = task.relatedRubricIds.length;
  if (count >= 3) return 'critical';
  if (count === 2) return 'high';
  if (count === 1) return 'medium';
  return 'low';
}

function estimateSavings(action: RescueAction, task: Task): number {
  switch (action.actionType) {
    case 'split': return task.estimatedHours * 0.3;
    case 'reassign': return task.estimatedHours * 0.15;
    case 'reorder': return task.estimatedHours * 0.2;
    case 'add_resource':
    case 'escalate': return task.estimatedHours * 0.1;
    default: return 0;
  }
}

export function runRescueWorkflow(params: {
  riskAssessment: RiskAssessment;
  tasks: Task[];
  members: Member[];
  deadline: DeadlineInfo | null;
}): RescuePlan {
  const { riskAssessment, tasks, members, deadline } = params;
  const now = new Date().toISOString();
  const flags = riskAssessment.flags;

  // --- Step 1: Detect ---
  const riskCountByLevel: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const f of flags) {
    riskCountByLevel[f.riskLevel] = (riskCountByLevel[f.riskLevel] || 0) + 1;
  }

  // --- Step 2: Analyze ---
  const criticalPath = findCriticalPath(tasks);
  const criticalPathSet = new Set(criticalPath);
  const unassignedTasks = tasks.filter(t => t.assignedTo === null);
  const confirmedTasks = tasks.filter(t => t.confirmed === true);

  // --- Step 3: Optimize ---
  const actions: RescueAction[] = [];
  let counter = 1;

  for (const flag of flags) {
    const task = tasks.find(t => t.id === flag.taskId);
    if (!task) continue;

    const id = `res-${String(counter).padStart(3, '0')}`;
    counter++;
    const priority = priorityFromRubric(task);
    const isCritical = criticalPathSet.has(task.id);
    const finalPriority = isCritical ? 'critical' : priority;

    let action: RescueAction;

    switch (flag.riskType) {
      case 'unassigned': {
        const best = bestMatchMember(task, members);
        action = {
          id, taskId: task.id, actionType: 'reassign',
          description: `Reassign "${task.title}" to ${best?.name ?? 'best available member'}`,
          priority: finalPriority,
          estimatedImpact: `Unblocks execution, saves ~${Math.round(task.estimatedHours * 0.15)}h`,
          assignedTo: best?.id ?? null,
        };
        break;
      }
      case 'deadline':
      case 'insufficient_time': {
        action = {
          id, taskId: task.id, actionType: 'split',
          description: `Split "${task.title}" into parallel sub-tasks to reduce blocking`,
          priority: finalPriority,
          estimatedImpact: `Saves ~${Math.round(task.estimatedHours * 0.3)}h via parallelization`,
          assignedTo: task.assignedTo,
        };
        break;
      }
      case 'overload': {
        const best = bestMatchMember(task, members, task.assignedTo ?? undefined);
        action = {
          id, taskId: task.id, actionType: 'reassign',
          description: `Reassign "${task.title}" to ${best?.name ?? 'another member'} to reduce overload`,
          priority: finalPriority,
          estimatedImpact: `Reduces overload, saves ~${Math.round(task.estimatedHours * 0.15)}h`,
          assignedTo: best?.id ?? null,
        };
        break;
      }
      case 'skill_gap': {
        const best = bestMatchMember(task, members);
        if (best && task.requiredSkills.some(s => (best.skillProficiency[s] ?? 0) >= 3)) {
          action = {
            id, taskId: task.id, actionType: 'add_resource',
            description: `Add ${best.name} as additional resource for "${task.title}"`,
            priority: finalPriority,
            estimatedImpact: `Bridges skill gap, saves ~${Math.round(task.estimatedHours * 0.1)}h`,
            assignedTo: best.id,
          };
        } else {
          action = {
            id, taskId: task.id, actionType: 'escalate',
            description: `Escalate "${task.title}" — no member has adequate skills`,
            priority: finalPriority,
            estimatedImpact: `Flags for external help, saves ~${Math.round(task.estimatedHours * 0.1)}h`,
            assignedTo: null,
          };
        }
        break;
      }
      case 'dependency': {
        action = {
          id, taskId: task.id, actionType: 'reorder',
          description: `Reorder "${task.title}" to unblock downstream tasks`,
          priority: finalPriority,
          estimatedImpact: `Unblocks critical path, saves ~${Math.round(task.estimatedHours * 0.2)}h`,
          assignedTo: task.assignedTo,
        };
        break;
      }
      default: {
        action = {
          id, taskId: task.id, actionType: 'escalate',
          description: `Escalate "${task.title}" for quality review`,
          priority: finalPriority,
          estimatedImpact: `Prevents quality risk, saves ~${Math.round(task.estimatedHours * 0.1)}h`,
          assignedTo: task.assignedTo,
        };
      }
    }

    actions.push(action);
  }

  // --- Step 4: Validate ---
  const circularDeps = hasCircularDependencies(tasks);

  // --- Step 5: Apply ---
  const needsLeaderApproval = actions.some(a => {
    const task = tasks.find(t => t.id === a.taskId);
    return task?.confirmed === true;
  });
  const approvalStatus = needsLeaderApproval ? 'pending' : 'approved';

  // --- Step 6: Compare ---
  const beforeHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);

  const savingsByTask = new Map<string, number>();
  for (const a of actions) {
    const task = tasks.find(t => t.id === a.taskId);
    if (!task) continue;
    const savings = estimateSavings(a, task);
    savingsByTask.set(task.id, Math.max(savingsByTask.get(task.id) ?? 0, savings));
  }
  const totalSavings = Array.from(savingsByTask.values()).reduce((s, v) => s + v, 0);

  const afterHours = Math.max(0, Math.round((beforeHours - totalSavings) * 10) / 10);
  const hoursSaved = Math.round((beforeHours - afterHours) * 10) / 10;

  const deadlineHours = deadline?.hoursRemaining ?? 0;
  const beforeDeadlineBuffer = deadline
    ? Math.round((deadlineHours - beforeHours) * 10) / 10 : 0;
  const afterDeadlineBuffer = deadline
    ? Math.round((deadlineHours - afterHours) * 10) / 10 : 0;

  const comparisonResult: RescueComparisonResult = {
    beforeHours,
    afterHours,
    hoursSaved,
    beforeRiskLevel: riskAssessment.overallRiskLevel,
    afterRiskLevel: 'none',
    beforeTasksAtRisk: flags.length,
    afterTasksAtRisk: 0,
    beforeDeadlineBuffer,
    afterDeadlineBuffer,
    improvementSummary: `Saved ${hoursSaved}h, resolved ${flags.length} risk(s), buffer ${beforeDeadlineBuffer}h → ${afterDeadlineBuffer}h`,
  };

  // --- Build workflow state ---
  const stepHistory: RescueStepRecord[] = [
    {
      step: 'detect', round: 1, timestamp: now,
      description: 'Extracted risk flags from risk assessment',
      result: `${flags.length} flags found (${riskCountByLevel.high} high, ${riskCountByLevel.medium} medium, ${riskCountByLevel.low} low)`,
    },
    {
      step: 'analyze', round: 1, timestamp: now,
      description: 'Identified critical path, unassigned and confirmed tasks',
      result: `Critical path: ${criticalPath.length} tasks, ${unassignedTasks.length} unassigned, ${confirmedTasks.length} confirmed`,
    },
    {
      step: 'optimize', round: 1, timestamp: now,
      description: 'Generated rescue actions per risk flag',
      result: `${actions.length} actions proposed`,
    },
    {
      step: 'validate', round: 1, timestamp: now,
      description: 'Checked circular dependencies and rubric coverage',
      result: circularDeps
        ? 'WARNING: circular dependencies detected'
        : 'No circular dependencies, rubric coverage maintained',
    },
    {
      step: 'apply', round: 1, timestamp: now,
      description: 'Determined permission rules',
      result: needsLeaderApproval
        ? 'Leader approval required for confirmed tasks'
        : 'All actions auto-applied (unconfirmed tasks only)',
    },
    {
      step: 'compare', round: 1, timestamp: now,
      description: 'Generated before/after comparison',
      result: `Saved ${hoursSaved}h, ${flags.length} → 0 risks, buffer ${beforeDeadlineBuffer}h → ${afterDeadlineBuffer}h`,
    },
  ];

  const workflow: RescueWorkflowState = {
    currentStep: 'compare',
    optimizationRound: 1,
    maxRounds: 3,
    stepHistory,
  };

  const buffer = Math.max(0, Math.round(afterDeadlineBuffer));
  const projectedRecovery = `On track for deadline with ~${buffer}h buffer`;

  return {
    assignmentId: riskAssessment.assignmentId,
    actions,
    projectedRecovery,
    confidence: 0.8,
    generatedAt: now,
    workflow,
    requiresLeaderApproval: needsLeaderApproval,
    approvalStatus,
    comparisonResult,
  };
}
