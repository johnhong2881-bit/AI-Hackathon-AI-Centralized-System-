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
      taskId: 'task-008',
      riskLevel: 'medium',
      riskType: 'skill_gap',
      description: 'No member assigned to "Iterate Prototype" — requires design + analysis skills. No available member has both at 4+.',
      recommendation: 'Assign to mem-002 (design 5/5, analysis 3/5) after task-004 completes, or pair mem-001 + mem-003.',
      detectedAt: '2026-10-10T14:00:00+08:00',
    },
    {
      taskId: 'task-009',
      riskLevel: 'medium',
      riskType: 'skill_gap',
      description: 'Report writing (3000 words, APA 7th) has no assigned member. Only mem-002 has writing 5/5 but is at capacity.',
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
  deadline: '2026-11-15T23:59:00+08:00',
  daysRemaining: 36,
  hoursRemaining: 864,
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
