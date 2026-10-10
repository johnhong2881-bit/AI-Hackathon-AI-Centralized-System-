# TaskFlow AI

> **Rubric-Aware Autonomous Deadline Defender**
> AI Project Manager for university group assignments.
> Track 2 — WorkBuddy Agentic Solution Hackathon.

## The Pitch

**Problem:** Every semester, 4 students get thrown into a group project with a rubric PDF and a deadline. No project manager, no visibility, just chaos — nobody knows who does what until week 4, the deadline sneaks up, and rubric criteria get missed.

**Solution:** TaskFlow AI. Paste your assignment → 6 AI agents run autonomously → get a full execution plan with every task assigned, every risk caught, and the deadline defended.

**One Prompt → One Goal → End-to-End Execution**

## Quick Start

```bash
npm install      # only once
npm run dev      # starts at http://localhost:3000
```

## What's Built

### Full UI (Mockup 2 — Next.js App)

The app opens to a **Project landing page** with a hero, 4-step flow guide, and recent project cards. From there:

| Screen | What It Does |
|--------|-------------|
| **Project (Home)** | Landing page with project cards (At Risk / On Track / Completed), "Create new project" button, contribution report button on completed projects |
| **Create** | Step 1 of project setup — name, description, team size, assignment upload (PDF/DOCX or paste text), rubric, deadline. Back button to return to Home |
| **Team** | Step 2 — add/edit/remove team members with strengths (Beginner/Intermediate/Advanced), weaknesses, weekly availability per day, leader designation |
| **Review** | Step 3 — review project summary and team summary before running AI analysis |
| **AI Analysis** | 9-stage pipeline visualization (Reading Assignment → Validating Plan) with real API calls to the 6-agent pipeline |
| **Overview** | Per-project workspace: predicted completion timeline, deadline risk alert, team progress with expandable member rows, task lists, contribution report for completed projects |
| **Tasks** | List + Board views, search/filter controls, task detail drawer with view/edit modes, accept/reject flow for members, lock button for leader |
| **Timeline** | Gantt chart with task bars, deadline marker, predicted completion marker, dependency chains |
| **AI Deadline Defender** | 3-phase rescue flow: (1) Risk alert + reason selection → (2) Live agent run with stage tracking + log box → (3) Priority plan with approve/reject + Before/After comparison table |

**Per-project workspace**: Clicking a project card sets the active project and filters all workspace screens (Overview, Tasks, Timeline, Defender) to show only that project's members and data. Non-SRS projects derive tasks and Gantt data from PGP (per-member progress) via `getProjectTK()` and `getProjectGT()`. All task counts (badges, open tasks, progress bars, Defender stats) are computed dynamically from the actual task data at runtime — no hardcoded counts. Completed projects show a completion alert instead of deadline risk.

**Role toggle**: Switch between Leader (Alice Tan) and Member (Bob Lee) views — leader sees edit/lock/approve buttons, member sees accept/reject on assigned tasks.

### Backend Pipeline (6 Agents)

| Agent | FR | Type | What It Does |
|-------|-----|------|-------------|
| Rubric Intelligence | FR-001 | LLM | Parses rubric text → structured criteria with Good/Average/Poor levels |
| Task Decomposition | FR-002 | LLM | Breaks assignment into tasks mapped to rubric, with multi-member assignments + personalized hours |
| Skill Matching | FR-003 | LLM + Program | Matches tasks to members by skill strengths/weaknesses + weekly availability |
| Critical Path | FR-004 | Deterministic | Resource-constrained scheduler + CPM (Kahn's topological sort + forward/backward pass) |
| Risk Detection | FR-006 | Program + LLM | Identifies 7 risk types (deadline, dependency, skill_gap, overload, quality, insufficient_time, unassigned) |
| Rescue Planner | FR-012 | Hybrid | 6-step rescue workflow (Detect → Analyze → Optimize → Validate → Apply → Compare) with max 3 optimization rounds |

### Logic Modules

| Module | File | Purpose |
|--------|------|---------|
| Scheduler | `src/lib/logic/scheduler.ts` | Resource-constrained scheduling — assigns tasks day-by-day per member availability, computes predicted completion date |
| Critical Path | `src/lib/logic/critical-path.ts` | CPM algorithm — topological sort + forward/backward pass for slack and critical path |
| Plan Validator | `src/lib/logic/plan-validator.ts` | Checks rubric coverage, member assignment, circular dependencies, deadline feasibility |
| Rescue Engine | `src/lib/logic/rescue-engine.ts` | 3-round rescue search with permission rules (auto-apply vs leader-approval) |
| Rescue Comparison | `src/lib/logic/rescue-comparison.ts` | Before/After comparison: hours saved, risk level change, deadline buffer swing |
| Multi-Member Assigner | `src/lib/logic/multi-member-assigner.ts` | Skill scoring + weakness penalty + spare hours → ranked candidate list |

### LLM Layers

| Layer | File | Status | Description |
|-------|------|--------|-------------|
| Mock LLM | `src/lib/agents/mock-llm.ts` | Active | Returns pre-built mock data, simulates network delay (1.5–2.4s). Swappable interface. |
| External LLM | `src/lib/agents/external-llm.ts` | Active | Calls real LLM APIs via WorkBuddy cloud SDK or external endpoints. Same `LLMCallParams → LLMCallResult` interface. |
| Cloud LLM | `src/lib/agents/cloud-llm.ts` | Ready | WorkBuddy `cloud.llm.chat.completions.create()` with `stream: true` and `response_format: { type: 'json_object' }`. |

Switching from mock to real: change the import in `mock-llm.ts` or configure the external-llm endpoint. Agent function signatures stay the same.

### API Routes

| Endpoint | Method | Purpose | FR |
|----------|--------|---------|-----|
| `/api/pipeline/run` | POST | Full 6-agent pipeline | All |
| `/api/pipeline/rubric` | POST | Rubric Intelligence only | FR-001 |
| `/api/pipeline/tasks` | POST | Task Decomposition only | FR-002 |
| `/api/pipeline/skills` | POST | Skill Matching only | FR-003 |
| `/api/pipeline/critical-path` | POST | Critical Path only | FR-004 |
| `/api/pipeline/risk` | POST | Risk Detection only | FR-006 |
| `/api/pipeline/rescue` | POST | Rescue Planner only | FR-012 |
| `/api/tasks/[id]/invitation` | POST | Accept/reject task invitation | — |
| `/api/upload` | POST | Upload PDF/DOCX → extract text | — |

## Project Structure

```
taskflow-ai/
├── src/
│   ├── types/types.ts                    # Shared data contract (all types)
│   ├── lib/
│   │   ├── agents/                       # 6-agent pipeline (backend)
│   │   │   ├── prompts.ts                # 5 LLM prompt templates
│   │   │   ├── orchestrator.ts           # 6-step pipeline runner
│   │   │   ├── mock-llm.ts              # Swappable mock LLM layer
│   │   │   ├── external-llm.ts          # Real LLM API integration
│   │   │   ├── cloud-llm.ts             # WorkBuddy cloud.llm integration
│   │   │   ├── types.ts                 # Agent type definitions
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── logic/                        # Deterministic algorithms
│   │   │   ├── scheduler.ts             # Resource-constrained scheduler
│   │   │   ├── critical-path.ts         # CPM algorithm
│   │   │   ├── plan-validator.ts        # Plan validation checks
│   │   │   ├── rescue-engine.ts         # 3-round rescue search
│   │   │   ├── rescue-comparison.ts     # Before/After comparison
│   │   │   ├── multi-member-assigner.ts # Skill scoring + matching
│   │   │   └── __test__/scheduler.test.ts
│   │   ├── mock/                         # Mock data + 2 demo scenarios
│   │   │   ├── mockTaskflow2.ts         # Mockup 2 data (screens, members, tasks, projects, per-project derivation)
│   │   │   ├── mockTaskflow.ts          # Mockup 1 data (legacy)
│   │   │   ├── mockAssignment.ts
│   │   │   ├── mockMembers.ts
│   │   │   ├── mockPlanResult.ts
│   │   │   ├── mockRubric.ts
│   │   │   ├── mockTasks.ts
│   │   │   ├── mockRiskFlags.ts
│   │   │   └── scenario2-software.ts
│   │   ├── cloud/config.ts              # WorkBuddy cloud SDK config
│   │   └── utils/helpers.ts             # Formatting, sorting, deadline utils
│   ├── store/
│   │   ├── useMockupStore2.ts           # Mockup 2 Zustand store (active)
│   │   ├── useMockupStore.ts            # Mockup 1 store (legacy)
│   │   └── useTaskStore.ts              # Pipeline data store (Zustand)
│   ├── components/
│   │   ├── TaskFlowMockup2.tsx          # Mockup 2 main wrapper
│   │   ├── Mockup2Screens.tsx           # 8 screen components + helpers
│   │   ├── Mockup2Defender.tsx          # AI Deadline Defender (3-phase)
│   │   ├── Mockup2Overlays.tsx          # Drawers, modals, toasts
│   │   ├── TaskFlowMockup.tsx           # Mockup 1 wrapper (legacy)
│   │   ├── PipelineRunner.tsx           # 6-agent pipeline visualization
│   │   ├── BeforeAfterComparison.tsx    # Before/After rescue comparison
│   │   ├── AssignmentInputForm.tsx      # Assignment entry form
│   │   ├── KanbanBoard.tsx              # Task board (list + kanban)
│   │   ├── GanttChart.tsx               # Gantt chart
│   │   ├── Dashboard.tsx                # Project dashboard
│   │   ├── MemberCard.tsx              # Member card with skills
│   │   ├── CountdownTimer.tsx          # Real-time countdown
│   │   ├── TaskDetailPanel.tsx         # Task detail side panel
│   │   └── RescuePlanModal.tsx         # Rescue plan modal
│   └── app/
│       ├── page.tsx                      # Entry point → renders TaskFlowMockup2
│       ├── layout.tsx                   # Root layout
│       └── api/
│           ├── pipeline/                 # 7 pipeline API routes
│           │   ├── run/route.ts         # Full pipeline
│           │   ├── rubric/route.ts      # FR-001
│           │   ├── tasks/route.ts       # FR-002
│           │   ├── skills/route.ts      # FR-003
│           │   ├── critical-path/route.ts # FR-004
│           │   ├── risk/route.ts        # FR-006
│           │   └── rescue/route.ts      # FR-012
│           ├── tasks/[id]/invitation/route.ts # Accept/reject
│           └── upload/route.ts          # PDF/DOCX upload + text extraction
├── docs/                                 # Project documentation
│   ├── FUNCTIONAL_LOGIC.md              # Full functional spec (15 sections)
│   ├── MVP_REQUIREMENTS.md              # Hackathon MVP requirements
│   ├── AI_AGENT_SPEC.md                # AI agent specs + prompts
│   ├── ANALYSIS_PIPELINE.md            # 9-stage analysis pipeline spec
│   ├── FEATURES_AND_LOGIC.md           # Features, remaining work, business logic
│   └── WORKBUDDY_AGENT_PROMPTS.md      # 6-agent prompt tuning guide
├── rubric-sample.json                   # Sample rubric for testing
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Track 2 Judging Criteria

| Criterion | How We Address It |
|-----------|-------------------|
| Real Problem & User Value | Every student knows group project chaos — personal use case |
| Agentic Workflow | 6 agents in pipeline, visible step-by-step execution with live logs |
| Meaningful Use of WorkBuddy | LLM agents (mock→real swap ready) + CPM scheduler algorithm |
| End-to-End Execution | 1 prompt → full plan with tasks, assignments, risks, rescue |
| Usable & Verifiable Results | Before/After comparison with measurable metrics + per-project workspace |

## Status

### Done
- [x] Full mockup2 UI with 8 screens (Project, Create, Team, Review, AI Analysis, Overview, Tasks, Timeline, Defender)
- [x] Per-project workspace view (filter members/tasks/timeline by active project)
- [x] Per-project task derivation: `getProjectTK()` / `getProjectGT()` derive tasks and Gantt data from PGP for non-SRS projects
- [x] Dynamic task counts everywhere — badge, open tasks, progress bars, Defender stats all computed from `getProjectTK()` at runtime
- [x] Contribution report button on completed projects
- [x] Shared data contract (`types.ts`)
- [x] 5 LLM prompt templates (`prompts.ts`)
- [x] 6-agent pipeline orchestrator with progress callbacks
- [x] Mock LLM layer + external LLM + cloud LLM (3 swappable layers)
- [x] Resource-constrained scheduler + CPM algorithm
- [x] Plan validator (rubric coverage, circular deps, deadline feasibility)
- [x] Rescue engine (3-round search, permission rules, before/after comparison)
- [x] 7 API routes (pipeline) + 1 upload route + 1 invitation route
- [x] 2 demo scenarios (CS3041 HCI + CS3215 Software Engineering)
- [x] PDF/DOCX upload with text extraction (pdf-parse + mammoth)
- [x] Rubric Good/Average/Poor levels
- [x] 7 risk types
- [x] 6-step rescue workflow
- [x] Max 3 optimization rounds
- [x] Rescue permission rules (auto-apply vs leader-approval)
- [x] Multi-member tasks with personalized hours
- [x] Accept/reject invitation flow
- [x] Weekly availability per day
- [x] Role toggle (Leader / Member views)

### TODO
- [ ] Tasks search/filter to actually filter the task list
- [ ] Edit task to save and re-schedule
- [ ] Lock task to require leader approval before AI changes
- [ ] Reject → re-assignment suggestion UI
- [ ] Review page to reflect real Create form input
- [ ] Mobile responsive layout verification
- [ ] Dark mode
- [ ] Accessibility (keyboard, screen reader)

## Git Workflow

```bash
# Always pull before starting:
git pull origin main

# Make changes, then:
git add .
git commit -m "feat: description"
git push origin main

# Never use --force. Use normal pull/merge/push flow.
```

## Tech Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Zustand (state management)
- Tabler Icons (webfont via CDN)
- Inter font (Google Fonts CDN)
- pdf-parse (PDF text extraction)
- mammoth (DOCX text extraction)
- WorkBuddy Cloud SDK (`@tencent-ai/workbuddy-cloud-sdk@dev`) — ready to activate
