# PlanPilot AI — Hackathon Final MVP Requirements

> Track 2: WorkBuddy Agentic Solution
> Last updated: 2026-10-11
> Status: All P0 items implemented in code + UI (Mockup 2) live. Per-project task data fully dynamic via `getProjectTK()`/`getProjectGT()`. P1 frontend items partially done.

---

## 1. Core Concept

**PlanPilot AI** = AI Project Manager for university group assignments.

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

## 13. Demo UI — Full Next.js App (Mockup 2)

The app renders at `http://localhost:3000` via `page.tsx` → `PlanPilotMockup2`. It includes 8 screens with real API integration where applicable.

1. **Project (Home)** — Landing page with hero, 4-step flow, project cards (At Risk / On Track / Completed), "Create new project" button, contribution report on completed projects
2. **Create** — Step 1: project name, description, team size, assignment upload (PDF/DOCX via `/api/upload`), rubric, deadline. Back button to Home.
3. **Team** — Step 2: add/edit/remove members with strengths (Beginner/Intermediate/Advanced), weaknesses, weekly availability, leader designation
4. **Review** — Step 3: review summary before running AI
5. **AI Analysis** — 9-stage pipeline visualization calling real `/api/pipeline/run` endpoint
6. **Overview** — Per-project workspace: predicted completion, deadline risk, team progress (expandable), contribution report for completed projects
7. **Tasks** — List + Board views, task detail drawer (view/edit), accept/reject for members, lock for leader
8. **Timeline** — Per-project Gantt chart with deadline + predicted completion markers
9. **AI Deadline Defender** — 3-phase rescue: (1) risk alert + reason selection → (2) live run via `/api/pipeline/rescue` → (3) priority plan with approve/reject + Before/After comparison

### Screen-to-Data Mapping:
| Screen | Component | Data Source |
| --- | --- | --- |
| Project | `ProjectScreen` in `Mockup2Screens.tsx` | `PROJECTS` mock array |
| Create | `CreateScreen` in `Mockup2Screens.tsx` | Form state + `/api/upload` |
| Team | `TeamScreen` in `Mockup2Screens.tsx` | `MEM` mock + local state |
| Review | `ReviewScreen` in `Mockup2Screens.tsx` | Summary of Create + Team |
| AI Analysis | `AnalysisScreen` in `Mockup2Screens.tsx` | `/api/pipeline/run` |
| Overview | `OverviewScreen` in `Mockup2Screens.tsx` | `useTaskStore` + per-project filter |
| Tasks | `TasksScreen` in `Mockup2Screens.tsx` | `TK` mock (filtered by project) |
| Timeline | `TimelineScreen` in `Mockup2Screens.tsx` | `GT` mock (filtered by project) |
| Defender | `Mockup2Defender.tsx` | `/api/pipeline/rescue` + `useTaskStore` |
| Overlays | `Mockup2Overlays.tsx` | `useMockupStore2` state |

---

## 14. P0/P1/P2 Priority Lists

### P0 (Must Have — All Done):
- 6-Agent Pipeline (Rubric→Task→Skill→CPM→Risk→Rescue) ✅
- Mock LLM layer (swappable to real cloud.llm) ✅
- External LLM integration (`external-llm.ts`) ✅
- Before/After rescue comparison demo ✅
- Full mockup2 UI with 8 screens ✅
- Per-project workspace (filter by active project) ✅
- Contribution report button on completed projects ✅
- PDF/DOCX upload with text extraction (`/api/upload`) ✅
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
- Resource-constrained scheduler ✅
- Rescue engine (`rescue-engine.ts`) ✅

### P1 (Should Have — Partially Done):
- Tasks search/filter — UI exists, filtering not yet functional
- Edit task save + re-schedule — UI exists, save not connected
- Lock task requiring leader approval — UI button exists, logic not connected
- Reject → re-assignment suggestion — UI exists, suggestion not shown
- Review page reflecting real Create input — partially done
- WorkBuddy cloud.llm integration — `cloud-llm.ts` ready, needs activation

### P2 (Nice to Have):
- Mobile responsive verification
- Dark mode
- Accessibility (keyboard, screen reader)

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
| `src/lib/agents/mock-llm.ts` | Swappable mock LLM layer |
| `src/lib/agents/external-llm.ts` | Real LLM API integration |
| `src/lib/agents/cloud-llm.ts` | WorkBuddy cloud.llm integration (ready) |
| `src/lib/logic/scheduler.ts` | Resource-constrained scheduler |
| `src/lib/logic/critical-path.ts` | CPM algorithm |
| `src/lib/logic/plan-validator.ts` | Plan validation checks |
| `src/lib/logic/rescue-engine.ts` | 3-round rescue search engine |
| `src/lib/logic/rescue-comparison.ts` | Before/After comparison logic |
| `src/lib/logic/multi-member-assigner.ts` | Skill scoring + matching |
| `src/lib/mock/mockPlanPilot2.ts` | Mockup 2 data (screens, members, tasks, projects) |
| `src/lib/mock/*.ts` | All mock data (rubric, tasks, members, risk, rescue) |
| `src/app/api/pipeline/*/route.ts` | 7 pipeline API routes |
| `src/app/api/upload/route.ts` | PDF/DOCX upload + text extraction |
| `src/app/api/tasks/[id]/invitation/route.ts` | Accept/reject invitation |
| `src/app/page.tsx` | Entry point → renders PlanPilotMockup2 |
| `src/components/PlanPilotMockup2.tsx` | Mockup 2 main wrapper |
| `src/components/Mockup2Screens.tsx` | 8 screen components + helpers |
| `src/components/Mockup2Defender.tsx` | AI Deadline Defender (3-phase) |
| `src/components/Mockup2Overlays.tsx` | Drawers, modals, toasts |
| `src/store/useMockupStore2.ts` | Mockup 2 Zustand store (active) |
| `src/store/useTaskStore.ts` | Pipeline data store (Zustand) |
| `docs/FUNCTIONAL_LOGIC.md` | 15-section functional logic documentation |
| `docs/MVP_REQUIREMENTS.md` | This file |
| `docs/AI_AGENT_SPEC.md` | AI agent specs + prompt notes |
| `docs/ANALYSIS_PIPELINE.md` | 9-stage analysis pipeline spec |
| `docs/FEATURES_AND_LOGIC.md` | Features, remaining work, business logic |
| `docs/WORKBUDDY_AGENT_PROMPTS.md` | 6-agent prompt tuning guide |

---

*Document version: 2026-10-11 | Track 2: WorkBuddy Agentic Solution*
