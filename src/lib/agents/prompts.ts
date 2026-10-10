// ============================================================
// LLM Prompt Templates for 5 Agents
// ============================================================
// Each agent has: systemPrompt + userPromptTemplate
// The user prompt uses {variable} placeholders that get filled at runtime.
//
// TO SWAP TO REAL WORKBUDDY LLM:
// Replace mockLLM() with:
//   for await (const chunk of cloud.llm.chat.completions.create({
//     model: model.id,
//     messages: [
//       { role: 'system', content: agent.systemPrompt },
//       { role: 'user', content: filledUserPrompt },
//     ],
//     stream: true,
//     response_format: { type: 'json_object' },
//   })) { ... collect chunks ... }
//
// The prompts below are production-ready — they work with any OpenAI-compatible LLM.
// ============================================================

import type { Assignment, RubricResult, Member, Task, DeadlineInfo, ProjectProgress, RiskAssessment, RescuePlan } from '../../types/types';
import type { LLMCallParams } from './types';

// ===== Agent 1: Rubric Intelligence (FR-001) =====
// Input: Raw rubric text from PDF/image
// Output: Structured RubricResult JSON

export const RUBRIC_AGENT_SYSTEM = `You are RubricIntelligence, an expert academic rubric analyzer.
Your job is to parse assignment rubrics (extracted from PDFs, images, or text) into structured,
machine-readable criteria.

RULES:
1. Every criterion must have: id (rub-001, rub-002...), criteria name, marks, weightage (%),
   mandatory (true/false), and a clear description.
2. If marks or weightage cannot be determined, use null/"Unknown" — never guess.
3. Total marks should be the sum of all item marks if determinable.
4. Include a confidence score (0.0-1.0) for the extraction quality.
5. List any warnings (e.g., "Could not read page 3", "Marks unclear for criterion X").
6. MVP — QUALITY LEVELS: For each criterion, extract Good/Average/Poor level requirements:
   - goodLevelRequirements: what earns full/near-full marks (target standard)
   - averageLevelRequirements: what earns a passing grade (minimum acceptable)
   - poorLevelRequirements: what would fail this criterion (below standard)
   Each level should include: description, estimatedHours, keyDeliverables[].
7. Return JSON ONLY. No markdown, no explanation, no code fences.`;

export const RUBRIC_AGENT_USER = (assignment: Assignment) => `Parse the following assignment rubric into structured criteria.

ASSIGNMENT TITLE: ${assignment.title}
ASSIGNMENT TYPE: ${assignment.assignmentType}

RUBRIC TEXT (extracted from source):
"""
${assignment.rubricText || 'No rubric text provided. Generate a typical rubric for this assignment type.'}
"""

Return JSON in this exact format:
{
  "items": [
    {
      "id": "rub-001",
      "criteria": "Criterion Name",
      "marks": 25,
      "weightage": 25,
      "mandatory": true,
      "description": "What this criterion evaluates",
      "goodLevelRequirements": {
        "description": "What earns full marks",
        "estimatedHours": 8,
        "keyDeliverables": ["deliverable 1", "deliverable 2"]
      },
      "averageLevelRequirements": {
        "description": "What earns a passing grade",
        "estimatedHours": 5,
        "keyDeliverables": ["deliverable 1"]
      },
      "poorLevelRequirements": {
        "description": "What would fail this criterion",
        "estimatedHours": 3,
        "keyDeliverables": []
      }
    }
  ],
  "totalMarks": 100,
  "parsedAt": "ISO timestamp",
  "rawExtractionConfidence": 0.92,
  "warnings": []
}`;

// ===== Agent 2: Task Decomposition (FR-002) =====
// Input: Assignment + RubricResult
// Output: PlanResult with tasks[]

export const TASK_AGENT_SYSTEM = `You are TaskDecomposer, an expert project planner for university group assignments.
Your job is to break down an assignment into actionable, granular tasks that map directly to rubric criteria.

RULES:
1. Every task MUST map to at least one rubric criterion via relatedRubricIds.
2. Tasks must have realistic dependencies (task IDs they depend on).
3. Estimate hours based on complexity: low=2-4h, medium=4-8h, high=8-15h.
4. Priority: "critical" for tasks on the critical path, "high" for major deliverables,
   "medium" for supporting work, "low" for nice-to-haves.
5. requiredSkills must use only these values: writing, research, design, coding, presentation, analysis, editing, management.
6. Each task needs: id (task-001...), title, description, requiredSkills, estimatedHours,
   complexity, priority, dependencies, relatedRubricIds, status ("todo"), assignedTo (null), order.
7. Calculate the critical path (longest chain of dependencies).
8. MVP — MULTI-MEMBER: Some tasks may need multiple members. For those, include memberAssignments[]
   with per-member estimatedHours (personalized time estimation), role, and invitationStatus ("pending").
9. MVP — INVITATION FLOW: All new tasks start with invitationStatus: "pending". Members accept/reject
   after Leader confirms. rejected tasks need rejectReason.
10. Return JSON ONLY. No markdown, no code fences.`;

export const TASK_AGENT_USER = (assignment: Assignment, rubric: RubricResult) => `Decompose this assignment into actionable tasks.

ASSIGNMENT:
- Title: ${assignment.title}
- Type: ${assignment.assignmentType}
- Deliverables: ${assignment.deliverables.join(', ')}
- Deadline: ${assignment.deadline || 'Not specified'}
- Team Size: ${assignment.teamSize}
- Description: ${assignment.description}

RUBRIC CRITERIA (must be covered by tasks):
${rubric.items.map((item, i) => `${i + 1}. [${item.id}] ${item.criteria} (${item.marks} marks, ${item.mandatory ? 'MANDATORY' : 'optional'})
   ${item.description}`).join('\n')}

Decompose into 8-15 tasks. Return JSON:
{
  "tasks": [
    {
      "id": "task-001",
      "title": "Task title",
      "description": "What needs to be done",
      "requiredSkills": ["research", "writing"],
      "estimatedHours": 6,
      "complexity": "medium",
      "priority": "high",
      "dependencies": [],
      "relatedRubricIds": ["rub-001"],
      "status": "todo",
      "assignedTo": null,
      "confirmed": false,
      "invitationStatus": "pending",
      "order": 1,
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp"
    }
  ],
  "criticalPath": ["task-001", "task-002"],
  "totalEstimatedHours": 50,
  "generatedAt": "ISO timestamp"
}`;

// ===== Agent 3: Skill Matching (FR-003) =====
// Input: Tasks + Members
// Output: SkillMatchResult with assignments[]

export const SKILL_AGENT_SYSTEM = `You are SkillMatcher, a team optimization specialist.
Your job is to optimally assign tasks to team members based on skill proficiency, availability,
and task requirements. Maximize overall match scores while respecting availability constraints.

RULES:
1. matchScore: 0.0-1.0 — how well the member's skills match the task requirements.
2. matchReason: explain WHY this member was chosen (e.g., "Strong in coding (5/5), available 15h").
3. Do not assign a member more tasks than their availability allows.
4. If no good match exists (>0.3 threshold), leave the task unmatched and list it in unmatchedTaskIds.
5. Consider task dependencies — prefer assigning sequential tasks to the same person for continuity.
6. Return JSON ONLY. No markdown, no code fences.`;

export const SKILL_AGENT_USER = (tasks: Task[], members: Member[]) => `Match these tasks to team members.

TASKS TO ASSIGN:
${tasks.map((t) => `- [${t.id}] ${t.title} (priority: ${t.priority}, est: ${t.estimatedHours}h, skills: ${t.requiredSkills.join(', ')})`).join('\n')}

TEAM MEMBERS:
${members.map((m) => `- [${m.id}] ${m.name} (${m.role})
  Skills: ${m.skills.map((s) => `${s}(${m.skillProficiency[s]}/5)`).join(', ')}
  Availability: ${m.availability}h/week
  Current tasks: ${m.currentTaskIds.length}`).join('\n')}

Return JSON:
{
  "assignmentId": "asg-001",
  "assignments": [
    {
      "taskId": "task-001",
      "memberId": "mem-001",
      "matchScore": 0.92,
      "matchReason": "Strong in research (5/5) and analysis (5/5), available 14h",
      "assignedAt": "ISO timestamp"
    }
  ],
  "unmatchedTaskIds": ["task-009"],
  "generatedAt": "ISO timestamp"
}`;

// ===== Agent 4: Risk Detection (FR-006) =====
// Input: Tasks + Members + Deadline + Progress
// Output: RiskAssessment with flags[]

export const RISK_AGENT_SYSTEM = `You are RiskDetector, a project risk analyst for student teams.
Your job is to identify at-risk tasks that could jeopardize the project deadline or quality.

RISK TYPES (7 types in MVP):
- "deadline": Task running late, blocking critical path, or unlikely to finish before deadline.
- "dependency": Upstream task is delayed, blocking downstream work.
- "skill_gap": No team member has the required skills at adequate proficiency.
- "overload": Assigned member has too many tasks / not enough availability.
- "quality": Task quality at risk due to complexity vs. skill level mismatch.
- "insufficient_time": Task estimated hours exceed available time in the deadline window, even if not yet started.
- "unassigned": Task has no member assigned (assignedTo is null), blocking execution.

RISK LEVELS: "high" (immediate action needed), "medium" (monitor closely), "low" (minor concern).

RULES:
1. Every flag must have: taskId, riskLevel, riskType, description, recommendation (specific actionable advice).
2. Be specific in recommendations — not "improve time management" but "Split task-002: finish personas first (4h) to unblock wireframing".
3. Use "unassigned" riskType when a task has no assignee (not "skill_gap" — those are different issues).
4. Use "insufficient_time" when the total remaining hours for a task + its dependency chain exceed the member's weekly availability.
5. Calculate overallRiskLevel based on the highest individual risk level and number of flags.
6. Return JSON ONLY. No markdown, no code fences.`;

export const RISK_AGENT_USER = (
  tasks: Task[],
  members: Member[],
  deadline: DeadlineInfo | null,
  progress: ProjectProgress | null
) => `Analyze project risks.

DEADLINE: ${deadline?.deadline || 'No deadline'} (${deadline?.daysRemaining ?? '?'} days remaining, ${deadline?.isUrgent ? 'URGENT' : 'not urgent'})

TASKS WITH PROGRESS:
${tasks.map((t) => {
  const tp = progress?.taskProgress.find((p) => p.taskId === t.id);
  const assignee = members.find((m) => m.id === t.assignedTo);
  return `- [${t.id}] ${t.title}
  Status: ${t.status} | Priority: ${t.priority} | Complexity: ${t.complexity}
  Est: ${t.estimatedHours}h | Spent: ${tp?.hoursSpent ?? 0}h | Remaining: ${tp?.hoursRemaining ?? t.estimatedHours}h | Progress: ${tp?.completionPercent ?? 0}%
  Assigned: ${assignee?.name || 'UNASSIGNED'} | Dependencies: ${t.dependencies.length > 0 ? t.dependencies.join(', ') : 'none'}`;
}).join('\n')}

TEAM WORKLOAD:
${members.map((m) => `- ${m.name}: ${m.currentTaskIds.length} tasks, ${m.availability}h/week available`).join('\n')}

Identify all risks. Return JSON:
{
  "assignmentId": "asg-001",
  "flags": [
    {
      "taskId": "task-002",
      "riskLevel": "high",
      "riskType": "deadline",
      "description": "Specific risk description",
      "recommendation": "Specific actionable recommendation",
      "detectedAt": "ISO timestamp"
    }
  ],
  "overallRiskLevel": "medium",
  "assessedAt": "ISO timestamp"
}`;

// ===== Agent 5: Rescue Plan Generator (FR-012) =====
// Input: RiskAssessment + Tasks + Members
// Output: RescuePlan with actions[]

export const RESCUE_AGENT_SYSTEM = `You are RescuePlanner, a project rescue strategist.
Your job is to generate actionable rescue plans for at-risk projects. Each action should be
specific, have measurable impact, and be assignable.

ACTION TYPES:
- "reassign": Move a task to a different team member.
- "split": Break a task into smaller parallel sub-tasks.
- "escalate": Flag for team discussion / external help.
- "reduce_scope": Cut non-essential deliverables to save time.
- "add_resource": Bring in additional capacity (borrow from another team).
- "reorder": Change task sequence to unblock the critical path.

MVP — 6-STEP RESCUE WORKFLOW:
1. Detect: Identify risks from the RiskAssessment input.
2. Analyze: Evaluate impact on critical path, dependencies, and rubric coverage.
3. Optimize: Generate rescue actions, prioritized by:
   a. Rubric-aware priority: Tasks covering more rubric marks are rescued first.
   b. Critical path impact: Actions that unblock the most downstream tasks.
   c. Feasibility: Actions that can be executed within member availability.
4. Validate: Check that proposed actions don't break dependencies, reduce rubric coverage,
   or introduce circular dependencies. Set requiresLeaderApproval if any action affects
   a confirmed task (task.confirmed === true).
5. Apply: Auto-apply actions on unconfirmed + not-started tasks (status="todo", confirmed=false).
   For confirmed tasks, set approvalStatus to "pending" and requiresLeaderApproval to true.
6. Compare: Generate before/after comparison (hours, risk level, tasks at risk, deadline buffer).

MVP — PERMISSION RULES:
- Unconfirmed + not-started tasks (confirmed=false, status="todo"): AUTO-MODIFY — no approval needed.
- Confirmed tasks (confirmed=true): REQUIRE LEADER APPROVAL — set requiresLeaderApproval=true.
- In-progress tasks (status="in-progress"): ALWAYS require Leader approval, regardless of confirmed.

MVP — MAX 3 OPTIMIZATION ROUNDS:
- Round 1: Generate initial rescue plan. If validation fails or comparison shows negative impact,
  proceed to Round 2 with adjusted actions.
- Round 2: Refine plan based on Round 1 feedback. If still not sufficient, proceed to Round 3.
- Round 3: Final attempt. If plan is still insufficient after 3 rounds, escalate to Leader
  with a "manual intervention required" message.
- Track optimizationRound in workflow state. Stop when comparison shows improvement.

RULES:
1. Each action must have: id, taskId, actionType, description, priority, estimatedImpact, assignedTo.
2. estimatedImpact should quantify the benefit: "Saves ~3h", "Unblocks task-005", "Reduces risk to low".
3. Prioritize actions by impact on the critical path.
4. projectedRecovery: summarize the expected outcome after all actions are taken.
5. confidence: 0.0-1.0 — how confident you are in the recovery plan.
6. Return JSON ONLY. No markdown, no code fences.`;

export const RESCUE_AGENT_USER = (
  riskAssessment: RiskAssessment,
  tasks: Task[],
  members: Member[]
) => `Generate a rescue plan for this project.

RISK ASSESSMENT (Overall: ${riskAssessment.overallRiskLevel}):
${riskAssessment.flags.map((f) => `- [${f.taskId}] ${f.riskLevel.toUpperCase()} - ${f.riskType}
  ${f.description}
  Recommendation: ${f.recommendation}`).join('\n')}

TASKS (with confirmation status for permission rules):
${tasks.map((t) => `- [${t.id}] ${t.title}
  Status: ${t.status} | Priority: ${t.priority} | Confirmed: ${t.confirmed} | Est: ${t.estimatedHours}h
  Assigned: ${members.find((m) => m.id === t.assignedTo)?.name || 'UNASSIGNED'}
  Related Rubric IDs: ${t.relatedRubricIds.join(', ') || 'none'}
  → Permission: ${t.confirmed ? 'REQUIRES LEADER APPROVAL' : (t.status === 'todo' ? 'AUTO-MODIFY OK' : 'REQUIRES LEADER APPROVAL (in-progress)')}`).join('\n')}

TEAM MEMBERS:
${members.map((m) => `- [${m.id}] ${m.name} (${m.role})${m.isLeader ? ' [LEADER]' : ''} - Skills: ${m.skills.map((s) => `${s}(${m.skillProficiency[s]}/5)`).join(', ')} - Available: ${m.availability}h`).join('\n')}

RUBRIC-AWARE PRIORITY: Rescue tasks that cover more rubric marks first.
Task → Rubric marks covered:
${tasks.map((t) => `  ${t.id}: ${t.relatedRubricIds.length} rubric items`).join('\n')}

Generate a rescue plan following the 6-step workflow (Detect→Analyze→Optimize→Validate→Apply→Compare).
Max 3 optimization rounds. Include workflow state, comparison result, and approval status.
Return JSON:
{
  "assignmentId": "asg-001",
  "actions": [
    {
      "id": "res-001",
      "taskId": "task-002",
      "actionType": "split",
      "description": "Specific action description",
      "priority": "critical",
      "estimatedImpact": "Saves ~4h of blocking time",
      "assignedTo": "mem-003"
    }
  ],
  "projectedRecovery": "On track for deadline with ~4h buffer after rescue actions",
  "confidence": 0.82,
  "generatedAt": "ISO timestamp",
  "workflow": {
    "currentStep": "compare",
    "optimizationRound": 1,
    "maxRounds": 3,
    "stepHistory": []
  },
  "requiresLeaderApproval": true,
  "approvalStatus": "approved",
  "comparisonResult": {
    "beforeHours": 57,
    "afterHours": 50,
    "hoursSaved": 7,
    "beforeRiskLevel": "medium",
    "afterRiskLevel": "none",
    "beforeTasksAtRisk": 5,
    "afterTasksAtRisk": 0,
    "beforeDeadlineBuffer": -4,
    "afterDeadlineBuffer": 4,
    "improvementSummary": "Rescue plan saved 7 hours, resolved all risks"
  }
}`;

// ===== Helper: Build LLM call params for each agent =====

export function buildRubricAgentCall(assignment: Assignment): LLMCallParams {
  return {
    systemPrompt: RUBRIC_AGENT_SYSTEM,
    userPrompt: RUBRIC_AGENT_USER(assignment),
    temperature: 0.3, // low temperature for structured extraction
    responseFormat: 'json_object',
  };
}

export function buildTaskAgentCall(assignment: Assignment, rubric: RubricResult): LLMCallParams {
  return {
    systemPrompt: TASK_AGENT_SYSTEM,
    userPrompt: TASK_AGENT_USER(assignment, rubric),
    temperature: 0.4, // some creativity for task decomposition
    responseFormat: 'json_object',
  };
}

export function buildSkillAgentCall(tasks: Task[], members: Member[]): LLMCallParams {
  return {
    systemPrompt: SKILL_AGENT_SYSTEM,
    userPrompt: SKILL_AGENT_USER(tasks, members),
    temperature: 0.2, // low temperature for optimization
    responseFormat: 'json_object',
  };
}

export function buildRiskAgentCall(
  tasks: Task[],
  members: Member[],
  deadline: DeadlineInfo | null,
  progress: ProjectProgress | null
): LLMCallParams {
  return {
    systemPrompt: RISK_AGENT_SYSTEM,
    userPrompt: RISK_AGENT_USER(tasks, members, deadline, progress),
    temperature: 0.3,
    responseFormat: 'json_object',
  };
}

export function buildRescueAgentCall(
  riskAssessment: RiskAssessment,
  tasks: Task[],
  members: Member[]
): LLMCallParams {
  return {
    systemPrompt: RESCUE_AGENT_SYSTEM,
    userPrompt: RESCUE_AGENT_USER(riskAssessment, tasks, members),
    temperature: 0.4,
    responseFormat: 'json_object',
  };
}

// ===== Before/After Rescue Data =====
// Used for the killer demo view (FR-014)

export interface BeforeAfterData {
  before: {
    title: string;
    totalHours: number;
    tasksAtRisk: number;
    blockers: string[];
    deadlineStatus: string;
    projectedOutcome: string;
    overallRisk: string;
  };
  after: {
    title: string;
    totalHours: number;
    hoursSaved: number;
    tasksResolved: number;
    actionsTaken: string[];
    deadlineStatus: string;
    projectedOutcome: string;
    bufferHours: number;
    overallRisk: string;
  };
}
