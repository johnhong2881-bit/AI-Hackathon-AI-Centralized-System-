import type { RiskAssessment, RescuePlan, ProjectProgress, DeadlineInfo, FullPipelineResult } from '../../types/types';
import { mockAssignment } from './mockAssignment';
import { mockRubric } from './mockRubric';
import { mockPlanResult } from './mockTasks';
import { mockMembers } from './mockMembers';
import { mockSkillMatch, mockCriticalPath } from './mockPlanResult';

/**
 * Mock Risk Assessment output.
 * Output of FR-006 — LM detects at-risk tasks.
 */
export const mockRiskAssessment: RiskAssessment = {
  assignmentId: 'asg-001',
  flags: [
    {
      taskId: 'task-002',
      riskLevel: 'high',
      riskType: 'deadline',
      description: 'Interview synthesis is 50% complete but task-003 (wireframing) is blocked on it. 8h estimated, only 2h done.',
      recommendation: 'Consider splitting: have mem-003 finish persona + pain points first (4h), start wireframing in parallel.',
      detectedAt: '2026-10-10T14:00:00+08:00',
    },
    {
      taskId: 'task-002',
      riskLevel: 'high',
      riskType: 'insufficient_time',
      description: 'task-002 has 4h remaining but only 14h left in mem-003\'s weekly availability. With dependency chain task-003→task-004→task-005 (19h total), timeline is tight.',
      recommendation: 'Split task-002: finish personas (4h) first, defer transcription. Frees 4h for downstream tasks.',
      detectedAt: '2026-10-10T14:00:00+08:00',
    },
    {
      taskId: 'task-008',
      riskLevel: 'medium',
      riskType: 'unassigned',
      description: 'No member assigned to "Iterate Prototype" — requires design + analysis skills. No available member has both at 4+.',
      recommendation: 'Assign to mem-002 (design 5/5, analysis 3/5) after task-004 completes, or pair mem-001 + mem-003.',
      detectedAt: '2026-10-10T14:00:00+08:00',
    },
    {
      taskId: 'task-009',
      riskLevel: 'medium',
      riskType: 'unassigned',
      description: 'Report writing (3000 words, APA 7th) has no assigned member. Original assignee (mem-002) rejected: at capacity.',
      recommendation: 'Reassign task-004 to mem-001 (design 4/5), free mem-002 for report writing.',
      detectedAt: '2026-10-10T14:00:00+08:00',
    },
    {
      taskId: 'task-011',
      riskLevel: 'low',
      riskType: 'deadline',
      description: 'Individual reflections depend on task-010 (presentation) which is 10th in sequence. May be tight near deadline.',
      recommendation: 'Allow members to draft reflections in parallel once their main tasks are done.',
      detectedAt: '2026-10-10T14:00:00+08:00',
    },
  ],
  overallRiskLevel: 'medium',
  assessedAt: '2026-10-10T14:00:00+08:00',
};

/**
 * Mock Rescue Plan output.
 * Output of FR-012 — hybrid LLM + deterministic rescue plan.
 */
export const mockRescuePlan: RescuePlan = {
  assignmentId: 'asg-001',
  actions: [
    {
      id: 'res-001',
      taskId: 'task-002',
      actionType: 'split',
      description: 'Split interview synthesis: finish personas + pain points first (4h) to unblock wireframing. Keep transcription as separate sub-task.',
      priority: 'critical',
      estimatedImpact: 'Saves ~4h of blocking time on the critical path',
      assignedTo: 'mem-003',
    },
    {
      id: 'res-002',
      taskId: 'task-004',
      actionType: 'reassign',
      description: 'Reassign Visual Design task from mem-002 to mem-001 (design 4/5) to free mem-002 for report writing.',
      priority: 'high',
      estimatedImpact: 'Unblocks task-009 (report writing) without adding new blocker',
      assignedTo: 'mem-001',
    },
    {
      id: 'res-003',
      taskId: 'task-009',
      actionType: 'reassign',
      description: 'Assign report writing to mem-002 (writing 5/5). They can start once task-004 is reassigned.',
      priority: 'high',
      estimatedImpact: 'Ensures 3000-word report quality with top writer',
      assignedTo: 'mem-002',
    },
    {
      id: 'res-004',
      taskId: 'task-011',
      actionType: 'reorder',
      description: 'Allow individual reflections to be drafted in parallel — each member starts once their main task is done.',
      priority: 'medium',
      estimatedImpact: 'Saves ~3h by parallelizing',
      assignedTo: null,
    },
  ],
  projectedRecovery: 'On track for deadline with ~4h buffer after rescue actions',
  confidence: 0.82,
  generatedAt: '2026-10-10T14:05:00+08:00',
  // MVP: 6-step rescue workflow (Detect→Analyze→Optimize→Validate→Apply→Compare)
  workflow: {
    currentStep: 'compare',
    optimizationRound: 1,
    maxRounds: 3,
    stepHistory: [
      {
        step: 'detect',
        round: 1,
        timestamp: '2026-10-10T14:00:00+08:00',
        description: 'Risk Detector identified 5 risk flags (1 high deadline, 1 high insufficient_time, 2 medium unassigned, 1 low deadline)',
        result: '5 risks detected, overall risk: medium',
      },
      {
        step: 'analyze',
        round: 1,
        timestamp: '2026-10-10T14:01:00+08:00',
        description: 'Analyzed critical path impact: task-002 blocks 8 downstream tasks. task-008/009 unassigned breaks coverage.',
        result: 'Critical path at risk, 3 unassigned tasks, rubric coverage 100% but execution gaps',
      },
      {
        step: 'optimize',
        round: 1,
        timestamp: '2026-10-10T14:02:00+08:00',
        description: 'Generated 4 rescue actions: split task-002, reassign task-004, reassign task-009, reorder task-011',
        result: '4 actions proposed, estimated 7h savings',
      },
      {
        step: 'validate',
        round: 1,
        timestamp: '2026-10-10T14:03:00+08:00',
        description: 'Validated: no circular dependencies introduced, rubric coverage maintained at 100%, deadline feasible (50h < 864h remaining)',
        result: 'Plan valid, no issues found',
      },
      {
        step: 'apply',
        round: 1,
        timestamp: '2026-10-10T14:04:00+08:00',
        description: 'Applied: res-002/003/004 auto-applied (unconfirmed tasks). res-001 requires Leader approval (task-002 is confirmed).',
        result: '3 actions auto-applied, 1 pending Leader approval → approved by David (Leader)',
      },
      {
        step: 'compare',
        round: 1,
        timestamp: '2026-10-10T14:05:00+08:00',
        description: 'Compared before/after: 57h→50h, 5 risks→0, deadline -4h→+4h buffer',
        result: 'Improvement confirmed, rescue successful. Round 1 sufficient, no need for round 2.',
      },
    ],
  },
  // MVP: Permission rules — res-001 affects task-002 (confirmed=true), requires Leader approval
  requiresLeaderApproval: true,
  approvalStatus: 'approved',
  // MVP: Comparison result from the Compare step
  comparisonResult: {
    beforeHours: 57,
    afterHours: 50,
    hoursSaved: 7,
    beforeRiskLevel: 'medium',
    afterRiskLevel: 'none',
    beforeTasksAtRisk: 5,
    afterTasksAtRisk: 0,
    beforeDeadlineBuffer: -4,
    afterDeadlineBuffer: 4,
    improvementSummary: 'Rescue plan saved 7 hours, resolved all 5 risk flags, and moved from 4h behind to 4h ahead of deadline buffer.',
  },
};

/**
 * Mock Project Progress output.
 * Output of FR-013 — deterministic progress tracking.
 */
export const mockProgress: ProjectProgress = {
  assignmentId: 'asg-001',
  overallCompletion: 18,
  taskProgress: [
    { taskId: 'task-001', completionPercent: 100, hoursSpent: 4, hoursRemaining: 0, lastUpdated: '2026-10-10T12:00:00+08:00' },
    { taskId: 'task-002', completionPercent: 50, hoursSpent: 4, hoursRemaining: 4, lastUpdated: '2026-10-10T14:00:00+08:00' },
    { taskId: 'task-003', completionPercent: 20, hoursSpent: 1, hoursRemaining: 5, lastUpdated: '2026-10-10T13:00:00+08:00' },
    { taskId: 'task-004', completionPercent: 0, hoursSpent: 0, hoursRemaining: 5, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-005', completionPercent: 0, hoursSpent: 0, hoursRemaining: 8, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-006', completionPercent: 0, hoursSpent: 0, hoursRemaining: 4, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-007', completionPercent: 0, hoursSpent: 0, hoursRemaining: 5, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-008', completionPercent: 0, hoursSpent: 0, hoursRemaining: 4, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-009', completionPercent: 0, hoursSpent: 0, hoursRemaining: 6, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-010', completionPercent: 0, hoursSpent: 0, hoursRemaining: 4, lastUpdated: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-011', completionPercent: 0, hoursSpent: 0, hoursRemaining: 3, lastUpdated: '2026-10-10T10:00:00+08:00' },
  ],
  tasksCompleted: 1,
  tasksTotal: 11,
  hoursSpent: 9,
  hoursTotal: 57,
  isOnTrack: true,
  updatedAt: '2026-10-10T14:00:00+08:00',
};

/**
 * Mock Deadline Countdown info.
 * Output of FR-008 — deterministic real-time countdown.
 */
export const mockDeadline: DeadlineInfo = {
  assignmentId: 'asg-001',
  deadline: '2026-10-18T23:59:00+08:00',
  daysRemaining: 7,
  hoursRemaining: 168,
  isOverdue: false,
  isUrgent: false,
};

/**
 * Full pipeline result — all mock data bundled.
 * Use this to load the entire app state at once for development/demo.
 */
export const mockFullPipeline: FullPipelineResult = {
  assignment: mockAssignment,
  rubric: mockRubric,
  plan: mockPlanResult,
  members: mockMembers,
  skillMatch: mockSkillMatch,
  criticalPath: mockCriticalPath,
  riskAssessment: mockRiskAssessment,
  rescuePlan: mockRescuePlan,
  progress: mockProgress,
  deadline: mockDeadline,
};
