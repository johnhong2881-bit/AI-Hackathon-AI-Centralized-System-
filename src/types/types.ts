// ============================================================
// PlanPilot AI — Shared Data Contract (types.ts)
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

// ===== MVP: Rubric Level Requirements =====

/**
 * Describes what is expected at a specific quality level for a rubric criterion.
 * MVP: Rubric Intelligence extracts Good/Average/Poor level requirements from the rubric.
 */
export interface RubricLevelRequirements {
  description: string;              // what's expected at this level
  estimatedHours?: number;          // suggested hours to achieve this level
  keyDeliverables?: string[];       // specific deliverables expected
}

// ===== MVP: Multi-Member Task Assignment =====

/**
 * A single member's assignment to a task with personalized time estimation.
 * MVP: Same task can have multiple members with different estimated hours each.
 */
export interface MemberTaskAssignment {
  memberId: string;
  estimatedHours: number;           // per-member hours for this task (personalized)
  matchScore: number;               // 0.0 - 1.0
  role: string;                     // e.g. "Primary", "Support", "Reviewer"
  invitationStatus: InvitationStatus;
  rejectReason?: string | null;     // reason if rejected
  // Scheduler fields — remaining hours and per-assignment status
  remainingHours?: number;          // hours left to do (defaults to estimatedHours for new tasks)
  assignmentStatus?: 'todo' | 'in_progress' | 'done'; // per-member work status (defaults to 'todo')
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

// ===== MVP: Rescue Workflow =====

export type RescueWorkflowStep = 'diagnose' | 'plan' | 'simulate' | 'validate';

export interface RescueWorkflowState {
  currentStep: RescueWorkflowStep;
  optimizationRound: number;        // current round (1, 2, 3)
  maxRounds: number;                // always 3 in MVP
  stepHistory: RescueStepRecord[];
}

export interface RescueStepRecord {
  step: RescueWorkflowStep;
  round: number;
  timestamp: string;
  description: string;
  result: string;
}

/**
 * Before/after comparison result from the Compare step of the rescue workflow.
 */
export interface RescueComparisonResult {
  beforeHours: number;             // "Original Workload" — assigned work only
  afterHours: number;              // "Proposed Workload" — total remaining work after rescue
  hoursSaved: number;              // hours cut by reduce ops (separate from workload delta)
  workloadDelta: number;            // afterHours - beforeHours (positive = more work exposed, negative = work reduced)
  beforeRiskLevel: RiskLevel;
  afterRiskLevel: RiskLevel;
  beforeTasksAtRisk: number;
  afterTasksAtRisk: number;
  beforeDeadlineBuffer: number;     // hours
  afterDeadlineBuffer: number;      // hours
  beforePredictedDay: number;       // predicted completion day (before rescue)
  afterPredictedDay: number;        // predicted completion day (after rescue)
  deadlineDay: number;              // deadline day offset
  improvementSummary: string;
}

// ===== MVP: Weekly Availability =====

export interface WeeklyAvailability {
  monday: number;                   // hours available
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

// ===== MVP: Plan Validator Result =====

export interface PlanValidationResult {
  isValid: boolean;
  rubricCoverageComplete: boolean;
  allTasksHaveMembers: boolean;
  noCircularDependencies: boolean;
  deadlineFeasible: boolean;
  issues: string[];
  suggestions: string[];
  validatedAt: string;
}

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
  // MVP: Rubric Intelligence extracts quality level requirements
  goodLevelRequirements?: RubricLevelRequirements;       // target level
  averageLevelRequirements?: RubricLevelRequirements;     // minimum acceptable level
  poorLevelRequirements?: RubricLevelRequirements;        // below standard
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
  assignedTo: string | null;       // primary member ID, null if unassigned (backward compat)
  // MVP: multi-member assignment with personalized time estimation
  memberAssignments?: MemberTaskAssignment[];  // multiple members, each with different hours
  confirmed: boolean;              // Design Decision #3/#5: Leader confirms task; unconfirmed tasks can be auto-modified by Rescue
  // Scheduler fields — for resource-constrained scheduling
  locked?: boolean;                // locked tasks require leader approval to change (default false)
  mandatory?: boolean;             // mandatory tasks cannot be dropped by rescue (derived from rubric)
  // MVP: accept/reject flow
  invitationStatus?: InvitationStatus;        // pending → accepted/rejected
  rejectReason?: string | null;                // reason if rejected
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
  rubricCoverage: RubricCoverage; // Design Decision #4: Planned coverage, NOT predicted grades
  // MVP: Plan Validator output (deterministic check after task decomposition)
  validation?: PlanValidationResult;
  generatedAt: string;
}

/**
 * Rubric coverage analysis.
 * Design Decision #4: This shows which rubric criteria are addressed by the task plan.
 * This is "planned coverage" — NOT a prediction of actual grades.
 * Actual grades depend on execution quality, not just task completion.
 */
export interface RubricCoverage {
  coveredRubricIds: string[];     // rubric item IDs that have at least 1 task
  uncoveredRubricIds: string[];   // rubric item IDs with NO task
  totalMarks: number;             // sum of marks for covered criteria
  maxMarks: number;               // total possible marks
  coveragePercent: number;        // totalMarks / maxMarks * 100
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
  availability: number;           // total hours available per week
  // MVP: per-day availability (Monday-Sunday)
  weeklyAvailability?: WeeklyAvailability;
  role: string;                   // e.g. "Team Lead", "Developer"
  isLeader: boolean;              // Design Decision #3: Leader has final say on task assignments
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
 * Risk status computed by the scheduler. Never set by LLM.
 */
export type RiskStatus = 'Complete' | 'On Track' | 'At Risk' | 'Overdue';

/**
 * Per-task schedule information from the resource-constrained scheduler.
 * Day 0 = project start (today). Days are calendar offsets, not work hours.
 */
export interface ScheduleTaskNode {
  taskId: string;
  startDay: number;                  // day offset from project start (0-based)
  endDay: number;                    // day offset when task finishes
  isDone: boolean;                   // task is fully completed
  isBlocked: boolean;                // task has no valid assignments or circular dep
  isCycle: boolean;                  // task is part of a dependency cycle
}

/**
 * Per-member load vs available capacity from the scheduler.
 */
export interface MemberLoad {
  memberId: string;
  memberName: string;
  remainingWorkHours: number;       // sum of remaining hours across all assignments
  availableHours: number;           // total available hours from now to deadline
  isOverloaded: boolean;            // remaining > available
}

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
  // === Resource-constrained scheduler output ===
  schedule: ScheduleTaskNode[];       // per-task start/end day
  predictedCompletionDay: number;     // day offset of latest ending task
  deadlineDay: number;                // day offset from start to deadline
  delayDays: number;                  // max(0, predictedCompletionDay - deadlineDay)
  riskStatus: RiskStatus;             // Complete / On Track / At Risk / Overdue
  memberLoads: MemberLoad[];          // per-member load vs capacity
  delayedTaskIds: string[];           // tasks ending after deadline
  hasCircularDependency: boolean;     // true if any cycle detected
}

// ===== FR-006: Risk Detection (LLM) =====

/**
 * A risk flag for a task.
 * Output of FR-006 Risk Detection.
 */
export interface RiskFlag {
  taskId: string;
  riskLevel: RiskLevel;
  // MVP: 7 risk types (expanded from 5)
  riskType: 'deadline' | 'dependency' | 'skill_gap' | 'overload' | 'quality' | 'insufficient_time' | 'unassigned';
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
  // MVP: 6-step rescue workflow (Detect→Analyze→Optimize→Validate→Apply→Compare)
  workflow?: RescueWorkflowState;
  // MVP: Permission rules — if actions affect confirmed tasks, need Leader approval
  requiresLeaderApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  // MVP: Comparison result from the Compare step
  comparisonResult?: RescueComparisonResult;
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

export interface PlanPilotState {
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
