# TaskFlow AI

> **Rubric-Aware Autonomous Deadline Defender**
>
> An AI project manager for university group assignments. Paste your assignment rubric, add your team, and 6 autonomous AI agents produce a full execution plan — tasks decomposed, members assigned, risks detected, and the deadline defended.

**Track 2 — WorkBuddy Agentic Solution Hackathon**

---

## Table of Contents

1. [What Is TaskFlow AI?](#what-is-taskflow-ai)
2. [Who Is It For?](#who-is-it-for)
3. [The Problem We Solve](#the-problem-we-solve)
4. [How It Works — The 6-Agent Pipeline](#how-it-works--the-6-agent-pipeline)
5. [The AI Deadline Defender](#the-ai-deadline-defender)
6. [Technical Architecture](#technical-architecture)
7. [Tech Stack](#tech-stack)
8. [Quick Start](#quick-start)
9. [Environment Configuration](#environment-configuration)
10. [LLM Layer — 3 Swappable Modes](#llm-layer--3-swappable-modes)
11. [API Reference](#api-reference)
12. [Project Structure](#project-structure)
13. [Key Algorithms](#key-algorithms)
14. [Data Contract](#data-contract)
15. [Demo Scenarios](#demo-scenarios)
16. [Current Status](#current-status)

---

## What Is TaskFlow AI?

TaskFlow AI is a web application that automates the most painful parts of university group projects:

- **Parsing the rubric** into structured, actionable criteria
- **Breaking the assignment into tasks** mapped to those rubric criteria
- **Assigning tasks to team members** based on skills and availability
- **Scheduling with a resource-constrained scheduler** that respects per-person daily availability
- **Detecting risks** — overloaded members, deadline overruns, skill mismatches
- **Defending the deadline** — when time runs short, the AI prioritizes high-mark tasks to maximize your score

**One prompt → One goal → End-to-end execution.**

You paste your assignment, enter your team details, and hit "Run AI Analysis." The 6-agent pipeline runs autonomously and delivers a full project plan with a Gantt chart, risk flags, and — if needed — a rescue plan with before/after comparison.

---

## Who Is It For?

- **University students** (primary users) — especially in team-based courses where 4+ students must collaborate on a single graded deliverable with a shared rubric and deadline
- **Course instructors** — can use it to generate example task breakdowns and timelines for assignments they design
- **Hackathon judges** — it demonstrates a complete agentic workflow: LLM agents + deterministic algorithms, visible step-by-step execution, and verifiable results

---

## The Problem We Solve

Every semester, the same chaos:

1. **Unfair distribution** — Nobody knows who should do what. Tasks get assigned by vibes, not skills. The leader can reassign, but members can't push back easily.
2. **Last-minute deadline panic** — The deadline sneaks up. Nobody has tracked progress against the rubric. The team realizes too late that they can't finish everything.
3. **No visibility** — There's no Gantt chart, no risk alert, no "you're 5 days behind" warning until week 4.
4. **Rubric criteria get missed** — Mandatory requirements slip through the cracks because nobody mapped tasks back to the grading criteria.

**TaskFlow AI solves all four:**

| Problem | Solution |
|---------|----------|
| Unfair distribution | AI matches tasks to members by skill strengths/weaknesses + weekly availability |
| Last-minute deadline | Resource-constrained scheduler predicts completion date; Risk agent flags "At Risk" |
| No visibility | Full UI: Gantt chart, Kanban board, member load panels, countdown timer |
| Missed rubric criteria | Rubric agent extracts criteria; Task agent maps every task to rubric IDs; Plan validator checks coverage |

---

## How It Works — The 6-Agent Pipeline

The pipeline runs 6 agents in sequence. Each agent's output feeds the next. The pipeline is visible in the UI — you see each step running with real-time logs.

```
Assignment + Team Members
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Agent 1: Rubric Intelligence (LLM)                      │
│  Parse rubric text → structured criteria with            │
│  Good/Average/Poor levels, mandatory flags, marks       │
└──────────────────────┬──────────────────────────────────┘
                       │ RubricResult
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Agent 2: Task Decomposition (LLM)                       │
│  Break assignment into 8-25 tasks. Each task:            │
│  - mapped to rubric criteria (relatedRubricIds)           │
│  - has estimatedHours, requiredSkills, dependencies       │
│  - priority set to "medium" (code calculates real later)  │
└──────────────────────┬──────────────────────────────────┘
                       │ PlanResult (tasks + rubric coverage)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Agent 3: Skill Matching (LLM + Program)                 │
│  For each task: compute candidate scores (skill level,   │
│  weakness penalty, spare hours), then LLM picks best     │
│  member. Unmatched tasks are flagged, never forced.      │
└──────────────────────┬──────────────────────────────────┘
                       │ SkillMatchResult (assignments)
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Agent 4: Critical Path (Deterministic)                 │
│  Resource-constrained scheduler:                         │
│  - Day-by-day scheduling per member's daily capacity    │
│  - Respects dependencies + priority ordering            │
│  - Computes predicted completion date, deadline day,     │
│    delay days, risk status, member loads                │
│  - CPM: topological sort + forward/backward pass        │
└──────────────────────┬──────────────────────────────────┘
                       │ CriticalPathResult
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Agent 5: Risk Detection (Program + LLM)                │
│  CRITICAL: Risk status is computed by the scheduler.    │
│  The LLM ONLY writes a plain-language explanation        │
│  of the computed facts — it never decides the status.   │
│  7 risk types: deadline, dependency, skill_gap,        │
│  overload, quality, insufficient_time, unassigned       │
└──────────────────────┬──────────────────────────────────┘
                       │ RiskAssessment
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Agent 6: Rescue Planner (Hybrid)                        │
│  "AI Deadline Defender" — maximizes marks when time      │
│  is short. 3-round scheduler-validated search:           │
│  Round 1: Move unstarted work (no approval needed)       │
│  Round 2: Rebalance accepted work + relax dependencies  │
│  Round 3: Reduce low-priority scope                     │
│  Each round re-runs scheduler to validate.              │
│  Produces before/after comparison table.                │
└─────────────────────────────────────────────────────────┘
```

### Agent Summary Table

| # | Agent | Type | Input | Output | Temperature |
|---|-------|------|-------|--------|-------------|
| 1 | Rubric Intelligence | LLM | Assignment text + rubric | Structured criteria (Good/Avg/Poor) | 0.2 |
| 2 | Task Decomposition | LLM | Rubric + assignment + team skills | 8-25 tasks with dependencies | 0.3 |
| 3 | Skill Matching | LLM + Program | Tasks + members (skills, availability) | Assignments with matchScore | 0.2 |
| 4 | Critical Path | Deterministic | Tasks + members + deadline | Schedule, CPM, predicted completion | — |
| 5 | Risk Detection | Program + LLM | Schedule facts + tasks + members | Risk flags + plain-language explanation | 0.1 |
| 6 | Rescue Planner | Hybrid | Risk + tasks + members + leader reason | Rescue actions + before/after comparison | 0.3 |

### Key Design Principle: LLM Never Decides Risk Status

The risk status ("On Track", "At Risk", "Overdue", "Complete") is **always computed by the deterministic scheduler**, never by the LLM. The LLM's job in the Risk agent is purely to write a human-readable explanation of the computed facts. This prevents hallucinated risk assessments and makes the system verifiable.

---

## The AI Deadline Defender

When the scheduler detects that the project is "At Risk" or "Overdue", the AI Deadline Defender kicks in. It reframes the problem from "rescue the project" to **"maximize marks with the time remaining."**

### The Marks-Maximization Strategy

The Defender doesn't try to finish everything. It computes an **effort-to-score ratio** for each task:

```
ratio = markValue / estimatedHours
```

Tasks are then categorized:

- **Do First** — high marks, low effort, high ratio (quick wins)
- **If Time Permits** — lower ratio but still completable
- **Drop Candidate** — very low marks or very high effort relative to marks

### 3-Round Rescue Search

| Round | What It Does | Permission |
|-------|-------------|------------|
| Round 1 | Move unstarted work to members with spare capacity | Auto-applied (no approval) |
| Round 2 | Rebalance accepted work + relax dependencies | Leader approval required |
| Round 3 | Reduce scope on low-priority non-mandatory tasks | Leader approval required |

Each round re-runs the scheduler to validate that the changes actually improve the timeline. The search stops at the first round that meets the deadline.

### Leader Reason Integration

The leader can select a reason for the rescue, which adjusts the search strategy:

| Reason | Strategy |
|--------|----------|
| Not enough time | Maximize marks — prioritize high-ratio tasks, drop low-value work |
| Member unavailable | Reassign ALL of that member's remaining work |
| Member overloaded | Transfer their low-mark, high-effort work first |
| Skills don't match | Transfer mismatched tasks to better-skilled members |
| Deadline moved earlier | Recalculate with tighter deadline, more aggressive dropping |

### Before/After Comparison

The Defender produces a comparison table showing:

- Total hours (before → after)
- Risk level (before → after)
- Tasks at risk (before → after)
- Deadline buffer in hours (before → after)
- Improvement summary

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                 │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  UI Screens  │  │  Zustand     │  │  API Client     │ │
│  │  (8 screens) │  │  Stores      │──│  (fetch calls)  │ │
│  │              │  │  (2 stores)  │  │                  │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘ │
│         │                 │                    │           │
│         └─────────────────┼────────────────────┘           │
│                           │                                │
├───────────────────────────┼────────────────────────────────┤
│                    Next.js API Routes                      │
│                           │                                │
│  /api/pipeline/rubric     /api/pipeline/tasks              │
│  /api/pipeline/skills     /api/pipeline/critical-path      │
│  /api/pipeline/risk       /api/pipeline/rescue             │
│  /api/pipeline/run (full) /api/upload  /api/tasks/[id]    │
│                           │                                │
├───────────────────────────┼────────────────────────────────┤
│                    Backend Logic                           │
│                           │                                │
│  ┌────────────────────────┴────────────────────────────┐  │
│  │              Pipeline Orchestrator                   │  │
│  │  (runs 6 agents in sequence with progress callbacks) │  │
│  └───┬───────┬───────┬───────┬───────┬───────┬─────────┘  │
│      │       │       │       │       │       │             │
│  ┌───▼──┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼───┐┌──▼─────────┐  │
│  │Rubric││Task  ││Skill ││Crit  ││Risk  ││Rescue      │  │
│  │Agent ││Agent ││Agent ││Path  ││Agent ││Planner     │  │
│  │(LLM) ││(LLM) ││(LLM+ ││(Det) ││(P+LLM)││(Hybrid)   │  │
│  └──────┘└──────┘│Prog) │└──────┘└──────┘└────────────┘  │
│                    └──────┘                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            LLM Router (mock-llm.ts)                  │  │
│  │  Routes to: cloud > sovern > mock                    │  │
│  └──────────┬───────────────┬──────────────┬───────────┘  │
│             │               │              │               │
│  ┌──────────▼──┐ ┌─────────▼──────┐ ┌────▼──────────┐    │
│  │ WorkBuddy   │ │ SovernStack    │ │ Mock LLM      │    │
│  │ Cloud SDK   │ │ API (GPT-OSS   │ │ (pre-built    │    │
│  │ (cloud-llm) │ │ 120B)          │ │  test data)   │    │
│  └─────────────┘ └────────────────┘ └───────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Frontend → Backend Flow

1. User fills the Create form (assignment text/rubric, team members, deadline)
2. User clicks "Run AI Analysis"
3. `PipelineRunner.tsx` calls 6 API routes sequentially:
   - `POST /api/pipeline/rubric` → rubric criteria
   - `POST /api/pipeline/tasks` → decomposed tasks
   - `POST /api/pipeline/skills` → skill matching
   - `POST /api/pipeline/critical-path` → scheduler + CPM
   - `POST /api/pipeline/risk` → risk assessment
   - `POST /api/pipeline/rescue` → rescue plan (if needed)
4. Each route calls the orchestrator or logic module
5. Results are stored in `useTaskStore` (Zustand)
6. UI components read from the store and render Overview, Tasks, Timeline, Defender

### State Management

| Store | File | Purpose |
|-------|------|---------|
| `useMockupStore2` | `src/store/useMockupStore2.ts` | UI state — active screen, active project, role toggle, task drawer, task overrides |
| `useTaskStore` | `src/store/useTaskStore.ts` | Pipeline data — rubric, plan, skill match, critical path, risk, rescue plan |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router) | Full-stack React framework with API routes |
| Language | TypeScript | Type safety across frontend + backend |
| Styling | Tailwind CSS | Utility-first CSS |
| State | Zustand | Lightweight state management (2 stores) |
| Icons | Lucide React + Tabler Icons (CDN) | UI icons |
| Charts | Recharts | Data visualizations |
| DnD | @dnd-kit/core + sortable | Drag-and-drop Kanban board |
| PDF parsing | pdf-parse | Extract text from uploaded PDFs |
| DOCX parsing | mammoth | Extract text from uploaded DOCX files |
| Cloud SDK | @tencent-ai/workbuddy-cloud-sdk | WorkBuddy Cloud LLM integration |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/johnhong2881-bit/AI-Hackathon-AI-Centralized-System-.git
cd AI-Hackathon-AI-Centralized-System-

# 2. Install dependencies
npm install

# 3. Copy environment config
cp .env.example .env

# 4. Run in mock mode (no API key needed)
npm run dev

# 5. Open http://localhost:3000
```

To use real LLM calls, see [Environment Configuration](#environment-configuration) below.

---

## Environment Configuration

Copy `.env.example` as `.env` and fill in your values:

```bash
# === SovernStack API (GPT-OSS 120B) ===
SOVERNSTACK_API_KEY=your_x_user_id_here
SOVERNSTACK_BASE_URL=https://api.sovernstack.com
SOVERNSTACK_MODEL=GPT-OSS 120B

# === WorkBuddy Cloud Service ===
WORKBUDDY_CLOUD_ENDPOINT=
WORKBUDDY_CLOUD_PUBLISHABLE_KEY=

# === App Config ===
# "mock"   = use mock LLM (no API calls, pre-built test data)
# "sovern" = use SovernStack API
NEXT_PUBLIC_LLM_MODE=mock
```

### SovernStack API Format

SovernStack uses custom headers (not the standard OpenAI format):

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `x-user-id` | Your API key (NOT `Authorization: Bearer`) |
| `x-model` | `GPT-OSS 120B` (model name in header, NOT in body) |

**Endpoint:** `POST https://api.sovernstack.com/llm/chat`

**Request body:**
```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.2,
  "max_tokens": 4096
}
```

**Response:** The `message` field is a **string** that contains JSON. It must be `JSON.parse()`d to get structured output. The `external-llm.ts` module handles this with automatic JSON extraction (strips markdown fences, finds JSON boundaries) and retry logic (max 2 retries on parse failure).

---

## LLM Layer — 3 Swappable Modes

The system has 3 LLM modes that are **auto-detected** from `.env` configuration. The interface (`LLMCallParams → LLMCallResult`) stays the same across all modes, so no other code changes when switching.

| Priority | Mode | Config Required | Description |
|----------|------|-----------------|-------------|
| 1 | `cloud` | `WORKBUDDY_CLOUD_ENDPOINT` + `WORKBUDDY_CLOUD_PUBLISHABLE_KEY` | WorkBuddy Cloud SDK `cloud.llm.chat.completions.create()` with `stream: true` and `response_format: { type: 'json_object' }` |
| 2 | `sovern` | `SOVERNSTACK_API_KEY` | SovernStack API call to GPT-OSS 120B with retry logic and JSON extraction |
| 3 | `mock` | None | Returns pre-built test data with simulated network latency (1.5–2.4s). No API calls. |

**Detection logic** (in `src/lib/cloud/config.ts`):
```
cloud > sovern > mock
```

If WorkBuddy Cloud is configured → use cloud. Else if SovernStack API key is set → use sovern. Else → mock.

---

## API Reference

### Pipeline Routes

| Endpoint | Method | Purpose | Agent |
|----------|--------|---------|-------|
| `/api/pipeline/run` | POST | Full 6-agent pipeline (all at once) | All |
| `/api/pipeline/rubric` | POST | Rubric Intelligence only | Agent 1 (FR-001) |
| `/api/pipeline/tasks` | POST | Task Decomposition only | Agent 2 (FR-002) |
| `/api/pipeline/skills` | POST | Skill Matching only | Agent 3 (FR-003) |
| `/api/pipeline/critical-path` | POST | Critical Path + scheduler only | Agent 4 (FR-004) |
| `/api/pipeline/risk` | POST | Risk Detection only | Agent 5 (FR-006) |
| `/api/pipeline/rescue` | POST | Rescue Planner only | Agent 6 (FR-012) |

### Other Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload` | POST | Upload PDF/DOCX → extract text |
| `/api/tasks/[id]/invitation` | POST | Accept/reject task invitation |

---

## Project Structure

```
taskflow-ai/
├── src/
│   ├── types/types.ts                    # Shared data contract (ALL types)
│   ├── lib/
│   │   ├── agents/                       # 6-agent pipeline (backend)
│   │   │   ├── prompts.ts                # 5 LLM prompt templates
│   │   │   ├── orchestrator.ts           # 6-step pipeline runner
│   │   │   ├── mock-llm.ts              # LLM router (mock > cloud > sovern)
│   │   │   ├── external-llm.ts          # SovernStack API integration
│   │   │   ├── cloud-llm.ts             # WorkBuddy Cloud SDK integration
│   │   │   ├── types.ts                 # Agent type definitions
│   │   │   └── index.ts                 # Barrel exports
│   │   ├── logic/                        # Deterministic algorithms
│   │   │   ├── scheduler.ts             # Resource-constrained scheduler + CPM
│   │   │   ├── critical-path.ts         # CPM algorithm (topological sort)
│   │   │   ├── plan-validator.ts        # Plan validation checks
│   │   │   ├── rescue-engine.ts         # 3-round rescue search
│   │   │   ├── rescue-comparison.ts     # Before/after comparison
│   │   │   ├── multi-member-assigner.ts # Skill scoring + matching
│   │   │   └── __test__/scheduler.test.ts
│   │   ├── mock/                         # Mock data + 2 demo scenarios
│   │   ├── cloud/config.ts              # WorkBuddy + SovernStack config
│   │   └── utils/helpers.ts             # Formatting, sorting, deadline utils
│   ├── store/
│   │   ├── useMockupStore2.ts           # UI state store (active)
│   │   ├── useMockupStore.ts            # Legacy UI store
│   │   └── useTaskStore.ts              # Pipeline data store
│   ├── components/
│   │   ├── TaskFlowMockup2.tsx          # Main UI wrapper
│   │   ├── Mockup2Screens.tsx           # 8 screen components
│   │   ├── Mockup2Defender.tsx          # AI Deadline Defender (3-phase)
│   │   ├── Mockup2Overlays.tsx          # Drawers, modals, toasts
│   │   ├── PipelineRunner.tsx           # 6-agent pipeline visualization
│   │   ├── BeforeAfterComparison.tsx    # Before/After rescue comparison
│   │   └── ... (KanbanBoard, GanttChart, Dashboard, etc.)
│   └── app/
│       ├── page.tsx                      # Entry → renders TaskFlowMockup2
│       ├── layout.tsx                   # Root layout
│       └── api/pipeline/               # 7 pipeline API routes
├── docs/                                 # Full project documentation
│   ├── FUNCTIONAL_LOGIC.md              # Complete functional spec (15 sections)
│   ├── MVP_REQUIREMENTS.md              # Hackathon MVP requirements
│   ├── AI_AGENT_SPEC.md                # AI agent specs + prompts
│   ├── ANALYSIS_PIPELINE.md            # 9-stage analysis pipeline spec
│   ├── FEATURES_AND_LOGIC.md           # Features, business logic
│   └── WORKBUDDY_AGENT_PROMPTS.md      # 6-agent prompt tuning guide
├── rubric-sample.json                   # Sample rubric for testing
├── package.json
└── next.config.js
```

---

## Key Algorithms

### 1. Resource-Constrained Scheduler (`scheduler.ts`)

The heart of the system. Schedules tasks day-by-day, respecting:

- **Per-person daily capacity** — each member has `weeklyAvailability` with hours per day (Mon–Sun)
- **Task dependencies** — a task can't start until all its dependencies finish
- **Priority ordering** — High → Medium → Low (Kahn's topological sort)
- **Multi-member assignments** — multiple members on the same task work in parallel from the same start day
- **Task status** — done tasks don't consume capacity; rejected assignments are excluded

**Algorithm:**
1. Find all "ready" tasks (dependencies no longer pending)
2. Sort by priority (High first), then by ID
3. For the highest-priority ready task:
   - Compute the dependency end day (latest of all deps)
   - Start day = max(0, depEnd + 1)
   - For each active assignment, schedule work day-by-day:
     - Check member's capacity for that day-of-week
     - Subtract already-used hours
     - Allocate free hours to this task's remaining work
     - Track used capacity per member per day
   - End day = max end day across all assignments
4. Repeat until all tasks are scheduled

**Edge cases:**
- Circular dependency → all remaining tasks marked as `cycle: true`
- No valid assignments → task marked as `blocked: true`
- Can't finish in 200 days → end day = 999 (infinity)

### 2. Risk Assessment (computed, never by LLM)

Risk status rules:
```
No open tasks           → Complete
Deadline day < 0        → Overdue
Predicted > deadline    → At Risk
Otherwise               → On Track
```

### 3. Critical Path Method

After scheduling, the critical path is found by:
1. Starting from the task that ends last
2. Following backward through its unfinished dependencies
3. At each step, picking the dependency that ends latest
4. The chain is the critical path

### 4. Rescue Search (3 rounds)

Each round generates candidate operations (move, relax, reduce), tests each one by cloning the task set and re-running the scheduler, and picks the one that gives the best score. Scoring uses a lexicographic comparison:

```
[predictedEnd, moveType, approval, skillFit, overloadedCount, hours]
```

Lower is better. The search stops at the first round that meets the deadline.

---

## Data Contract

All types are defined in **one file**: `src/types/types.ts`. Both frontend and backend import from here. Key types:

| Type | Description |
|------|-------------|
| `Assignment` | Input assignment (title, description, rubricText, deadline, teamSize, deliverables) |
| `Member` | Team member (skills, skillProficiency, weaknesses, weeklyAvailability, isLeader) |
| `RubricResult` | Structured rubric (items with Good/Average/Poor levels, totalMarks, warnings) |
| `PlanResult` | Decomposed tasks + rubric coverage + validation |
| `SkillMatchResult` | Assignments (taskId → memberId + matchScore + matchReason) |
| `CriticalPathResult` | Schedule nodes, CPM nodes, predicted completion, risk status, member loads |
| `RiskAssessment` | Risk flags (7 types) + overallRiskLevel |
| `RescuePlan` | Rescue actions + before/after comparison + workflow state |
| `MemberTaskAssignment` | Per-member assignment on a task (personalized hours, invitation status) |

---

## Demo Scenarios

The app ships with 2 pre-built demo scenarios:

| Scenario | Course | Description |
|----------|--------|-------------|
| CS3041 | Human-Computer Interaction | Research + presentation assignment |
| CS3215 | Software Engineering | Software development project |

Both have mock data for rubric, tasks, members, skills, risk, and rescue plans.

---

## Current Status

### Completed

- Full UI with 8 screens (Project, Create, Team, Review, AI Analysis, Overview, Tasks, Timeline, Defender)
- Per-project workspace (filter members/tasks/timeline by active project)
- 6-agent pipeline orchestrator with real-time progress callbacks
- 5 LLM prompt templates with prompt injection defense
- 3 swappable LLM layers (mock, SovernStack, WorkBuddy Cloud)
- Resource-constrained scheduler + CPM algorithm
- Plan validator (rubric coverage, circular deps, deadline feasibility)
- Rescue engine (3-round search, permission rules, before/after comparison)
- 7 API routes + upload route + invitation route
- PDF/DOCX upload with text extraction
- 7 risk types with scheduler-computed status
- 6-step rescue workflow with marks-maximization strategy
- Multi-member tasks with personalized hours
- Accept/reject invitation flow
- Role toggle (Leader / Member views)
- 2 demo scenarios

### Pending / TODO

- Tasks search/filter to actually filter the task list
- Edit task to save and re-schedule
- Lock task to require leader approval before AI changes
- Reject → re-assignment suggestion UI
- Mobile responsive layout verification
- Dark mode
- Accessibility (keyboard, screen reader)

---

## Git Workflow

```bash
# Always pull before starting
git pull origin main

# Make changes, then
git add .
git commit -m "feat: description"
git push origin main

# Never use --force — use normal pull/merge/push flow
```

**Repository:** https://github.com/johnhong2881-bit/AI-Hackathon-AI-Centralized-System-.git
