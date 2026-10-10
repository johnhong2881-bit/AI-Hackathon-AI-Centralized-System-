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

## 6-Agent Pipeline

| Agent | FR | Type | What It Does |
|-------|-----|------|-------------|
| 📋 Rubric Intelligence | FR-001 | LLM | Parses rubric text → structured criteria |
| 🧩 Task Decomposition | FR-002 | LLM | Breaks assignment into tasks mapped to rubric |
| 🎯 Skill Matching | FR-003 | LLM | Matches tasks to team members by skill |
| 📊 Critical Path | FR-004 | Deterministic | CPM algorithm — topological sort + slack |
| ⚠️ Risk Detection | FR-006 | LLM | Identifies 5 risk types (deadline, skill gap, overload, dependency, scope) |
| 🛡️ Rescue Planner | FR-012 | Hybrid | Generates + applies rescue actions |

## Track 2 Judging Criteria

| Criterion | How We Address It |
|-----------|-------------------|
| Real Problem & User Value | Every student knows group project chaos — personal use case |
| Agentic Workflow | 6 agents in pipeline, visible step-by-step execution |
| Meaningful Use of WorkBuddy | LLM agents (mock→real swap ready) + CPM algorithm |
| End-to-End Execution | 1 prompt → full plan with tasks, assignments, risks, rescue |
| Usable & Verifiable Results | Before/After comparison with measurable metrics |

## Project Structure

```
taskflow-ai/
├── src/
│   ├── types/types.ts              # ⭐ SHARED DATA CONTRACT
│   ├── lib/
│   │   ├── agents/                 # ⭐ BACKEND (DONE)
│   │   │   ├── prompts.ts          # 5 LLM prompt templates
│   │   │   ├── orchestrator.ts     # 6-agent pipeline runner
│   │   │   ├── mock-llm.ts         # Swappable mock→real LLM layer
│   │   │   ├── critical-path.ts    # CPM algorithm (deterministic)
│   │   │   ├── types.ts           # Agent type definitions
│   │   │   └── index.ts           # Barrel exports
│   │   ├── mock/                   # Mock data + 2 demo scenarios
│   │   └── utils/helpers.ts        # Formatting, sorting, deadline
│   ├── store/useTaskStore.ts       # Zustand store
│   ├── components/                  # UI components
│   │   ├── PipelineRunner.tsx     # ⭐ Agentic workflow visualization
│   │   ├── BeforeAfterComparison.tsx # ⭐ Killer demo (Before/After)
│   │   ├── AssignmentInputForm.tsx # "One Prompt" entry point
│   │   ├── KanbanBoard.tsx         # TODO: @dnd-kit integration
│   │   ├── GanttChart.tsx          # TODO: Polish bars + axis
│   │   ├── Dashboard.tsx           # Available (used in other views)
│   │   ├── MemberCard.tsx          # Done
│   │   ├── CountdownTimer.tsx      # Done
│   │   ├── TaskDetailPanel.tsx     # Skeleton
│   │   └── RescuePlanModal.tsx     # Skeleton
│   └── app/
│       ├── page.tsx                # ⭐ Narrative-driven landing page
│       ├── layout.tsx
│       └── api/pipeline/           # 7 API routes (DONE)
│           ├── run/route.ts        # Full pipeline
│           ├── rubric/route.ts     # FR-001
│           ├── tasks/route.ts      # FR-002
│           ├── skills/route.ts     # FR-003
│           ├── critical-path/route.ts # FR-004
│           ├── risk/route.ts       # FR-006
│           └── rescue/route.ts     # FR-012
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Status

### Backend (DONE ✅)
- [x] Shared data contract (`types.ts`)
- [x] 5 LLM prompt templates (`prompts.ts`)
- [x] 6-agent pipeline orchestrator with progress callbacks
- [x] Mock LLM layer (swappable to real `cloud.llm`)
- [x] CPM algorithm (Kahn's topological sort + forward/backward pass)
- [x] 7 API routes (all functional, tested end-to-end)
- [x] 2 demo scenarios (CS3041 HCI + CS3215 Software Engineering)
- [x] Narrative-driven page restructure (Problem → Solution → Demo → Proof)

### Frontend (Teammate — TODO)
- [ ] KanbanBoard: integrate `@dnd-kit` for drag-and-drop task cards
- [ ] GanttChart: polish timeline bars + axis labels
- [ ] TaskDetailPanel: wire up to show task details on click
- [ ] RescuePlanModal: wire up to show rescue actions in a modal
- [ ] Visual polish: ensure consistent spacing, transitions, responsive layout
- [ ] Pitch polish: make the hero section pop with better typography/animation

## Mock → Real LLM Swap

The entire backend uses a swappable mock LLM layer (`mock-llm.ts`).
When WorkBuddy cloud-service is activated, replace the mock functions
with real `cloud.llm.chat.completions.create()` calls — the agent
function signatures stay the same.

```typescript
// In mock-llm.ts, replace:
const { data } = mockRubricResult(assignment);
// With:
const response = await cloud.llm.chat.completions.create({
  model: 'gpt-4',
  messages: [systemMsg, userMsg],
  response_format: { type: 'json_object' },
  stream: true,
});
```

No other files need to change.

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
- WorkBuddy Cloud SDK (`@tencent-ai/workbuddy-cloud-sdk@dev`) — ready to activate
