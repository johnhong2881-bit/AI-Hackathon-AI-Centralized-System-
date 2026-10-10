import type { SkillMatchResult, CriticalPathResult } from '../../types/types';

/**
 * Mock Skill Matching output.
 * Output of FR-003 — LLM matches tasks to members based on skills + availability.
 */
export const mockSkillMatch: SkillMatchResult = {
  assignmentId: 'asg-001',
  assignments: [
    { taskId: 'task-001', memberId: 'mem-003', matchScore: 0.95, matchReason: 'Strong in research (5/5) and management (3/5), available 14h/week', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-002', memberId: 'mem-003', matchScore: 0.92, matchReason: 'Top skills: research (5/5), analysis (5/5), writing (4/5)', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-003', memberId: 'mem-002', matchScore: 0.97, matchReason: 'Design proficiency 5/5, available 12h/week', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-004', memberId: 'mem-002', matchScore: 0.88, matchReason: 'Design (5/5) + editing (4/5) match well', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-005', memberId: 'mem-001', matchScore: 0.94, matchReason: 'Coding (5/5) and design (4/5), 15h available', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-006', memberId: 'mem-001', matchScore: 0.90, matchReason: 'Coding (5/5) + design (4/5) for interaction logic', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-007', memberId: 'mem-004', matchScore: 0.85, matchReason: 'Management (5/5), research (2/5), 10h available', assignedAt: '2026-10-10T10:00:00+08:00' },
    { taskId: 'task-010', memberId: 'mem-004', matchScore: 0.91, matchReason: 'Presentation (5/5) + management (5/5)', assignedAt: '2026-10-10T10:00:00+08:00' },
  ],
  unmatchedTaskIds: ['task-008', 'task-009', 'task-011'],
  generatedAt: '2026-10-10T10:01:00+08:00',
};

/**
 * Mock Critical Path output.
 * Output of FR-004 — deterministic algorithm calculates critical path.
 * Slack = 0 means the task is on the critical path.
 */
export const mockCriticalPath: CriticalPathResult = {
  nodes: [
    { taskId: 'task-001', earlyStart: 0, earlyFinish: 4, lateStart: 0, lateFinish: 4, slack: 0, isCritical: true },
    { taskId: 'task-002', earlyStart: 4, earlyFinish: 12, lateStart: 4, lateFinish: 12, slack: 0, isCritical: true },
    { taskId: 'task-003', earlyStart: 12, earlyFinish: 18, lateStart: 12, lateFinish: 18, slack: 0, isCritical: true },
    { taskId: 'task-004', earlyStart: 18, earlyFinish: 23, lateStart: 18, lateFinish: 23, slack: 0, isCritical: true },
    { taskId: 'task-005', earlyStart: 23, earlyFinish: 31, lateStart: 23, lateFinish: 31, slack: 0, isCritical: true },
    { taskId: 'task-006', earlyStart: 31, earlyFinish: 35, lateStart: 31, lateFinish: 35, slack: 0, isCritical: true },
    { taskId: 'task-007', earlyStart: 35, earlyFinish: 40, lateStart: 35, lateFinish: 40, slack: 0, isCritical: true },
    { taskId: 'task-008', earlyStart: 40, earlyFinish: 44, lateStart: 40, lateFinish: 44, slack: 0, isCritical: true },
    { taskId: 'task-009', earlyStart: 44, earlyFinish: 50, lateStart: 44, lateFinish: 50, slack: 0, isCritical: true },
    { taskId: 'task-010', earlyStart: 50, earlyFinish: 54, lateStart: 50, lateFinish: 54, slack: 0, isCritical: true },
    { taskId: 'task-011', earlyStart: 54, earlyFinish: 57, lateStart: 54, lateFinish: 57, slack: 0, isCritical: false },
  ],
  criticalPath: ['task-001', 'task-002', 'task-003', 'task-004', 'task-005', 'task-006', 'task-007', 'task-008', 'task-009', 'task-010'],
  projectDuration: 54,
};
