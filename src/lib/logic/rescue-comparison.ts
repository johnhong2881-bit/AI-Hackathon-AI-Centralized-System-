import type { RiskLevel, RescueComparisonResult } from '../../types/types';

export function calculateRescueComparison(params: {
  beforeHours: number;
  afterHours: number;
  beforeRiskLevel: RiskLevel;
  afterRiskLevel: RiskLevel;
  beforeTasksAtRisk: number;
  afterTasksAtRisk: number;
  beforeDeadlineBuffer: number;
  afterDeadlineBuffer: number;
  beforePredictedDay?: number;
  afterPredictedDay?: number;
  deadlineDay?: number;
}): RescueComparisonResult {
  const hoursSaved = params.beforeHours - params.afterHours;

  const improvementSummary = `Rescue optimization saved ${hoursSaved}h, reduced tasks at risk from ${params.beforeTasksAtRisk} to ${params.afterTasksAtRisk}, and improved deadline buffer from ${params.beforeDeadlineBuffer}h to ${params.afterDeadlineBuffer}h.`;

  return {
    beforeHours: params.beforeHours,
    afterHours: params.afterHours,
    hoursSaved,
    workloadDelta: params.afterHours - params.beforeHours,
    beforeRiskLevel: params.beforeRiskLevel,
    afterRiskLevel: params.afterRiskLevel,
    beforeTasksAtRisk: params.beforeTasksAtRisk,
    afterTasksAtRisk: params.afterTasksAtRisk,
    beforeDeadlineBuffer: params.beforeDeadlineBuffer,
    afterDeadlineBuffer: params.afterDeadlineBuffer,
    beforePredictedDay: params.beforePredictedDay ?? 0,
    afterPredictedDay: params.afterPredictedDay ?? 0,
    deadlineDay: params.deadlineDay ?? 0,
    improvementSummary,
  };
}
