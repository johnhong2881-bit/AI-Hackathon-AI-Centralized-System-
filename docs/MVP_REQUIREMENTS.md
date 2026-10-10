# TaskFlow AI — Hackathon Final MVP Requirements

> Track 2: WorkBuddy Agentic Solution
> Last updated: 2026-10-10
> Status: All P0 items implemented in code + documented in FUNCTIONAL_LOGIC.md Section 15

---

## 1. Core Concept

**TaskFlow AI** = AI Project Manager for university group assignments.

**Tagline:** "4 students. 6 weeks. 1 grade. AI makes sure nobody drops the ball."

**Core Innovation:** Rubric-Aware Autonomous Deadline Defender — not just detects risks, but autonomously generates and applies rescue plans with rubric-aware priority.

---

## 2. Rubric Intelligence (FR-001)

- Input: Assignment text + Rubric text (Text paste in MVP, PDF planned for future, image OCR not supported)
- Output: Structured RubricResult with Good/Average/Poor level requirements per criterion
- Each RubricItem includes:
  - `criteria`, `marks`, `weightage`, `mandatory`, `description`
  - `goodLevelRequirements`: target standard (description + estimatedHours + keyDeliverables[])
  - `averageLevelRequirements`: minimum acceptable (description + estimatedHours + keyDeliverables[])
  - `poorLevelRequirements`: below standard (description + estimatedHours + keyDeliverables[])
- LLM Agent: `RUBRIC_AGENT_SYSTEM` in `prompts.ts`, temperature 0.3

---

## 3. Task Decomposition (FR-002)

- Input: Assignment + RubricResult
- Output: PlanResult with 8-15 tasks
- Each Task includes:
  - Standard fields: id, title, description, requiredSkills, estimatedHours, complexity, priority, dependencies, relatedRubricIds, status, assignedTo, confirmed, order
  - MVP: `memberAssignments?: MemberTaskAssignment[]` — multi-member with personalized hours
  - MVP: `invitationStatus?: 'pending' | 'accepted' | 'rejected'` — accept/reject flow
  - MVP: `rejectReason?: string | null` — reason if rejected
- PlanResult includes:
  - `rubricCoverage`: planned coverage (NOT predicted grades)
  - `validation?: PlanValidationResult`: deterministic check after decomposition

---

## 4. Multi-Member Tasks + Personalized Time Estimation

- Same task can have multiple members with different estimated hours each
- MemberTaskAssignment: `{ memberId, estimatedHours, matchScore, role, invitationStatus, rejectReason? }`
- Roles: "Primary", "Support", "Reviewer", etc.
- Mock examples:
  - task-005 (Build Prototype): mem-001 (6h, Primary) + mem-002 (4h, Support)
  - task-010 (Presentation): 4 members, each 1-2h, different roles

---

## 5. Accept/Reject Flow

- AI assigns task → `invitationStatus: 'pending'`
- Member receives notification → accepts (`'accepted'`) or rejects (`'rejected'` + `rejectReason`)
- Rejected tasks return to unassigned, Rescue Agent reassigns
- Mock example: task-009 (Report Writing) rejected by mem-002: "at capacity with task-003 and task-004"

---

## 6. Skill Matching (FR-003)

- Input: Tasks + Members (with weeklyAvailability per day)
- Output: SkillMatchResult with assignments[] + unmatchedTaskIds[]
- Member.weeklyAvailability: `{ monday, tuesday, wednesday, thursday, friday, saturday, sunday }` (hours per day)
- Match score: 0.0-1.0 based on skill proficiency (1-5 scale) + availability

---

## 7. Critical Path (FR-004)

- Deterministic CPM algorithm (Kahn's topological sort + forward/backward pass)
- Output: CriticalPathResult with nodes[] (earlyStart/Finish, lateStart/Finish, slack, isCritical)
- Tasks with slack=0 are critical
- No LLM — pure algorithm

---

## 8. Risk Detection (FR-006) — 7 Risk Types

1. `deadline` — task running late, blocking critical path
2. `dependency` — upstream task delayed
3. `skill_gap` — no member has required skills
4. `overload` — assigned member has too many tasks
5. `quality` — complexity vs skill mismatch
6. `insufficient_time` — estimated hours exceed available time in deadline window
7. `unassigned` — task has no member assigned (assignedTo === null)

- LLM Agent: `RISK_AGENT_SYSTEM` in `prompts.ts`, temperature 0.3
- Risk levels: high (immediate action), medium (monitor), low (minor)

---

## 9. Autonomous Deadline Defender — 6-Step Rescue Workflow (FR-012)

### Workflow Steps:
1. **Detect** — Identify risks from RiskAssessment
2. **Analyze** — Evaluate impact on critical path, dependencies, rubric coverage
3. **Optimize** — Generate rescue actions, prioritized by:
   - a. Rubric-aware priority: tasks covering more rubric marks rescued first
   - b. Critical path impact: actions that unblock most downstream tasks
   - c. Feasibility: actions executable within member availability
4. **Validate** — Check no circular deps, rubric coverage maintained, deadline feasible
5. **Apply** — Auto-apply on unconfirmed+todo tasks; confirmed tasks need Leader approval
6. **Compare** — Generate before/after comparison (hours, risk level, tasks at risk, deadline buffer)

### Max 3 Optimization Rounds:
- Round 1: Initial plan → Validate → Compare → if improved: STOP
- Round 2: Refined plan → if still insufficient → Round 3
- Round 3: Final attempt → if still insufficient: ESCALATE to Leader
- Track via `optimizationRound` counter, `maxRounds: 3`
- Stop when comparison shows improvement

### Rescue Action Types:
- `reassign`, `split`, `escalate`, `reduce_scope`, `add_resource`, `reorder`

### Comparison Result (RescueComparisonResult):
- beforeHours / afterHours / hoursSaved
- beforeRiskLevel / afterRiskLevel
- beforeTasksAtRisk / afterTasksAtRisk
- beforeDeadlineBuffer / afterDeadlineBuffer
- improvementSummary

---

## 10. Rescue Permission Rules

| Task Status | confirmed | Can Auto-Modify? |
| --- | --- | --- |
| todo | false | YES — auto-modify |
| todo | true | NO — requires Leader approval |
| in-progress | any | NO — always requires Leader approval |
| done | any | NO — cannot modify |

- `requiresLeaderApproval: boolean` on RescuePlan
- `approvalStatus: 'pending' | 'approved' | 'rejected'` on RescuePlan
- Mock: res-001 (split task-002, confirmed=true) → Leader (David) approved

---

## 11. Rubric Coverage vs Actual Grades (Design Decision #4)

- `RubricCoverage`: which rubric criteria have tasks (planned coverage)
- This is NOT a prediction of actual grades
- Actual grades depend on execution quality, not just task completion
- Fields: coveredRubricIds[], uncoveredRubricIds[], totalMarks, maxMarks, coveragePercent

---

## 12. Plan Validator

- Deterministic validation after Task Decomposition
- Checks:
  - `rubricCoverageComplete`: all rubric criteria have tasks
  - `allTasksHaveMembers`: no unassigned tasks
  - `noCircularDependencies`: dependency graph is a DAG
  - `deadlineFeasible`: total hours < available time
- Output: `issues[]` + `suggestions[]`
- Mock: isValid=false (3 unassigned tasks), with suggestions for each

---

## 13. Demo UI — 4 Sections

1. **Problem Hero** — "4 students. 6 weeks. 1 grade." pain point
2. **How It Works** — 3 steps: Paste → 6 AI Agents → Defended Plan
3. **Live Demo** — AssignmentInputForm + PipelineRunner (6-step visualization)
4. **Measurable Impact** — BeforeAfterComparison (killer demo: quantified rescue value)
5. **Architecture** — 6 AgentCards + Track 2 criteria coverage table

### 5-Scene Demo Story:
| Scene | Description | Component |
| --- | --- | --- |
| 1: Input | Paste Assignment + Rubric text | AssignmentInputForm |
| 2: Pipeline | 6-Agent real-time execution | PipelineRunner |
| 3: Plan | 11 tasks, multi-member, invitation status | TaskBoard (TODO) |
| 4: Risk + Rescue | 5 risks → 6-step rescue → comparison | BeforeAfterComparison |
| 5: Architecture | 6 Agent cards + Track 2 mapping | AgentCard section |

---

## 14. P0/P1/P2 Priority Lists

### P0 (Must Have — All Done):
- 6-Agent Pipeline (Rubric→Task→Skill→CPM→Risk→Rescue) ✅
- Mock LLM layer (swappable to real cloud.llm) ✅
- Before/After rescue comparison demo ✅
- Narrative-driven landing page ✅
- types.ts complete data contract ✅
- Rubric Good/Average/Poor levels ✅
- 7 risk types ✅
- 6-step rescue workflow ✅
- Max 3 optimization rounds ✅
- Rescue permission rules ✅
- Comparison result ✅
- Multi-member tasks + personalized hours ✅
- Accept/reject flow ✅
- Plan Validator ✅
- Weekly availability ✅

### P1 (Should Have — Frontend TODO):
- Kanban Board (@dnd-kit) — teammate
- Gantt Chart — teammate
- Task Detail Panel — teammate
- Rescue Plan Modal — teammate
- WorkBuddy cloud.llm integration — activate cloud-service

### P2 (Nice to Have):
- Hero typography polish
- Visual polish
- PDF upload (Assignment Input)

---

## 15. WorkBuddy Tool Calling

- Mock layer: `mock-llm.ts` with `LLMCallParams`/`LLMCallResult` interface
- Real layer: uncomment `realLLMCall()` in `mock-llm.ts`, uses `cloud.llm.chat.completions.create()` with `stream: true`
- Only one file changes when switching from mock to real
- All 5 agent functions (`callRubricAgent`, `callTaskAgent`, `callSkillAgent`, `callRiskAgent`, `callRescueAgent`) use the same interface

---

## 16. Design Decisions (6 Total)

1. **Input**: Text paste (MVP), PDF planned, image OCR not supported
2. **Team Size**: MVP supports 2-10 members (validated in API route)
3. **Leader Override**: Leader has final say (Member.isLeader + Task.confirmed)
4. **Rubric Marks**: Planned coverage ≠ predicted grades (RubricCoverage interface)
5. **Rescue Auto-Modify**: Unconfirmed+todo tasks auto-modifiable; confirmed needs approval
6. **Manual Progress**: Same workspace, manual update, no login system

---

## 17. File Locations

| File | Purpose |
| --- | --- |
| `src/types/types.ts` | Single source of truth for all data types |
| `src/lib/agents/prompts.ts` | 5 LLM prompt templates |
| `src/lib/agents/orchestrator.ts` | 6-step pipeline runner |
| `src/lib/agents/mock-llm.ts` | Swappable mock/real LLM layer |
| `src/lib/agents/critical-path.ts` | CPM algorithm |
| `src/lib/mock/*.ts` | All mock data (rubric, tasks, members, risk, rescue) |
| `src/app/api/pipeline/*/route.ts` | 7 API routes |
| `src/app/page.tsx` | Narrative-driven landing page |
| `src/components/*.tsx` | UI components |
| `docs/FUNCTIONAL_LOGIC.md` | 15-section functional logic documentation |

---

*Document version: 2026-10-10 | Track 2: WorkBuddy Agentic Solution*
