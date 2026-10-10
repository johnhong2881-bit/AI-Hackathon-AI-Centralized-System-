// ============================================================
// Barrel exports — import from here, not from individual files.
// Usage:  import { mockAssignment, mockPlanResult } from '@/lib/mock'
//         import type { Task, Member } from '@/types/types'
// ============================================================

export { mockAssignment } from './mockAssignment';
export { mockRubric } from './mockRubric';
export { mockPlanResult } from './mockTasks';
export { mockMembers } from './mockMembers';
export { mockSkillMatch, mockCriticalPath } from './mockPlanResult';
export {
  mockRiskAssessment,
  mockRescuePlan,
  mockProgress,
  mockDeadline,
  mockFullPipeline,
} from './mockRiskFlags';
