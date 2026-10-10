// ============================================================
// TaskFlow AI — Shared Data Contract (types.ts)
// ============================================================
// This file is the SINGLE SOURCE OF TRUTH for all data types.
// Both frontend (Person A) and backend (Person B) import from here.
// DO NOT duplicate these types elsewhere. If you need a new type,
// add it HERE and commit + push immediately.
// ============================================================

// ===== Enums / Literal Unions =====

export type AssignmentType = 'research' | 'presentation' | 'software' | 'marketing' | 'mixed';

export type Complexity = 'low' | 'medium' | 'high';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';

export type RiskLevel = 'high' | 'medium' | 'low' | 'none';

export type Skill = 'writing' | 'research' | 'design' | 'coding' | 'presentation' | 'analysis' | 'editing' | 'management';

// ===== FR-001: Rubric Intelligence (Input: PDF/Image → Output: Structured Rubric) =====

/**
 * A single criterion extracted from the assignment rubric.
 * Example: "Clear thesis statement (5 marks, mandatory)"
 */
export interface RubricItem {
  id: string;
  criteria: string;
  marks: number | 'Unknown';
  weightage: number | null;       // percentage, null if unknown
  mandatory: boolean;
  description: string;
}

/**
 * Full parsed rubric result.
 * Output of FR-001 Rubric Intelligence (LLM).
 */
export interface RubricResult {
  assignmentId: string;
  items: RubricItem[];
  totalMarks: number | 'Unknown';
  parsedAt: string;               // ISO timestamp
  rawExtractionConfidence: number; // 0.0 - 1.0
  warnings: string[];              // e.g. "Could not read page 3"
}

// ===== FR-002: Task Decomposition (LLM: Assignment + Rubric → Tasks) =====

/**
 * A decomposed task unit.
 * Output of FR-002 Task Decomposition.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  requiredSkills: Skill[];
  estimatedHours: number;
  complexity: Complexity;
  priority: Priority;
  dependencies: string[];          // task IDs this depends on
  relatedRubricIds: string[];      // which RubricItem.id this satisfies
  status: TaskStatus;
  assignedTo: string | null;       // member ID, null if unassigned
  order: number;                   // for display ordering
  createdAt: string;
  updatedAt: string;
}

/**
 * Full task decomposition plan.
 * Output of FR-002 Task Decomposition.
 */
export interface PlanResult {
  assignmentId: string;
  tasks: Task[];
  criticalPath: string[];         // ordered task IDs on the critical path
  totalEstimatedHours: number;
  generatedAt: string;
}

// ===== FR-003: Skill Matching (LLM: Tasks × Members → Assignments) =====

/**
 * A team member profile.
 */
export interface Member {
  id: string;
  name: string;
  avatar: string;                 // emoji or image URL
  skills: Skill[];
  skillProficiency: Record<Skill, number>; // 1-5 scale per skill
  availability: number;           // hours available per week
  role: string;                   // e.g. "Team Lead", "Developer"
  currentTaskIds: string[];       // task IDs currently assigned
}

/**
 * A task-to-member assignment with match score.
 * Output of FR-003 Skill Matching.
 */
export interface TaskAssignment {
  taskId: string;
  memberId: string;
  matchScore: number;             // 0.0 - 1.0
  matchReason: string;            // e.g. "Strong in 'coding' (5/5), available 10h"
  assignedAt: string;
}

/**
 * Full skill matching result.
 */
export interface SkillMatchResult {
  assignmentId: string;
  assignments: TaskAssignment[];
  unmatchedTaskIds: string[];
  generatedAt: string;
}

// ===== FR-004: Critical Path Algorithm (Deterministic) =====

/**
 * Node in the critical path calculation.
 * Used internally by FR-004, but exposed for Gantt chart rendering.
 */
export interface CriticalPathNode {
  taskId: string;
  earlyStart: number;             // hours from project start
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number;                  // lateStart - earlyStart (0 = critical)
  isCritical: boolean;
}

/**
 * Full critical path analysis.
 * Output of FR-004.
 */
export interface CriticalPathResult {
  nodes: CriticalPathNode[];
  criticalPath: string[];         // ordered task IDs
  projectDuration: number;        // total hours
}

// ===== FR-006: Risk Detection (LLM) =====

/**
 * A risk flag for a task.
 * Output of FR-006 Risk Detection.
 */
export interface RiskFlag {
  taskId: string;
  riskLevel: RiskLevel;
  riskType: 'deadline' | 'dependency' | 'skill_gap' | 'overload' | 'quality';
  description: string;
  recommendation: string;
  detectedAt: string;
}

/**
 * Full risk assessment.
 */
export interface RiskAssessment {
  assignmentId: string;
  flags: RiskFlag[];
  overallRiskLevel: RiskLevel;
  assessedAt: string;
}

// ===== FR-012: Rescue Plan Generator (Hybrid: LLM + Deterministic) =====

/**
 * A single rescue action suggestion.
 */
export interface RescueAction {
  id: string;
  taskId: string;
  actionType: 'reassign' | 'split' | 'escalate' | 'reduce_scope' | 'add_resource' | 'reorder';
  description: string;
  priority: Priority;
  estimatedImpact: string;        // e.g. "Saves ~3 hours"
  assignedTo: string | null;      // member ID for reassignment
}

/**
 * Full rescue plan.
 * Output of FR-012.
 */
export interface RescuePlan {
  assignmentId: string;
  actions: RescueAction[];
  projectedRecovery: string;     // e.g. "On track for deadline with 2h buffer"
  confidence: number;            // 0.0 - 1.0
  generatedAt: string;
}

// ===== FR-013: Progress Tracking (Deterministic) =====

/**
 * Progress state for a single task.
 */
export interface TaskProgress {
  taskId: string;
  completionPercent: number;      // 0 - 100
  hoursSpent: number;
  hoursRemaining: number;
  lastUpdated: string;
}

/**
 * Overall project progress.
 * Output of FR-013.
 */
export interface ProjectProgress {
  assignmentId: string;
  overallCompletion: number;      // 0 - 100
  taskProgress: TaskProgress[];
  tasksCompleted: number;
  tasksTotal: number;
  hoursSpent: number;
  hoursTotal: number;
  isOnTrack: boolean;
  updatedAt: string;
}

// ===== FR-008: Deadline Countdown (Deterministic) =====

export interface DeadlineInfo {
  assignmentId: string;
  deadline: string | null;        // ISO timestamp
  daysRemaining: number;
  hoursRemaining: number;
  isOverdue: boolean;
  isUrgent: boolean;              // < 24h remaining
}

// ===== Root State (for Zustand store) =====

export interface TaskFlowState {
  // Input
  assignment: Assignment | null;
  // Pipeline outputs
  rubric: RubricResult | null;
  plan: PlanResult | null;
  members: Member[];
  skillMatch: SkillMatchResult | null;
  criticalPath: CriticalPathResult | null;
  riskAssessment: RiskAssessment | null;
  rescuePlan: RescuePlan | null;
  progress: ProjectProgress | null;
  deadline: DeadlineInfo | null;
  // UI state
  selectedTaskId: string | null;
  isLoading: Record<string, boolean>;  // track loading per FR pipeline stage
}

// ===== Assignment (Root Input) =====

/**
 * The assignment input — the root data object that kicks off the pipeline.
 * User enters this via the input form, or it's loaded from mock data.
 */
export interface Assignment {
  id: string;
  title: string;
  course: string;
  deliverables: string[];
  deadline: string | null;        // ISO timestamp
  assignmentType: AssignmentType;
  teamSize: number;
  description: string;
  rubricText?: string;            // raw text extracted from rubric PDF/image
}

// ===== Convenience: Full Pipeline Result =====

/**
 * The entire pipeline output bundled together.
 * Useful for the dashboard and for loading all mock data at once.
 */
export interface FullPipelineResult {
  assignment: Assignment;
  rubric: RubricResult;
  plan: PlanResult;
  members: Member[];
  skillMatch: SkillMatchResult;
  criticalPath: CriticalPathResult;
  riskAssessment: RiskAssessment;
  rescuePlan: RescuePlan | null;
  progress: ProjectProgress;
  deadline: DeadlineInfo;
}
