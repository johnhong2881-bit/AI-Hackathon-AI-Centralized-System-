# TaskFlow AI — Development Guide

> AI Project Manager for university group assignments.
> Track 2 — WorkBuddy Agentic Solution Hackathon.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Open http://localhost:3000
```

## Project Structure

```
taskflow-ai/
├── src/
│   ├── types/
│   │   └── types.ts            # ⭐ SHARED DATA CONTRACT — single source of truth
│   ├── lib/
│   │   ├── mock/               # Mock data for parallel development
│   │   │   ├── index.ts        # Barrel exports
│   │   │   ├── mockAssignment.ts
│   │   │   ├── mockRubric.ts
│   │   │   ├── mockTasks.ts     # PlanResult (11 tasks)
│   │   │   ├── mockMembers.ts
│   │   │   ├── mockPlanResult.ts # SkillMatch + CriticalPath
│   │   │   └── mockRiskFlags.ts # RiskAssessment + RescuePlan + Progress + Deadline + FullPipeline
│   │   └── utils/
│   │       └── helpers.ts      # Formatting, sorting, deadline helpers
│   ├── store/
│   │   └── useTaskStore.ts     # Zustand store (preloaded with mock data)
│   ├── components/             # UI components (skeletons included)
│   │   ├── KanbanBoard.tsx     # FR-005
│   │   ├── GanttChart.tsx      # FR-007
│   │   ├── Dashboard.tsx       # FR-009
│   │   ├── MemberCard.tsx      # FR-010
│   │   ├── TaskDetailPanel.tsx # FR-014
│   │   ├── CountdownTimer.tsx  # FR-008
│   │   └── RescuePlanModal.tsx # FR-012
│   └── app/
│       ├── layout.tsx          # Root layout
│       ├── page.tsx            # Main page (renders dashboard + components)
│       └── globals.css         # Tailwind + CSS variables
├── package.json
├── tsconfig.json               # Path alias: @/ → src/
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── .gitignore
```

## ⭐ The Data Contract (types.ts)

**THIS IS THE MOST IMPORTANT FILE.** Both people must import all types from `@/types/types`.

If you need a new type:
1. Add it to `src/types/types.ts`
2. Commit and push immediately
3. The other person pulls and uses it

**Never duplicate types in component files.**

## Mock Data → Real API Switch

All components read from the Zustand store, which is preloaded with mock data.
To switch to real backend APIs, replace the mock data in the store with API calls:

```typescript
// Before (mock):
const rubric = useTaskStore((s) => s.rubric); // returns mockRubric

// After (real API):
const setRubric = useTaskStore((s) => s.setRubric);
useEffect(() => {
  fetch('/api/rubric-intelligence', { method: 'POST', body: ... })
    .then(r => r.json())
    .then(setRubric);
}, []);
```

No component changes needed — just swap the data source in the store.

## Division of Work

### Person A — Frontend / UI (≈4.5 hours, 8 items)

| FR | Component | Status |
|----|-----------|--------|
| FR-005 | KanbanBoard.tsx | Skeleton done, add @dnd-kit |
| FR-007 | GanttChart.tsx | Skeleton done, polish bars + axis |
| FR-009 | Dashboard.tsx | Skeleton done, add Recharts |
| FR-010 | MemberCard.tsx | Skeleton done, polish |
| FR-014 | TaskDetailPanel.tsx | Skeleton done, polish |
| FR-008 | CountdownTimer.tsx | Skeleton done, verify real-time |
| FR-012 | RescuePlanModal.tsx | Skeleton done, polish |
| FR-009b | InputForm (new) | Not started — assignment input form |

### Person B — AI / Backend (≈5 hours, 8 items)

| FR | Module | Status |
|----|--------|--------|
| FR-001 | Rubric Intelligence (LLM) | Mock ready, build API route |
| FR-002 | Task Decomposition (LLM) | Mock ready, build API route |
| FR-003 | Skill Matching (LLM) | Mock ready, build API route |
| FR-004 | Critical Path Algorithm | Mock ready, build real algo |
| FR-006 | Risk Detection (LLM) | Mock ready, build API route |
| FR-011 | Priority Sorting | Helper done in helpers.ts |
| FR-013 | Progress Tracking | Mock ready, build real tracking |
| FR-012 | Rescue Plan (Hybrid) | Mock ready, build API route |

## Git Workflow

```bash
# Initial setup (after creating repo on GitHub):
git init
git remote add origin https://github.com/your-username/taskflow-ai.git
git add .
git commit -m "Initial project structure with types, mock data, and component skeletons"
git branch -M main
git push -u origin main

# Daily workflow:
git pull origin main           # Always pull before starting
# ... make your changes ...
git add .
git commit -m "feat: implement Kanban DnD (FR-005)"
git push origin main

# If conflicts:
git pull origin main --rebase
# Resolve conflicts, then:
git rebase --continue
git push origin main
```

## Tech Stack

- **Next.js 14** (App Router) — React framework
- **TypeScript** — type safety, shared contract
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — accessible component primitives (install as needed)
- **Zustand** — lightweight state management
- **Recharts** — charts (Gantt, progress rings)
- **@dnd-kit** — drag-and-drop for Kanban board
- **WorkBuddy cloud-service** — backend (DB, auth, LLM calls)
- **WorkBuddy Sites** — deployment
