# PlanPilot AI — Functional Logic Document

> This document details the complete functional logic of PlanPilot AI: from user input through the 6-Agent Pipeline to final output.  
> Audience: Hackathon judges, developers, teammates.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Complete Data Flow](#2-complete-data-flow)
3. [Data Contract (types.ts)](#3-data-contract-typests)
4. [6-Agent Pipeline Detailed Explanation](#4-6-agent-pipeline-detailed-explanation)
   - [Agent 1: Rubric Intelligence (FR-001)](#agent-1-rubric-intelligence-fr-001)
   - [Agent 2: Task Decomposition (FR-002)](#agent-2-task-decomposition-fr-002)
   - [Agent 3: Skill Matching (FR-003)](#agent-3-skill-matching-fr-003)
   - [Agent 4: Critical Path (FR-004)](#agent-4-critical-path-fr-004)
   - [Agent 5: Risk Detection (FR-006)](#agent-5-risk-detection-fr-006)
   - [Agent 6: Rescue Planner (FR-012)](#agent-6-rescue-planner-fr-012)
5. [CPM Algorithm Detailed Explanation](#5-cpm-algorithm-detailed-explanation)
6. [Mock LLM Layer and Real LLM Switch](#6-mock-llm-layer-and-real-llm-switch)
7. [Orchestrator Orchestration Logic](#7-orchestrator-orchestration-logic)
8. [API Endpoint Reference](#8-api-endpoint-reference)
9. [Component and Data Source Mapping](#9-component-and-data-source-mapping)
10. [Error Handling Mechanism](#10-error-handling-mechanism)
11. [Before/After Comparison Logic](#11-beforeafter-comparison-logic)
12. [Track 2 Judging Criteria Coverage](#12-track-2-judging-criteria-coverage)

---

## 1. System Overview

PlanPilot AI is a 6-Agent automated Pipeline. It takes an assignment requirement (Assignment) as input and outputs a complete execution plan: task decomposition, personnel allocation, critical path, risk detection, and rescue plan.

```
User inputs Assignment (title + Rubric text + deadline + team members)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   6-Agent Pipeline                        │
│                                                           │
│  Step 0: Calculate deadline (deterministic, non-Agent)   │
│     │                                                     │
│     ▼                                                     │
│  Step 1: Rubric Agent (LLM) ──→ RubricResult             │
│     │  Input: assignment.rubricText                        │
│     │  Output: structured rubric criteria [{criteria, marks, ...}] │
│     ▼                                                     │
│  Step 2: Task Agent (LLM) ──→ PlanResult                 │
│     │  Input: assignment + rubricResult                    │
│     │  Output: task list [{title, skills, deps, hours}]   │
│     ▼                                                     │
│  Step 3: Skill Agent (LLM) ──→ SkillMatchResult          │
│     │  Input: tasks + members                              │
│     │  Output: task assignments [{taskId, memberId, matchScore}] │
│     ▼                                                     │
│  Step 4: Critical Path Agent (deterministic) ──→ CriticalPathResult │
│     │  Input: tasks (with dependencies + hours)            │
│     │  Output: critical path [{taskId, slack, isCritical}] │
│     ▼                                                     │
│  Step 5: Risk Agent (LLM) ──→ RiskAssessment             │
│     │  Input: tasks + members + deadline + progress        │
│     │  Output: risk flags [{taskId, riskType, recommendation}] │
│     ▼                                                     │
│  Step 6: Rescue Agent (hybrid) ──→ RescuePlan            │
│        Input: riskAssessment + tasks + members             │
│        Output: rescue actions [{actionType, impact, assignedTo}] │
└─────────────────────────────────────────────────────────┘
         │
         ▼
Final output: PipelineState (contains all 6 step results)
```

### Core Design Principles

- **Chain passing**: Each step's output is the next step's input, forming a data chain
- **Visibility**: Each step has a running status (pending → running → completed/error) + logs
- **Replaceable**: LLM calls go through the mock-llm.ts middleware layer, allowing one-click switch to real cloud.llm
- **Deterministic + LLM hybrid**: Not everything relies on LLM; critical path uses the CPM deterministic algorithm to ensure accuracy

---

## 2. Complete Data Flow

### 2.1 Input Phase

```
User fills in AssignmentInputForm:
  - title: "CS3041 HCI Group Project"
  - course: "CS3041"
  - description: "Design a UI for campus food ordering app"
  - rubricText: "1. User Research (25 marks)...\n2. Design (20 marks)..."
  - deadline: "2026-11-15T23:59:00+08:00"
  - teamSize: 4
  - assignmentType: "mixed"
  - deliverables: ["Report", "Prototype", "Slides", "Reflection"]
         │
         ▼
Construct Assignment object + Member[] array
         │
         ▼
POST /api/pipeline/run  (body: { assignment, members })
  or
client directly calls runPipeline(assignment, members, onProgress)
```

### 2.2 Pipeline Execution Phase

Data passing relationship for each step:

```
Step 0: calculateDeadline(assignment.deadline)
  Input: assignment.deadline = "2026-11-15T23:59:00+08:00"
  Output: DeadlineInfo { daysRemaining: 36, isUrgent: false, isOverdue: false }

Step 1: callRubricAgent(assignment)
  Input: assignment.rubricText (raw text)
  Output: RubricResult {
    items: [
      { id: "rub-001", criteria: "User Research & Analysis", marks: 25, mandatory: true },
      { id: "rub-002", criteria: "Design & Wireframing", marks: 20, mandatory: true },
      ...total 6 items
    ],
    totalMarks: 100,
    rawExtractionConfidence: 0.92
  }

Step 2: callTaskAgent(assignment, rubricResult)
  Input: assignment + Step 1's rubricResult
  Output: PlanResult {
    tasks: [
      { id: "task-001", title: "User Interview Planning", requiredSkills: ["research","management"],
        estimatedHours: 4, dependencies: [], relatedRubricIds: ["rub-001"], priority: "critical" },
      { id: "task-002", title: "Conduct User Interviews", requiredSkills: ["research","analysis","writing"],
        estimatedHours: 8, dependencies: ["task-001"], relatedRubricIds: ["rub-001"], priority: "critical" },
      ...total 11 tasks, 57h total
    ],
    criticalPath: ["task-001","task-002",...],  // LLM's initial estimate
    totalEstimatedHours: 57
  }

Step 3: callSkillAgent(tasks, members)
  Input: Step 2's tasks + team members
  Output: SkillMatchResult {
    assignments: [
      { taskId: "task-001", memberId: "mem-003", matchScore: 0.95, matchReason: "Strong in research (5/5)" },
      { taskId: "task-003", memberId: "mem-002", matchScore: 0.97, matchReason: "Design proficiency 5/5" },
      ...total 8 assignments
    ],
    unmatchedTaskIds: ["task-008","task-009","task-011"]  // 3 unmatched
  }

Step 4: calculateCriticalPath(tasks)
  Input: Step 2's tasks (with dependencies + estimatedHours)
  Output: CriticalPathResult {
    nodes: [
      { taskId: "task-001", earlyStart: 0, earlyFinish: 8, lateStart: 0, lateFinish: 8, slack: 0, isCritical: true },
      { taskId: "task-002", earlyStart: 8, earlyFinish: 16, lateStart: 8, lateFinish: 16, slack: 0, isCritical: true },
      ...
    ],
    criticalPath: ["task-001","task-002","task-003",...],
    projectDuration: 57  // hours
  }

Step 5: callRiskAgent(tasks, members, deadline, progress)
  Input: Step 2 tasks + members + Step 0 deadline + progress data
  Output: RiskAssessment {
    flags: [
      { taskId: "task-009", riskLevel: "high", riskType: "skill_gap",
        description: "No member has writing+research+editing at high proficiency",
        recommendation: "Split task: assign writing to Bob, research to Carol" },
      { taskId: "task-002", riskLevel: "medium", riskType: "deadline",
        description: "8h task on critical path with 36 days buffer",
        recommendation: "Start early to avoid blocking downstream" },
      ...total 4 risks
    ],
    overallRiskLevel: "medium"
  }

Step 6: callRescueAgent(riskAssessment, tasks, members)
  Input: Step 5's riskAssessment + tasks + members
  Output: RescuePlan {
    actions: [
      { id: "res-001", taskId: "task-009", actionType: "split",
        description: "Split report writing: Bob does draft, Carol adds research sections",
        priority: "critical", estimatedImpact: "Saves ~4h, unblocks task-010",
        assignedTo: "mem-002" },
      { id: "res-002", taskId: "task-011", actionType: "reduce_scope",
        description: "Reduce individual reflection to 400 words instead of 500",
        priority: "low", estimatedImpact: "Saves ~1h per person",
        assignedTo: null },
      ...total 4 rescue actions
    ],
    projectedRecovery: "On track for deadline with ~4h buffer after rescue actions",
    confidence: 0.82
  }
```

### 2.3 Output Phase

```
PipelineState {
  isComplete: true,
  steps: [6 PipelineSteps, all status: "completed"],
  rubric: RubricResult,        // Step 1 output
  plan: PlanResult,            // Step 2 output
  skillMatch: SkillMatchResult, // Step 3 output
  criticalPath: CriticalPathResult, // Step 4 output
  riskAssessment: RiskAssessment,   // Step 5 output
  rescuePlan: RescuePlan,           // Step 6 output
  deadline: DeadlineInfo,           // Step 0 output
}
```

---

## 3. Data Contract (types.ts)

`src/types/types.ts` is the single source of truth shared between frontend and backend. All type definitions reside in this file; redefining them elsewhere is not allowed.

### 3.1 Root Input

```typescript
interface Assignment {
  id: string;
  title: string;
  course: string;
  deliverables: string[];
  deadline: string | null;      // ISO 8601
  assignmentType: 'research' | 'presentation' | 'software' | 'marketing' | 'mixed';
  teamSize: number;
  description: string;
  rubricText?: string;          // Raw text extracted from PDF/image
}
```

### 3.2 Each Agent's Output Type

| Agent        | Output Type           | Key Fields                                                                          |
| ------------ | -------------------- | ----------------------------------------------------------------------------------- |
| Rubric       | `RubricResult`       | items[].criteria, items[].marks, items[].mandatory                                  |
| Task         | `PlanResult`         | tasks[].title, tasks[].requiredSkills, tasks[].dependencies, tasks[].estimatedHours |
| Skill        | `SkillMatchResult`   | assignments[].matchScore (0-1), unmatchedTaskIds[]                                  |
| CriticalPath | `CriticalPathResult` | nodes[].slack, nodes[].isCritical, projectDuration                                  |
| Risk         | `RiskAssessment`     | flags[].riskType (5 types), flags[].recommendation, overallRiskLevel                     |
| Rescue       | `RescuePlan`         | actions[].actionType (6 types), projectedRecovery, confidence                            |

### 3.3 Skill Enumeration

```typescript
type Skill = 'writing' | 'research' | 'design' | 'coding' | 'presentation' | 'analysis' | 'editing' | 'management';
```

Each Member has a 1-5 proficiency score for each of these 8 skills:

```typescript
interface Member {
  skillProficiency: Record<Skill, number>;  // e.g. { coding: 5, design: 4, ... }
  availability: number;  // Available hours per week
}
```

### 3.4 Risk Type Enumeration

```typescript
type RiskType = 'deadline' | 'dependency' | 'skill_gap' | 'overload' | 'quality';
```

### 3.5 Rescue Action Type Enumeration

```typescript
type ActionType = 'reassign' | 'split' | 'escalate' | 'reduce_scope' | 'add_resource' | 'reorder';
```

---

## 4. 6-Agent Pipeline Detailed Explanation

### Agent 1: Rubric Intelligence (FR-001)

**Role**: RubricIntelligence — Academic rubric parsing expert

**Type**: LLM (Large Language Model)

**Input**:

- `assignment.rubricText`: Raw rubric text extracted from PDF/image/text

**Output**: `RubricResult`

- 6 structured rubric criteria (RubricItem)
- Each criterion includes: id, criteria, marks, weightage, mandatory, description
- Total marks (totalMarks)
- Extraction confidence (rawExtractionConfidence: 0-1)
- Warning list (warnings[])

**Prompt Design**:

System Prompt key rules:

1. Each criterion must have an id (rub-001 format), name, marks, weightage, mandatory flag, and description
2. Uncertain fields should use null/"Unknown" — do not guess
3. Return pure JSON, no markdown

User Prompt template:

```
Parse the following assignment rubric into structured criteria.
ASSIGNMENT TITLE: {assignment.title}
RUBRIC TEXT: """{assignment.rubricText}"""
Return JSON: { items: [...], totalMarks, parsedAt, rawExtractionConfidence, warnings }
```


**Temperature**: 0.3 (low temperature for stable structured extraction)

**Mock behavior**: Returns 6 predefined criteria (User Research 25 marks, Design 20 marks, Prototype 20 marks, Evaluation 15 marks, Presentation 10 marks, Report 10 marks), simulated latency 1.8s

**After switching to real LLM**: The same prompt is sent to cloud.llm; the LLM parses the real rubric text and returns structured JSON

---

### Agent 2: Task Decomposition (FR-002)

**Role**: TaskDecomposer — University group assignment project planning expert

**Type**: LLM

**Input**:

- `assignment`: Complete assignment info (title, type, deliverables, deadline, team size, description)
- `rubric`: Step 1's output (RubricResult)

**Output**: `PlanResult`

- 11 tasks (Task)
- Each task includes: title, description, requiredSkills, estimatedHours, complexity, priority, dependencies, relatedRubricIds, status, assignedTo, order
- criticalPath: LLM's initial critical path estimate
- totalEstimatedHours: 57h

**Prompt design key rules**:

1. **Each task must map to at least one rubric criterion** (relatedRubricIds)
2. Tasks must have realistic dependencies (dependencies point to other task IDs)
3. Hour estimation: low=2-4h, medium=4-8h, high=8-15h
4. Priority: critical (critical path) > high (main deliverables) > medium (supporting work) > low (nice-to-have)
5. requiredSkills may only use the 8 standard skill values
6. Return pure JSON

**Temperature**: 0.4 (moderate creativity for diverse task decomposition)

**Data chain**: rubric.items → tasks.relatedRubricIds (each task linked to rubric criteria)

---

### Agent 3: Skill Matching (FR-003)

**Role**: SkillMatcher — Team optimization expert

**Type**: LLM

**Input**:

- `tasks`: Step 2's output (task list)
- `members`: Team member list (with skill proficiency 1-5 scores + weekly available hours)

**Output**: `SkillMatchResult`

- assignments[]: Task assignment list, each containing matchScore (0-1), matchReason
- unmatchedTaskIds[]: Task IDs that could not be matched

**Prompt design key rules**:

1. matchScore: 0.0-1.0, based on skill match + availability
2. matchReason: Explain why this person was chosen (e.g. "Strong in research (5/5), available 14h")
3. Do not exceed member's available time limit
4. Match threshold > 0.3; below this value, leave as unmatched
5. Consider dependencies — consecutive tasks tend to be assigned to the same person

**Temperature**: 0.2 (low temperature; optimization problem requires determinism)

**Data chain**: tasks[].requiredSkills ↔ members[].skillProficiency (skill matching)

---

### Agent 4: Critical Path (FR-004)

**Role**: Deterministic algorithm, no LLM

**Type**: Deterministic

**Input**:

- `tasks`: Task list (with dependencies and estimatedHours)

**Output**: `CriticalPathResult`

- nodes[]: CPM node for each task (earlyStart, earlyFinish, lateStart, lateFinish, slack, isCritical)
- criticalPath[]: Ordered list of task IDs on the critical path
- projectDuration: Total project hours (critical path length)

**Algorithm**: See [Section 5: CPM Algorithm Detailed Explanation](#5-cpm-algorithm-detailed-explanation)

**Why not use LLM**: CPM is a deterministic mathematical algorithm; LLMs are prone to calculation errors. Using a deterministic algorithm guarantees 100% correctness.

---

### Agent 5: Risk Detection (FR-006)

**Role**: RiskDetector — Student team project risk analyst

**Type**: LLM

**Input**:

- `tasks`: Task list (with status, progress, assignments)
- `members`: Team members (with workload)
- `deadline`: Deadline info (DeadlineInfo)
- `progress`: Project progress (ProjectProgress)

**Output**: `RiskAssessment`

- flags[]: Risk flag list, each containing:
  - riskType: 5 types (see table below)
  - riskLevel: high / medium / low
  - description: Specific risk description
  - recommendation: Specific actionable advice (not "improve time management", but "Split task-002: finish personas first (4h) to unblock wireframing")
- overallRiskLevel: Overall risk level

**Risk Types**:

| riskType   | Meaning                      | Example                                              |
| ---------- | ---------------------------- | ----------------------------------------------- |
| deadline   | Task may not be completed on time     | "task-002 is on the critical path, 8h workload"                        |
| dependency | Upstream task delay blocks downstream     | "task-003 depends on task-002, which is incomplete"                    |
| skill_gap  | No member has the required skills      | "task-009 needs writing+research+editing, no one qualifies"     |
| overload   | Member has too many tasks/insufficient time    | "Carol has 3 tasks but only 14h per week"                        |
| quality    | Complexity vs skill level mismatch | "task-005 is high complexity but assigned to someone with design 4/5" |

**Temperature**: 0.3

**Data chain**: tasks[].status + tasks[].assignedTo + progress.taskProgress → risk analysis

---

### Agent 6: Rescue Planner (FR-012)

**Role**: RescuePlanner — Project rescue strategist

**Type**: Hybrid (mixed: LLM generates plan + deterministic impact calculation)

**Input**:

- `riskAssessment`: Step 5's output (risk list)
- `tasks`: Task list
- `members`: Team members

**Output**: `RescuePlan`

- actions[]: Rescue action list, each containing:
  - actionType: 6 types (see table below)
  - description: Specific action description
  - priority: critical / high / medium / low
  - estimatedImpact: Quantified impact ("Saves ~3h", "Unblocks task-005")
  - assignedTo: Action executor
- projectedRecovery: Expected outcome after rescue
- confidence: Confidence (0-1)

**Action Types**:

| actionType   | Meaning            | Example                           |
| ------------ | ------------- | ---------------------------- |
| reassign     | Reassign task to a different person         | "task-007 from David to Carol"  |
| split        | Split task into parallel subtasks    | "Split task-009 into writing + research"        |
| escalate     | Flag for team discussion/external help | "Ask TA to confirm reflection word count"      |
| reduce_scope | Reduce non-core deliverables      | "Reflection reduced from 500 to 400 words" |
| add_resource | Bring in additional resources        | "Borrow someone from another team for testing"                 |
| reorder      | Reorder task sequence        | "Do wireframe before interview"  |

**Temperature**: 0.4

**Data chain**: riskAssessment.flags[].recommendation → rescue actions (convert recommendations into concrete actions)

---

## 5. CPM Algorithm Detailed Explanation

`src/lib/agents/critical-path.ts` implements the standard Critical Path Method (CPM).

### 5.1 Algorithm Steps

```
Input: tasks[] (each task has id, estimatedHours, dependencies[])

Step 1: Build adjacency list
  - dependents: Map<taskId, taskId[]>  — "Who depends on me?"
  - dependencies: Map<taskId, taskId[]> — "Who do I depend on?"

Step 2: Topological sort (Kahn's algorithm)
  - Calculate each task's in-degree (in-degree = dependencies.length)
  - Enqueue tasks with in-degree 0
  - Dequeue a task, decrement in-degree of its successors by 1
  - Enqueue when in-degree reaches 0
  - Result: topoOrder[] (topologically ordered task ID list)

Step 3: Forward Pass — calculate earlyStart / earlyFinish
  - Traverse in topological order
  - earlyStart = max(earlyFinish of all predecessors), 0 if no predecessors
  - earlyFinish = earlyStart + estimatedHours

Step 4: Calculate project duration
  - projectDuration = max(earlyFinish of all tasks)

Step 5: Backward Pass — calculate lateStart / lateFinish
  - Traverse in reverse topological order
  - lateFinish = min(lateStart of all successors), projectDuration if no successors
  - lateStart = lateFinish - estimatedHours

Step 6: Calculate slack (float time)
  - slack = lateStart - earlyStart
  - slack = 0 → on critical path (isCritical = true)
  - slack > 0 → has buffer

Output: CriticalPathResult {
  nodes: [{ taskId, earlyStart, earlyFinish, lateStart, lateFinish, slack, isCritical }],
  criticalPath: [list of taskIds where isCritical is true],
  projectDuration: total critical path length (hours)
}
```

### 5.2 Example

Input 4 tasks:

```
task-001: 8h, no dependencies
task-002: 6h, depends on task-001
task-003: 10h, depends on task-002
task-004: 4h, depends on task-003
```

Calculation process:

```
Topological order: task-001 → task-002 → task-003 → task-004

Forward pass:
  task-001: earlyStart=0,  earlyFinish=8
  task-002: earlyStart=8,  earlyFinish=14
  task-003: earlyStart=14, earlyFinish=24
  task-004: earlyStart=24, earlyFinish=28

projectDuration = 28

Backward pass:
  task-004: lateFinish=28, lateStart=24
  task-003: lateFinish=24, lateStart=14
  task-002: lateFinish=14, lateStart=8
  task-001: lateFinish=8,  lateStart=0

Slack:
  task-001: 0-0=0 → critical
  task-002: 8-8=0 → critical
  task-003: 14-14=0 → critical
  task-004: 24-24=0 → critical

Result: all critical, projectDuration=28h
```

### 5.3 Why Use a Deterministic Algorithm

- CPM is a mathematical algorithm; LLMs are prone to calculation errors (especially with multi-branch dependencies)
- Execution speed: <1ms (LLM requires 1-2s)
- 100% reproducible (same input always produces same output)
- Verifiable (judges can manually verify calculations)

---

## 6. Mock LLM Layer and Real LLM Switch

### 6.1 Current Architecture (Mock)

```
prompts.ts (generates LLMCallParams)
     │
     ▼
mock-llm.ts (mockLLMCall function)
     │  Matches and returns corresponding mock data based on role name in systemPrompt
     │  Simulates network latency (1.5-2.4s)
     ▼
Returns LLMCallResult { content, parsed, durationMs, model }
```

Matching logic of `mockLLMCall()`:

```typescript
if (params.systemPrompt.includes('RubricIntelligence')) → returns mockRubric
if (params.systemPrompt.includes('TaskDecomposer')) → returns mockPlanResult
if (params.systemPrompt.includes('SkillMatcher')) → returns mockSkillMatch
if (params.systemPrompt.includes('RiskDetector')) → returns mockRiskAssessment
if (params.systemPrompt.includes('RescuePlanner')) → returns mockRescuePlan
```

### 6.2 Switching to Real WorkBuddy LLM

Simply replace `mockLLMCall()` with `realLLMCall()` in `mock-llm.ts`:

```typescript
// Uncomment the following code:
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk';

const cloud = createWorkBuddyCloud({
  endpoint: publicConfig.endpoint,
  publishableKey: publicConfig.publishableKey,
});

async function realLLMCall(params: LLMCallParams): Promise<LLMCallResult> {
  const startTime = Date.now();
  let content = '';

  // WorkBuddy cloud.llm only supports stream: true
  for await (const chunk of cloud.llm.chat.completions.create({
    model: 'model-id-from-list',
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    stream: true,                              // must be true
    temperature: params.temperature ?? 0.3,
    response_format: params.responseFormat === 'json_object'
      ? { type: 'json_object' }
      : undefined,
  })) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) content += delta;
  }

  return {
    content,
    parsed: params.responseFormat === 'json_object' ? JSON.parse(content) : content,
    durationMs: Date.now() - startTime,
    model: 'workbuddy-cloud-llm',
  };
}
```

**Key points**:

- Only `mock-llm.ts` needs to change; other files (orchestrator, API routes, prompts) remain untouched
- Interface signature unchanged: `LLMCallParams → LLMCallResult`
- `response_format: { type: 'json_object' }` ensures structured output
- `stream: true` is a WorkBuddy cloud.llm requirement

---

## 7. Orchestrator Orchestration Logic

`src/lib/agents/orchestrator.ts` is the Pipeline's core orchestrator.

### 7.1 Execution Flow

```
runPipeline(assignment, members, onProgress)
  │
  ├─ 1. Create initial PipelineState (all steps pending)
  │
  ├─ 2. Step 0: calculateDeadline() — instantaneous, non-Agent
  │     setState({ deadline })
  │
  ├─ 3. Step 1: updateStep(0, { status: 'running', logs: [...] })
  │     try: callRubricAgent(assignment) → setState({ rubric })
  │     catch: updateStep(0, { status: 'error' }) → return
  │     updateStep(0, { status: 'completed', durationMs, result })
  │
  ├─ 4. Step 2: updateStep(1, { status: 'running' })
  │     try: callTaskAgent(assignment, state.rubric) → setState({ plan })
  │     catch: updateStep(1, { status: 'error' }) → return
  │     updateStep(1, { status: 'completed' })
  │
  ├─ 5. Step 3: updateStep(2, { status: 'running' })
  │     try: callSkillAgent(state.plan.tasks, members) → setState({ skillMatch })
  │     catch: updateStep(2, { status: 'error' }) → return
  │     updateStep(2, { status: 'completed' })
  │
  ├─ 6. Step 4: updateStep(3, { status: 'running' })
  │     try: calculateCriticalPath(state.plan.tasks) → setState({ criticalPath })
  │     catch: updateStep(3, { status: 'error' }) → return
  │     updateStep(3, { status: 'completed', durationMs: 10 })
  │
  ├─ 7. Step 5: updateStep(4, { status: 'running' })
  │     try: callRiskAgent(tasks, members, deadline, progress) → setState({ riskAssessment })
  │     catch: updateStep(4, { status: 'error' }) → return
  │     updateStep(4, { status: 'completed' })
  │
  ├─ 8. Step 6: updateStep(5, { status: 'running' })
  │     try: callRescueAgent(riskAssessment, tasks, members) → setState({ rescuePlan })
  │     catch: updateStep(5, { status: 'error' }) → return
  │     updateStep(5, { status: 'completed' })
  │
  └─ 9. Pipeline complete
        state.isRunning = false
        state.isComplete = true
        return state
```

### 7.2 ProgressCallback Mechanism

```typescript
type ProgressCallback = (state: PipelineState) => void;
```

Every `updateStep()` or `setState()` call invokes `onProgress({...state})`, passing back the current complete state. The frontend `PipelineRunner` component uses this callback to update the UI in real time:

- Each step's status: pending → running → completed
- Each step's logs[] array (incrementally appended)
- Each step's durationMs
- Each step's result (human-readable summary)


### 7.3 Error Handling

If any step errors:

1. That step's status is set to 'error'
2. Error message is written to step.error
3. Pipeline stops immediately (does not continue to subsequent steps)
4. Completed step results are preserved in state
5. `state.isRunning = false`

---

## 8. API Endpoint Reference

### 8.1 Single-Step APIs (can be called individually)

| Endpoint                       | Method | Request Body                                | Returns               | FR     |
| ----------------------------- | ---- | ------------------------------------------ | -------------------- | ------ |
| `/api/pipeline/rubric`        | POST | `{ assignment }`                           | `RubricResult`       | FR-001 |
| `/api/pipeline/tasks`         | POST | `{ assignment, rubric }`                   | `PlanResult`         | FR-002 |
| `/api/pipeline/skills`        | POST | `{ tasks, members }`                       | `SkillMatchResult`   | FR-003 |
| `/api/pipeline/critical-path` | POST | `{ tasks }`                                | `CriticalPathResult` | FR-004 |
| `/api/pipeline/risk`          | POST | `{ tasks, members, deadline?, progress? }` | `RiskAssessment`     | FR-006 |
| `/api/pipeline/rescue`        | POST | `{ riskAssessment, tasks, members }`       | `RescuePlan`         | FR-012 |

### 8.2 Full Pipeline API

| Endpoint              | Method | Request Body               | Returns          |
| ------------------- | ---- | ------------------------- | --------------- |
| `/api/pipeline/run` | POST | `{ assignment, members }` | `PipelineState` |

`/api/pipeline/run` internally calls `runPipeline()`, executing all 6 steps at once and returning the final `PipelineState`.  
Note: The HTTP version does not support real-time progress callbacks (uses a no-op callback). For real-time progress, use the client-side `PipelineRunner` component.

### 8.3 Request/Response Example

**Request** (POST /api/pipeline/run):

```json
{
  "assignment": {
    "id": "asg-001",
    "title": "CS3041 HCI Group Project",
    "course": "CS3041",
    "deliverables": ["Report", "Prototype", "Slides"],
    "deadline": "2026-11-15T23:59:00+08:00",
    "assignmentType": "mixed",
    "teamSize": 4,
    "description": "Design a UI for campus food ordering app",
    "rubricText": "1. User Research (25 marks)..."
  },
  "members": [
    {
      "id": "mem-001",
      "name": "Alice Chen",
      "skills": ["coding", "design"],
      "skillProficiency": { "coding": 5, "design": 4, ... },
      "availability": 15,
      "role": "Developer"
    }
  ]
}
```

**Response** (PipelineState):

```json
{
  "isComplete": true,
  "steps": [
    {
      "agent": { "id": "rubric-agent", "name": "Rubric Intelligence Agent", "frId": "FR-001", "type": "llm" },
      "status": "completed",
      "logs": ["📊 Sending rubric text to LLM...", "✅ Found 6 criteria (100 total marks)", "⏱️ Completed in 1.8s"],
      "durationMs": 1800,
      "result": "Extracted 6 criteria, total 100 marks"
    },
    ... (total 6 steps)
  ],
  "rubric": { "items": [...], "totalMarks": 100 },
  "plan": { "tasks": [...], "totalEstimatedHours": 57 },
  "skillMatch": { "assignments": [...], "unmatchedTaskIds": [...] },
  "criticalPath": { "nodes": [...], "projectDuration": 57 },
  "riskAssessment": { "flags": [...], "overallRiskLevel": "medium" },
  "rescuePlan": { "actions": [...], "confidence": 0.82 }
}
```

---

## 9. Component and Data Source Mapping

| Component                 | Data Source                                             | Functionality                |
| ----------------------- | ---------------------------------------------------- | -------------------- |
| `PlanPilotMockup2`        | `useMockupStore2` Zustand store                       | Mockup 2 main container (logo, role toggle, screen routing) |
| `ProjectScreen`          | `PROJECTS` mock array                                 | Project home page (project cards, flow guide, contribution button)    |
| `CreateScreen`           | Form state + `/api/upload`                                 | Step 1: Project creation form        |
| `TeamScreen`             | `MEM` mock + local state                                     | Step 2: Team member editing        |
| `ReviewScreen`           | Create + Team summary                                     | Step 3: Review summary          |
| `AnalysisScreen`         | `/api/pipeline/run` (DST step animation)                       | Step 4: AI analysis progress visualization   |
| `OverviewScreen`         | `useTaskStore` + `PGP` mock (per-project via `getProjectTK()`)  | Project overview (predicted completion line, team progress, contribution); task count dynamically calculated |
| `TasksScreen`            | `TK` mock / `getProjectTK()` (per-project derivation)            | Task list + Kanban + task detail; SRS uses TK, other projects derived from PGP |
| `TimelineScreen`         | `GT` mock / `getProjectGT()` (per-project derivation)            | Gantt chart timeline; SRS uses GT, other projects derived from PGP; predicted line color by project status |
| `DefenderScreen`         | `/api/pipeline/rescue` + `useTaskStore` + `getProjectTK()`    | AI Deadline Defender (3-phase); task count/completable count dynamically calculated |
| `Mockup2Overlays`        | `useMockupStore2` state + `PGP` (per-project)                 | Drawers, modals, toasts; Contribution Modal uses PGP to display project members |
| `WorkspaceHeader`        | `PROJECTS` + `PROJECT_MEMBERS` + `getProjectTK()` (per-project) | Project breadcrumb, title, status, tabs; task badge and open task count dynamically calculated |

### Zustand Stores

- `useMockupStore2` (`src/store/useMockupStore2.ts`): UI state (screen, role, overlay, task view, defender phase, activeProjectId, toasts, etc.)
- `useTaskStore` (`src/store/useTaskStore.ts`): Pipeline data (riskAssessment, plan, members, rescuePlan, criticalPath, etc.)

When switching to real API, simply replace mock data with fetch calls in the store's initialization.

---

## 10. Error Handling Mechanism

### 10.1 API Route Error Handling

Each API route has unified try-catch:

```typescript
try {
  // Business logic
  return NextResponse.json(data, { status: 200 });
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: `Agent failed: ${message}` },
    { status: 500 }
  );
}
```

### 10.2 Parameter Validation

Each route validates required fields before calling the agent function:

- Missing field → return 400 + `{ error: "Missing 'xxx' in request body" }`
- Fields present → call agent function

### 10.3 Pipeline Error Propagation

If any step in the Orchestrator errors:

1. That step's `status = 'error'`, `error = String(err)`
2. Pipeline stops executing subsequent steps
3. Completed step results are preserved
4. Frontend PipelineRunner displays red status + error message for the error step

---

## 11. Before/After Comparison Logic

`BeforeAfterComparison.tsx` is the Hackathon "killer demo", showcasing the quantifiable value of PlanPilot AI.

### Data Sources

- **Before** (without PlanPilot): Uses mockRiskAssessment (unhandled raw risks) + mockPlanResult (raw hours)
- **After** (with PlanPilot): Uses mockRescuePlan (post-rescue results) + calculated saved hours

### Comparison Metrics

| Metric     | Before | After | Change           |
| ------ | ------ | ----- | ------------ |
| Estimated Hours   | 57h    | 50h   | -7h (saved by rescue actions) |
| Risk Count   | 4      | 0     | All resolved         |
| Unassigned Tasks  | 3      | 0     | All assigned         |
| Deadline Status | Behind     | On track    | +4h buffer   |
| Overall Risk   | HIGH   | LOW   | Downgraded           |
| Project Progress   | 15%    | 35%   | +20%         |

### Rescue Action Impact

Each RescueAction has an `estimatedImpact` field quantifying the action's effect:

- "Saves ~4h of blocking time" → hours reduced
- "Unblocks task-005" → dependency chain unlocked
- "Reduces risk to low" → risk downgraded

The Before/After savedHours = 7 is derived from accumulating the impact of rescue actions.

---

## 12. Track 2 Judging Criteria Coverage

| Judging Criteria                    | How Satisfied                                        | Corresponding Code                                              |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| **Real Problem & User Value**   | Every student knows the chaos of group assignments — real pain point                       | page.tsx Problem Hero + Pain Points               |
| **Agentic Workflow**            | 6 Agents execute sequentially, each with visible status + logs                 | orchestrator.ts + PipelineRunner.tsx              |
| **Meaningful Use of WorkBuddy** | 5 LLM Agents + CPM algorithm + cloud.llm switch ready     | prompts.ts + mock-llm.ts (realLLMCall commented code)       |
| **End-to-End Execution**        | One form input → complete plan output (tasks + assignments + path + risks + rescue)            | AssignmentInputForm → runPipeline → PipelineState |
| **Usable & Verifiable Results** | Before/After comparison + CPM manually verifiable + API curl-testable | BeforeAfterComparison.tsx + critical-path.ts      |

---

## 13. Verification Methods

This section explains how to verify the correctness of each part of the system, from single-step API to full-chain Pipeline.

### 13.1 Prerequisites

```bash
# Ensure dev server is running
cd planpilot-ai
npm run dev    # http://localhost:3000

# All curl commands run in the project root directory
```

### 13.2 Verification 1: Single-Step API — Rubric Agent (FR-001)

**Verification target**: Input raw rubric text, output structured RubricResult

```bash
curl -s -X POST http://localhost:3000/api/pipeline/rubric \
  -H "Content-Type: application/json" \
  -d '{
    "assignment": {
      "id": "asg-001",
      "title": "CS3041 HCI Project",
      "course": "CS3041",
      "deliverables": ["Report","Prototype"],
      "deadline": "2026-11-15T23:59:00+08:00",
      "assignmentType": "mixed",
      "teamSize": 4,
      "description": "Design a UI for campus food ordering app",
      "rubricText": "1. User Research (25 marks) - interviews\n2. Design (20 marks) - wireframes\n3. Prototype (20 marks) - Figma\n4. Evaluation (15 marks) - usability\n5. Presentation (10 marks) - 15 min\n6. Report (10 marks) - APA"
    }
  }' | python -m json.tool
```

**Verification checkpoints**:

- [ ] `items` array has 6 elements
- [ ] Each item has `id` (rub-001 format), `criteria`, `marks`, `mandatory`, `description`
- [ ] `totalMarks` = 100
- [ ] `rawExtractionConfidence` is between 0-1
- [ ] `warnings` is an empty array (no warnings)

**Error case verification**:

```bash
# Missing assignment field → should return 400
curl -s -X POST http://localhost:3000/api/pipeline/rubric \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: {"error":"Missing \"assignment\" in request body"}
```

### 13.3 Verification 2: Single-Step API — Task Agent (FR-002)

**Verification target**: Input assignment + rubric, output PlanResult (task list)

```bash
curl -s -X POST http://localhost:3000/api/pipeline/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "assignment": { "id":"asg-001", "title":"CS3041", "course":"CS3041", "deliverables":["Report"], "deadline":"2026-11-15T23:59:00+08:00", "assignmentType":"mixed", "teamSize":4, "description":"Design a UI", "rubricText":"..." },
    "rubric": {
      "assignmentId": "asg-001",
      "items": [
        {"id":"rub-001","criteria":"User Research","marks":25,"weightage":25,"mandatory":true,"description":"Interviews"},
        {"id":"rub-002","criteria":"Design","marks":20,"weightage":20,"mandatory":true,"description":"Wireframes"}
      ],
      "totalMarks": 100,
      "parsedAt": "2026-10-10T10:30:00+08:00",
      "rawExtractionConfidence": 0.92,
      "warnings": []
    }
  }' | python -m json.tool
```

**Verification checkpoints**:

- [ ] `tasks` array has 8-15 tasks
- [ ] Each task has `requiredSkills` (only uses 8 standard skill values)
- [ ] Each task has `dependencies` (task ID array)
- [ ] Each task has `relatedRubricIds` (linked to rubric item)
- [ ] Each task has `estimatedHours` (range 2-15)
- [ ] Each task has `priority` (critical/high/medium/low)
- [ ] `totalEstimatedHours` = sum of all task hours
- [ ] `criticalPath` is a non-empty array

**Data chain verification**: IDs in `tasks[].relatedRubricIds` must exist in `rubric.items[].id`

### 13.4 Verification 3: Single-Step API — Skill Agent (FR-003)

**Verification target**: Input tasks + members, output SkillMatchResult

```bash
curl -s -X POST http://localhost:3000/api/pipeline/skills \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id":"task-001","title":"User Research","description":"Interviews","estimatedHours":8,"requiredSkills":["research","analysis"],"rubricId":"rub-001","dependencies":[],"status":"todo","priority":1},
      {"id":"task-002","title":"Wireframes","description":"Low-fi","estimatedHours":6,"requiredSkills":["design"],"rubricId":"rub-002","dependencies":["task-001"],"status":"todo","priority":2}
    ],
    "members": [
      {"id":"mem-001","name":"Alice","avatar":"👩‍💻","skills":["coding","design"],"skillProficiency":{"coding":5,"design":4,"analysis":4,"writing":3,"research":3,"presentation":2,"editing":3,"management":3},"availability":15,"role":"Developer","currentTaskIds":[]},
      {"id":"mem-003","name":"Carol","avatar":"👩‍🔬","skills":["research","analysis"],"skillProficiency":{"coding":1,"design":2,"analysis":5,"writing":4,"research":5,"presentation":3,"editing":3,"management":3},"availability":14,"role":"Researcher","currentTaskIds":[]}
    ]
  }' | python -m json.tool
```

**Verification checkpoints**:

- [ ] Each `matchScore` in `assignments` is between 0.0-1.0
- [ ] `matchReason` is not an empty string
- [ ] Each `taskId` exists in the input tasks
- [ ] Each `memberId` exists in the input members
- [ ] IDs in `unmatchedTaskIds` exist in tasks but not in assignments
- [ ] The same member is not assigned more total task hours than their `availability`

**Logic verification**: task-001 (requires research+analysis) should be assigned to Carol (research 5/5, analysis 5/5), not Alice (research 3/5, analysis 4/5)

### 13.5 Verification 4: Single-Step API — Critical Path (FR-004)

**Verification target**: Input tasks with dependencies, output CPM calculation result

```bash
curl -s -X POST http://localhost:3000/api/pipeline/critical-path \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id":"task-001","title":"A","description":"","estimatedHours":8,"requiredSkills":[],"rubricId":"","dependencies":[],"status":"todo","priority":1},
      {"id":"task-002","title":"B","description":"","estimatedHours":6,"requiredSkills":[],"rubricId":"","dependencies":["task-001"],"status":"todo","priority":2},
      {"id":"task-003","title":"C","description":"","estimatedHours":10,"requiredSkills":[],"rubricId":"","dependencies":["task-002"],"status":"todo","priority":3},
      {"id":"task-004","title":"D","description":"","estimatedHours":4,"requiredSkills":[],"rubricId":"","dependencies":["task-003"],"status":"todo","priority":4}
    ]
  }' | python -m json.tool
```


**Verification checkpoints** (manual calculation):

```
Topological order: task-001 → task-002 → task-003 → task-004

Forward pass:
  task-001: ES=0,  EF=8
  task-002: ES=8,  EF=14
  task-003: ES=14, EF=24
  task-004: ES=24, EF=28

projectDuration = 28

Backward pass:
  task-004: LF=28, LS=24
  task-003: LF=24, LS=14
  task-002: LF=14, LS=8
  task-001: LF=8,  LS=0

Slack (all = 0 → all critical)
```

- [ ] `nodes` has 4 elements, order consistent with topological sort
- [ ] `nodes[0].earlyStart` = 0
- [ ] `nodes[3].earlyFinish` = 28 (= projectDuration)
- [ ] All nodes' `slack` = 0 (due to linear dependency, all on critical path)
- [ ] All nodes' `isCritical` = true
- [ ] `criticalPath` = ["task-001","task-002","task-003","task-004"]
- [ ] `projectDuration` = 28

**Branch dependency verification** (task-003 depends on both task-001 and task-002):

```bash
curl -s -X POST http://localhost:3000/api/pipeline/critical-path \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id":"t1","title":"A","description":"","estimatedHours":4,"requiredSkills":[],"rubricId":"","dependencies":[],"status":"todo","priority":1},
      {"id":"t2","title":"B","description":"","estimatedHours":6,"requiredSkills":[],"rubricId":"","dependencies":["t1"],"status":"todo","priority":2},
      {"id":"t3","title":"C","description":"","estimatedHours":3,"requiredSkills":[],"rubricId":"","dependencies":["t1"],"status":"todo","priority":2},
      {"id":"t4","title":"D","description":"","estimatedHours":5,"requiredSkills":[],"rubricId":"","dependencies":["t2","t3"],"status":"todo","priority":3}
    ]
  }' | python -m json.tool
```

**Manual calculation**:

```
Topological order: t1 → t2, t3 (parallel) → t4

Forward:
  t1: ES=0, EF=4
  t2: ES=4, EF=10
  t3: ES=4, EF=7
  t4: ES=max(10,7)=10, EF=15

projectDuration = 15

Backward:
  t4: LF=15, LS=10
  t2: LF=10, LS=4     (slack=0, critical)
  t3: LF=10, LS=7     (slack=3, NOT critical)
  t1: LF=4, LS=0      (slack=0, critical)

criticalPath = [t1, t2, t4]   (t3 has 3h slack, not on critical path)
```

- [ ] t3's `slack` = 3, `isCritical` = false
- [ ] `criticalPath` only contains t1, t2, t4 (not t3)
- [ ] `projectDuration` = 15

### 13.6 Verification 5: Single-Step API — Risk Agent (FR-006)

**Verification target**: Input tasks + members + deadline + progress, output RiskAssessment

```bash
curl -s -X POST http://localhost:3000/api/pipeline/risk \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {"id":"task-001","title":"User Research","description":"8h","estimatedHours":8,"requiredSkills":["research"],"rubricId":"rub-001","dependencies":[],"status":"in-progress","priority":1,"assignedTo":"mem-003"},
      {"id":"task-009","title":"Write Report","description":"6h, needs writing+research+editing","estimatedHours":6,"requiredSkills":["writing","research","editing"],"rubricId":"rub-006","dependencies":["task-008"],"status":"todo","priority":2,"assignedTo":null}
    ],
    "members": [
      {"id":"mem-003","name":"Carol","avatar":"","skills":["research","analysis","writing"],"skillProficiency":{"coding":1,"design":2,"analysis":5,"writing":4,"research":5,"presentation":3,"editing":3,"management":3},"availability":14,"role":"Researcher","currentTaskIds":["task-001"]}
    ],
    "deadline": {"assignmentId":"asg-001","deadline":"2026-11-15T23:59:00+08:00","daysRemaining":36,"hoursRemaining":864,"isOverdue":false,"isUrgent":false},
    "progress": {"assignmentId":"asg-001","overallCompletion":18,"taskProgress":[{"taskId":"task-001","completionPercent":50,"hoursSpent":4,"hoursRemaining":4,"lastUpdated":"2026-10-10T10:00:00+08:00"}],"tasksCompleted":1,"tasksTotal":11,"hoursSpent":10,"hoursTotal":57,"isOnTrack":true,"updatedAt":"2026-10-10T10:00:00+08:00"}
  }' | python -m json.tool
```

**Verification checkpoints**:

- [ ] `flags` array is non-empty (at least 1 risk)
- [ ] Each flag has `riskType` (one of 5: deadline/dependency/skill_gap/overload/quality)
- [ ] Each flag has `riskLevel` (high/medium/low)
- [ ] Each flag has `recommendation` (non-empty, specifically actionable)
- [ ] task-009 (assignedTo=null, requires 3 skills) should trigger `skill_gap` risk
- [ ] `overallRiskLevel` is the highest level among flags

### 13.7 Verification 6: Single-Step API — Rescue Agent (FR-012)

**Verification target**: Input riskAssessment + tasks + members, output RescuePlan

```bash
curl -s -X POST http://localhost:3000/api/pipeline/rescue \
  -H "Content-Type: application/json" \
  -d '{
    "riskAssessment": {
      "assignmentId": "asg-001",
      "flags": [
        {"taskId":"task-009","riskLevel":"high","riskType":"skill_gap","description":"No member has writing+research+editing","recommendation":"Split task","detectedAt":"2026-10-10T10:00:00+08:00"}
      ],
      "overallRiskLevel": "high",
      "assessedAt": "2026-10-10T10:00:00+08:00"
    },
    "tasks": [
      {"id":"task-009","title":"Write Report","description":"6h","estimatedHours":6,"requiredSkills":["writing","research","editing"],"rubricId":"rub-006","dependencies":["task-008"],"status":"todo","priority":2,"assignedTo":null}
    ],
    "members": [
      {"id":"mem-002","name":"Bob","avatar":"","skills":["design","writing","editing"],"skillProficiency":{"coding":2,"design":5,"analysis":3,"writing":5,"research":3,"presentation":4,"editing":4,"management":2},"availability":12,"role":"Designer","currentTaskIds":[]},
      {"id":"mem-003","name":"Carol","avatar":"","skills":["research","analysis","writing"],"skillProficiency":{"coding":1,"design":2,"analysis":5,"writing":4,"research":5,"presentation":3,"editing":3,"management":3},"availability":14,"role":"Researcher","currentTaskIds":[]}
    ]
  }' | python -m json.tool
```

**Verification checkpoints**:

- [ ] `actions` array is non-empty
- [ ] Each action has `actionType` (one of 6: reassign/split/escalate/reduce_scope/add_resource/reorder)
- [ ] Each action has `estimatedImpact` (contains quantified effect, e.g. "Saves ~4h")
- [ ] Each action has `assignedTo` (points to a member ID or null)
- [ ] `projectedRecovery` is non-empty
- [ ] `confidence` is between 0.0-1.0
- [ ] For skill_gap risk, action should be `split` or `reassign` type

### 13.8 Verification 7: Full Pipeline — /api/pipeline/run

**Verification target**: Input assignment + members, execute all 6 Agents in one step

```bash
curl -s -X POST http://localhost:3000/api/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{
    "assignment": {
      "id":"asg-001","title":"CS3041 HCI Project","course":"CS3041",
      "deliverables":["Report","Prototype","Slides","Reflection"],
      "deadline":"2026-11-15T23:59:00+08:00","assignmentType":"mixed","teamSize":4,
      "description":"Design and evaluate a UI for campus food ordering app",
      "rubricText":"1. User Research (25 marks) - interviews\n2. Design (20 marks) - wireframes\n3. Prototype (20 marks) - Figma\n4. Evaluation (15 marks) - usability\n5. Presentation (10 marks) - 15 min\n6. Report (10 marks) - APA"
    },
    "members": [
      {"id":"mem-001","name":"Alice","avatar":"👩‍💻","skills":["coding","design"],"skillProficiency":{"coding":5,"design":4,"analysis":4,"writing":3,"research":3,"presentation":2,"editing":3,"management":3},"availability":15,"role":"Developer","currentTaskIds":[]},
      {"id":"mem-002","name":"Bob","avatar":"👨‍🎨","skills":["design","writing"],"skillProficiency":{"coding":2,"design":5,"analysis":3,"writing":5,"research":3,"presentation":4,"editing":4,"management":2},"availability":12,"role":"Designer","currentTaskIds":[]},
      {"id":"mem-003","name":"Carol","avatar":"👩‍🔬","skills":["research","analysis"],"skillProficiency":{"coding":1,"design":2,"analysis":5,"writing":4,"research":5,"presentation":3,"editing":3,"management":3},"availability":14,"role":"Researcher","currentTaskIds":[]},
      {"id":"mem-004","name":"David","avatar":"🎤","skills":["presentation","management"],"skillProficiency":{"coding":2,"design":3,"analysis":3,"writing":3,"research":2,"presentation":5,"editing":4,"management":5},"availability":10,"role":"Team Lead","currentTaskIds":[]}
    ]
  }' | python -m json.tool
```

**Verification checkpoints (full chain)**:

| Check Item                                       | Expected                    | Description              |
| ----------------------------------------- | --------------------- | --------------- |
| `isComplete`                              | true                  | All 6 steps complete        |
| `isRunning`                               | false                 | Pipeline finished    |
| `steps.length`                            | 6                     | 6 Agents       |
| Each `steps[i].status`                      | "completed"           | No error/skipped |
| `steps[0].agent.frId`                     | "FR-001"              | Rubric Agent    |
| `steps[3].agent.type`                     | "deterministic"       | CPM is not LLM      |
| `steps[3].durationMs`                     | ≤ 100                 | CPM should be near-instant       |
| `steps[0..5].durationMs`                  | > 0                   | Mock has simulated latency      |
| `rubric.items.length`                     | ≥ 1                   | At least 1 criterion parsed     |
| `rubric.totalMarks`                       | > 0                   | Total marks valid            |
| `plan.tasks.length`                       | 8-15                  | Reasonable task count          |
| `plan.totalEstimatedHours`                | > 0                   | Has hour estimates           |
| `plan.tasks` each has `relatedRubricIds`       | non-empty                    | Tasks linked to rubric criteria       |
| `skillMatch.assignments.length`           | > 0                   | At least 1 assignment       |
| `skillMatch.assignments` each has `matchScore` | 0-1                   | Score in valid range         |
| `criticalPath.nodes.length`               | = `plan.tasks.length` | Every task has a CPM node   |
| `criticalPath.projectDuration`            | > 0                   | Total project hours           |
| `riskAssessment.flags.length`             | ≥ 1                   | At least 1 risk detected     |
| `riskAssessment.overallRiskLevel`         | not "none"              | Has risk level           |
| `rescuePlan.actions.length`               | ≥ 1                   | At least 1 rescue action      |
| `rescuePlan.confidence`                   | 0-1                   | Confidence valid           |
| `deadline.daysRemaining`                  | > 0                   | Deadline is in the future         |

### 13.9 Verification 8: Client-Side Pipeline Visualization

**Verification target**: Click "Run Pipeline" button, 6 steps display in real time

**Operation steps**:

1. Open <http://localhost:3000>
2. Scroll to the "6 Agents Run Autonomously" section
3. Click the "Run Pipeline" button
4. Observe 6 steps sequentially going from pending → running → completed

**Verification checkpoints**:

- [ ] Steps execute in order (no skipping or out-of-order)
- [ ] Running state has loading animation
- [ ] Each step shows durationMs and result summary after completion
- [ ] Summary shown at bottom after completion (count of criteria/tasks/risks/rescue)
- [ ] CPM step shows "Instant" or very short time
- [ ] Can click "Run Pipeline" again to re-execute

### 13.10 Verification 9: Data Chain Integrity

**Verification target**: Ensure data is passed correctly between Agents

**Verification method**: Cross-check the output of the full Pipeline

```bash
# Run full pipeline and save output
curl -s -X POST http://localhost:3000/api/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{...}' > /tmp/pipeline_output.json

# Check 1: tasks' relatedRubricIds exist in rubric.items
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
rubric_ids = {i['id'] for i in d['rubric']['items']}
for t in d['plan']['tasks']:
    for rid in t.get('relatedRubricIds', []):
        assert rid in rubric_ids, f'{rid} not in rubric!'
print('PASS: all relatedRubricIds valid')
"

# Check 2: skillMatch's taskId exists in plan.tasks
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
task_ids = {t['id'] for t in d['plan']['tasks']}
for a in d['skillMatch']['assignments']:
    assert a['taskId'] in task_ids, f'{a[\"taskId\"]} not in tasks!'
print('PASS: all assignment taskIds valid')
"

# Check 3: criticalPath.nodes count = plan.tasks count
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
assert len(d['criticalPath']['nodes']) == len(d['plan']['tasks']), 'node count mismatch!'
print('PASS: CPM node count matches task count')
"

# Check 4: rescuePlan's taskId exists in plan.tasks
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
task_ids = {t['id'] for t in d['plan']['tasks']}
for a in d['rescuePlan']['actions']:
    assert a['taskId'] in task_ids, f'{a[\"taskId\"]} not in tasks!'
print('PASS: all rescue taskIds valid')
"

# Check 5: criticalPath.projectDuration = max(earlyFinish)
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
max_ef = max(n['earlyFinish'] for n in d['criticalPath']['nodes'])
assert d['criticalPath']['projectDuration'] == max_ef, 'duration mismatch!'
print('PASS: projectDuration = max earlyFinish')
"
```

### 13.11 Verification 10: Mock→Real LLM Switch Readiness

**Verification target**: Confirm mock-llm.ts interface design is compatible with real cloud.llm

**Verification method**: Code review (no actual run needed)

Check `mock-llm.ts`:

- [ ] `LLMCallParams` interface has: `systemPrompt`, `userPrompt`, `temperature`, `responseFormat`
- [ ] `LLMCallResult` interface has: `content`, `parsed`, `durationMs`, `model`
- [ ] `realLLMCall()` function is commented out; uncomment to enable
- [ ] `realLLMCall()` uses `stream: true` (WorkBuddy requirement)
- [ ] `realLLMCall()` uses `response_format: { type: 'json_object' }` to ensure structured output
- [ ] `realLLMCall()` collects chunks then `JSON.parse(content)` to populate `parsed`
- [ ] 5 `callXxxAgent()` function signatures unchanged (only internally switch from mockLLMCall to realLLMCall)

Check other files:

- [ ] `orchestrator.ts` needs no changes (calls `callXxxAgent` functions)
- [ ] `API routes` need no changes (calls `callXxxAgent` functions)
- [ ] `prompts.ts` needs no changes (only generates LLMCallParams)

### 13.12 Verification 11: Before/After Data Consistency

**Verification target**: BeforeAfterComparison displays data consistent with mock data

**Verification method**: Inspect page rendering in browser

Open <http://localhost:3000, find> the "Measurable Impact" section:

| Element                       | Expected Value                   | Data Source                                   |
| ------------------------ | --------------------- | -------------------------------------- |
| Before - Estimated Hours | 57h                   | mockPlanResult.totalEstimatedHours     |
| After - Estimated Hours  | 50h (-7h saved)       | 57 - 7 (savedHours hardcoded)                |
| Before - Tasks at Risk   | 4                     | mockRiskAssessment.flags.length        |
| After - Tasks at Risk    | 0 (all resolved)      | Risks cleared to zero after rescue                                |
| Before - Unassigned      | 3                     | mockSkillMatch.unmatchedTaskIds.length |
| After - Unassigned       | 0 (all assigned)      | All assigned after rescue                                |
| Before - Deadline Status | Behind schedule       | Static text                                   |
| After - Deadline Status  | On track (+4h buffer) | Static text                                   |
| Before - Overall Risk    | HIGH                  | Static text                                   |
| After - Overall Risk     | LOW                   | Static text                                   |
| Stat: Hours Saved        | -7h                   | savedHours variable                          |
| Stat: Risks Resolved     | 4 → 0                 | riskCount variable                           |
| Stat: Deadline Buffer    | +4h                   | Static                                     |
| Stat: Rescue Actions     | 4                     | mockRescuePlan.actions.length          |
| Progress bar: Without    | 15%                   | Hardcoded                                    |
| Progress bar: With       | 35%                   | Hardcoded                                    |

### 13.13 Verification Summary Table

| Verification Item                    | Verification Method                 | Key Checkpoints  |
| ---------------------- | -------------------- | ------- |
| Rubric API (FR-001)    | curl + JSON check       | 5       |
| Task API (FR-002)      | curl + JSON check + data chain | 8       |
| Skill API (FR-003)     | curl + logic verification          | 6       |
| Critical Path (FR-004) | curl + manual calculation (linear + branch)  | 7+6     |
| Risk API (FR-006)      | curl + risk type check        | 6       |
| Rescue API (FR-012)    | curl + action type check        | 7       |
| Full Pipeline          | curl + full chain checklist        | 17      |
| Client-side visualization                 | Browser manual operation              | 6       |
| Data chain integrity                 | Python script cross-check        | 5       |
| Mock→Real LLM          | Code review                 | 8       |
| Before/After           | Browser rendering check              | 13      |
| **Total**                 |                      | **~94** |

---

## 15. MVP Requirements Mapping (Hackathon Final Spec)

> This section maps each requirement from the Hackathon Final MVP Requirements document to its code implementation location and data model.
> Legend: ✅ Implemented | 🔧 Code updated | 📋 Document covered | ⏳ Frontend pending implementation

### 15.1 Rubric Good/Average/Poor Three-Level Criteria

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| RubricItem add goodLevelRequirements | `types.ts` → `RubricItem.goodLevelRequirements?: RubricLevelRequirements` | 🔧 |
| RubricItem add averageLevelRequirements | `types.ts` → `RubricItem.averageLevelRequirements?: RubricLevelRequirements` | 🔧 |
| RubricItem add poorLevelRequirements | `types.ts` → `RubricItem.poorLevelRequirements?: RubricLevelRequirements` | 🔧 |
| Each level includes description + estimatedHours + keyDeliverables | `types.ts` → `RubricLevelRequirements` interface | 🔧 |
| Rubric Agent prompt extracts three-level criteria | `prompts.ts` → `RUBRIC_AGENT_SYSTEM` Rule 6 | 🔧 |
| Rubric Agent JSON output includes three-level fields | `prompts.ts` → `RUBRIC_AGENT_USER` JSON template | 🔧 |
| Mock data populates three-level criteria | `mockRubric.ts` → 6 RubricItems all with three-level fields | 🔧 |

**RubricLevelRequirements data model:**
```typescript
interface RubricLevelRequirements {
  description: string;          // Description of requirements for this level
  estimatedHours?: number;       // Suggested hours to reach this level
  keyDeliverables?: string[];    // Key deliverables list
}
```

**Mock example (rub-001 User Research):**
| Level | Description | Suggested Hours | Key Deliverables |
| --- | --- | --- | --- |
| Good | 10+ interviews, 3+ personas, comprehensive task analysis | 8h | 10+ transcripts, 3+ personas, flow diagrams, pain points |
| Average | 8-9 interviews, 2 personas, basic task analysis | 5h | 8-9 transcripts, 2 personas, basic analysis |
| Poor | <8 interviews, 1 persona, incomplete | 3h | <8 interviews, 1 persona |

### 15.2 Multi-Member Tasks (Multi-person Tasks)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| Task supports multi-member assignment | `types.ts` → `Task.memberAssignments?: MemberTaskAssignment[]` | 🔧 |
| Per-member personalized hour estimation | `types.ts` → `MemberTaskAssignment.estimatedHours` (per-member) | 🔧 |
| Per-member match score | `types.ts` → `MemberTaskAssignment.matchScore` | 🔧 |
| Per-member role (Primary/Support/Reviewer) | `types.ts` → `MemberTaskAssignment.role` | 🔧 |
| Preserve assignedTo (backward compat) | `types.ts` → `Task.assignedTo` remains primary assignee | ✅ |
| Task Agent prompt supports multi-member | `prompts.ts` → `TASK_AGENT_SYSTEM` Rule 8 | 🔧 |
| Mock data example: task-005 (2 people) | `mockTasks.ts` → task-005: mem-001(6h, Primary) + mem-002(4h, Support) | 🔧 |
| Mock data example: task-010 (4 people) | `mockTasks.ts` → task-010: all members, different hours each | 🔧 |

**MemberTaskAssignment data model:**
```typescript
interface MemberTaskAssignment {
  memberId: string;
  estimatedHours: number;       // Per-member personalized hours for this task
  matchScore: number;           // 0.0-1.0
  role: string;                 // "Primary" | "Support" | "Reviewer"
  invitationStatus: InvitationStatus;
  rejectReason?: string | null;
}
```

**Mock example (task-005 Build Prototype):**
| Member | Role | Personalized Hours | Match Score | Invitation Status |
| --- | --- | --- | --- | --- |
| mem-001 (Alice) | Primary | 6h | 0.94 | pending |
| mem-002 (Bob) | Support (visual polish) | 4h | 0.82 | pending |

### 15.3 Accept/Reject Invitation Flow

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| InvitationStatus type | `types.ts` → `InvitationStatus = 'pending' \| 'accepted' \| 'rejected'` | 🔧 |
| Task.invitationStatus field | `types.ts` → `Task.invitationStatus?: InvitationStatus` | 🔧 |
| Task.rejectReason field | `types.ts` → `Task.rejectReason?: string \| null` | 🔧 |
| MemberTaskAssignment.invitationStatus | `types.ts` → `MemberTaskAssignment.invitationStatus` | 🔧 |
| Task Agent prompt generates pending status | `prompts.ts` → `TASK_AGENT_SYSTEM` Rule 9 | 🔧 |
| Mock: completed tasks accepted | `mockTasks.ts` → task-001/002/003: `invitationStatus: 'accepted'` | 🔧 |
| Mock: pending tasks pending | `mockTasks.ts` → task-004~011: `invitationStatus: 'pending'` | 🔧 |
| Mock: rejection example | `mockTasks.ts` → task-009: `invitationStatus: 'rejected'`, rejectReason records the reason | 🔧 |

**Flow logic:**
```
AI assigns task → invitationStatus: 'pending'
     ↓
Member receives notification → Accept (accepted) or Reject (rejected + rejectReason)
     ↓
After rejection → task returns to unassigned, Rescue Agent reassigns
```

**Mock rejection example (task-009 Report Writing):**
```json
{
  "id": "task-009",
  "assignedTo": null,
  "invitationStatus": "rejected",
  "rejectReason": "Original assignee (mem-002) rejected: at capacity with task-003 and task-004"
}
```

### 15.4 Seven Risk Types (7 Risk Types)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| Expand riskType to 7 types | `types.ts` → `RiskFlag.riskType` union type | 🔧 |
| + 'insufficient_time' | Hours exceed member's weekly available time | 🔧 |
| + 'unassigned' | Task has no assigned member | 🔧 |
| Risk Agent prompt includes 7 types | `prompts.ts` → `RISK_AGENT_SYSTEM` RISK TYPES (7 types) | 🔧 |
| Risk Agent distinguishes unassigned vs skill_gap | `prompts.ts` → `RISK_AGENT_SYSTEM` Rule 3-4 | 🔧 |
| Mock: insufficient_time example | `mockRiskFlags.ts` → task-002: 4h remaining + 14h/week, tight chain | 🔧 |
| Mock: unassigned example | `mockRiskFlags.ts` → task-008 + task-009: no assigned member | 🔧 |

**7 Risk Types Comparison:**
| # | riskType | Meaning | Trigger Condition | Mock Example |
| --- | --- | --- | --- | --- |
| 1 | `deadline` | Task delayed/blocks critical path | Progress behind + has downstream | task-002: 50% complete, blocking task-003 |
| 2 | `dependency` | Upstream task delayed | Upstream task delayed | — |
| 3 | `skill_gap` | No member has sufficient skills | Match score < 0.3 | — |
| 4 | `overload` | Member overloaded | Assigned task count > available time | — |
| 5 | `quality` | Quality risk | Complexity vs skill mismatch | — |
| 6 | `insufficient_time` | Insufficient time | Remaining hours + dependency chain > weekly available time | task-002: 4h left, 19h downstream, 14h/week |
| 7 | `unassigned` | No assigned member | assignedTo === null | task-008, task-009: no assigned member |

### 15.5 Autonomous Deadline Defender — 6-Step Rescue Workflow

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| 6-step workflow type | `types.ts` → `RescueWorkflowStep = 'detect' \| 'analyze' \| 'optimize' \| 'validate' \| 'apply' \| 'compare'` | 🔧 |
| Workflow state tracking | `types.ts` → `RescueWorkflowState` (currentStep, optimizationRound, maxRounds, stepHistory) | 🔧 |
| Step history records | `types.ts` → `RescueStepRecord[]` (step, round, timestamp, description, result) | 🔧 |
| RescuePlan linked to workflow | `types.ts` → `RescuePlan.workflow?: RescueWorkflowState` | 🔧 |
| Rescue Agent prompt describes 6 steps | `prompts.ts` → `RESCUE_AGENT_SYSTEM` MVP 6-STEP WORKFLOW section | 🔧 |
| Rescue Agent JSON output includes workflow | `prompts.ts` → `RESCUE_AGENT_USER` JSON template | 🔧 |
| Mock: complete 6-step history | `mockRiskFlags.ts` → mockRescuePlan.workflow.stepHistory (6 records) | 🔧 |

**6-Step Workflow Details:**
| Step | Name | Input | Output | Mock Record |
| --- | --- | --- | --- | --- |
| 1 | Detect | RiskAssessment | 5 risk flags detected | "5 risks detected, overall risk: medium" |
| 2 | Analyze | risks + critical path | task-002 blocks 8 downstream tasks | "Critical path at risk, 3 unassigned" |
| 3 | Optimize | analysis + rubric priority | 4 rescue actions generated | "4 actions proposed, estimated 7h savings" |
| 4 | Validate | proposed actions | no circular deps, coverage 100% | "Plan valid, no issues found" |
| 5 | Apply | validated actions | 3 auto-applied + 1 Leader-approved | "3 auto-applied, 1 pending → approved by David" |
| 6 | Compare | before/after state | 57h→50h, 5 risks→0, -4h→+4h buffer | "Improvement confirmed, rescue successful" |

### 15.6 Max 3 Optimization Rounds

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| maxRounds = 3 | `types.ts` → `RescueWorkflowState.maxRounds` | 🔧 |
| optimizationRound counter | `types.ts` → `RescueWorkflowState.optimizationRound` | 🔧 |
| Round 1-3 logic | `prompts.ts` → `RESCUE_AGENT_SYSTEM` MAX 3 OPTIMIZATION ROUNDS section | 🔧 |
| Mock: Round 1 succeeded | `mockRiskFlags.ts` → `optimizationRound: 1`, stepHistory shows Round 1 sufficient | 🔧 |
| Skip Round 2/3 condition | `prompts.ts` → "Stop when comparison shows improvement" | 🔧 |

**Round logic:**
```
Round 1: Generate initial plan → Validate → Compare
  → If improved: STOP (Round 1 sufficient)
  → If not improved or unsatisfied: → Round 2

Round 2: Adjust actions → Validate → Compare
  → If improved: STOP
  → If still unsatisfied: → Round 3

Round 3: Final attempt → Validate → Compare
  → If improved: STOP
  → If still unsatisfied: ESCALATE to Leader ("manual intervention required")
```

### 15.7 Rescue Permission Rules (Rescue Permission Rules)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| Unconfirmed + not started: auto-modify | `prompts.ts` → `RESCUE_AGENT_SYSTEM` PERMISSION RULES | 🔧 |
| Confirmed: requires Leader approval | `prompts.ts` → same as above | 🔧 |
| In progress: always requires Leader approval | `prompts.ts` → same as above | 🔧 |
| requiresLeaderApproval field | `types.ts` → `RescuePlan.requiresLeaderApproval?: boolean` | 🔧 |
| approvalStatus field | `types.ts` → `RescuePlan.approvalStatus?: 'pending' \| 'approved' \| 'rejected'` | 🔧 |
| Rescue Agent prompt passes confirmed status | `prompts.ts` → `RESCUE_AGENT_USER` shows each task's Permission status | 🔧 |
| Mock: res-001 needs approval (task-002 confirmed) | `mockRiskFlags.ts` → `requiresLeaderApproval: true`, `approvalStatus: 'approved'` | 🔧 |
| Mock: res-002/003/004 auto (unconfirmed) | `mockRiskFlags.ts` → stepHistory apply step record | 🔧 |

**Permission Matrix:**
| Task Status | confirmed | Can auto-modify? | Mock Example |
| --- | --- | --- | --- |
| todo | false | ✅ YES | task-004 (reassign), task-009 (reassign), task-011 (reorder) |
| todo | true | ❌ NO — requires Leader | — |
| in-progress | true | ❌ NO — requires Leader | task-002 (split) → Leader approved |
| in-progress | false | ❌ NO — requires Leader | — |
| done | any | ❌ NO — cannot modify | — |

### 15.8 Rubric-Aware Rescue Priority (Rubric-Aware Rescue Priority)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| Rescue prioritizes tasks covering more rubric marks | `prompts.ts` → `RESCUE_AGENT_SYSTEM` Optimize step (a) | 🔧 |
| Rescue Agent passes relatedRubricIds | `prompts.ts` → `RESCUE_AGENT_USER` shows each task's Related Rubric IDs | 🔧 |
| Rubric-aware priority hint | `prompts.ts` → `RESCUE_AGENT_USER` "RUBRIC-AWARE PRIORITY" section | 🔧 |

**Priority sorting logic:**
```
1. Rubric marks coverage: Rescue prioritizes tasks covering more marks
   (task-002 covers rub-001=25 marks → high priority)
2. Critical path impact: Actions that unblock more downstream tasks are prioritized
   (split task-002 unblocks 8 downstream tasks)
3. Feasibility: Actions executable within member's available time are prioritized
```

### 15.9 Comparison Result (Before/After Rescue Comparison)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| RescueComparisonResult type | `types.ts` → `RescueComparisonResult` interface | 🔧 |
| beforeHours / afterHours | `types.ts` → `comparisonResult.beforeHours/afterHours` | 🔧 |
| hoursSaved | `types.ts` → `comparisonResult.hoursSaved` | 🔧 |
| beforeRiskLevel / afterRiskLevel | `types.ts` → `comparisonResult.beforeRiskLevel/afterRiskLevel` | 🔧 |
| beforeTasksAtRisk / afterTasksAtRisk | `types.ts` → `comparisonResult` | 🔧 |
| beforeDeadlineBuffer / afterDeadlineBuffer | `types.ts` → `comparisonResult` | 🔧 |
| improvementSummary | `types.ts` → `comparisonResult.improvementSummary` | 🔧 |
| RescuePlan linked to comparisonResult | `types.ts` → `RescuePlan.comparisonResult?` | 🔧 |
| Mock: complete comparison data | `mockRiskFlags.ts` → 57h→50h, medium→none, 5→0, -4h→+4h | 🔧 |

**Mock comparison data:**
| Metric | Before (pre-rescue) | After (post-rescue) | Change |
| --- | --- | --- | --- |
| Total Hours | 57h | 50h | -7h saved |
| Risk Level | medium | none | ↓ resolved |
| Tasks at Risk | 5 | 0 | -5 resolved |
| Deadline Buffer | -4h (behind) | +4h (ahead) | +8h swing |
| Overall | Behind schedule | On track | ✅ Rescue successful |

### 15.10 Weekly Availability (Daily Available Time)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| WeeklyAvailability type | `types.ts` → `WeeklyAvailability` (monday-sunday) | 🔧 |
| Member.weeklyAvailability field | `types.ts` → `Member.weeklyAvailability?: WeeklyAvailability` | 🔧 |
| Mock: 4 members' daily data | `mockMembers.ts` → all members with weeklyAvailability | 🔧 |

**Mock daily available time:**
| Member | Mon | Tue | Wed | Thu | Fri | Sat | Sun | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice (mem-001) | 3h | 3h | 2h | 2h | 2h | 2h | 1h | 15h |
| Bob (mem-002) | 2h | 2h | 2h | 2h | 2h | 1h | 1h | 12h |
| Carol (mem-003) | 3h | 3h | 2h | 2h | 2h | 1h | 1h | 14h |
| David (mem-004) | 2h | 2h | 2h | 2h | 1h | 0h | 1h | 10h |

### 15.11 Plan Validator (Plan Validator)

| Requirement | Implementation Location | Status |
| --- | --- | --- |
| PlanValidationResult type | `types.ts` → `PlanValidationResult` interface | 🔧 |
| PlanResult.validation field | `types.ts` → `PlanResult.validation?: PlanValidationResult` | 🔧 |
| Validation item: rubricCoverageComplete | `types.ts` → `PlanValidationResult.rubricCoverageComplete` | 🔧 |
| Validation item: allTasksHaveMembers | `types.ts` → `PlanValidationResult.allTasksHaveMembers` | 🔧 |
| Validation item: noCircularDependencies | `types.ts` → `PlanValidationResult.noCircularDependencies` | 🔧 |
| Validation item: deadlineFeasible | `types.ts` → `PlanValidationResult.deadlineFeasible` | 🔧 |
| issues[] + suggestions[] | `types.ts` → `PlanValidationResult.issues/suggestions` | 🔧 |
| Mock: validation result | `mockTasks.ts` → `mockPlanResult.validation` | 🔧 |

**Mock Plan Validator output:**
```json
{
  "isValid": false,
  "rubricCoverageComplete": true,
  "allTasksHaveMembers": false,
  "noCircularDependencies": true,
  "deadlineFeasible": true,
  "issues": [
    "task-008: unassigned — requires design + analysis skills",
    "task-009: unassigned — previous assignee rejected",
    "task-011: unassigned"
  ],
  "suggestions": [
    "Assign task-008 to mem-002 after task-004 completes",
    "Reassign task-004 to mem-001 to free mem-002 for report writing",
    "task-011 can be auto-assigned: all members write reflections"
  ]
}
```

### 15.12 P0/P1/P2 Priority List

| Priority | Scope | Status |
| --- | --- | --- |
| **P0 (Must)** | 6-Agent Pipeline (Rubric→Task→Skill→CPM→Risk→Rescue) | ✅ Implemented |
| **P0** | Mock LLM layer (switchable to real LLM) | ✅ Implemented |
| **P0** | Before/After rescue comparison demo | ✅ Implemented |
| **P0** | Narrative-driven landing page | ✅ Implemented |
| **P0** | types.ts complete data contract | 🔧 Updated (MVP fields) |
| **P0** | Rubric Good/Average/Poor three levels | 🔧 Implemented |
| **P0** | 7 risk types | 🔧 Implemented |
| **P0** | 6-Step Rescue Workflow | 🔧 Implemented |
| **P0** | Max 3 optimization rounds | 🔧 Implemented |
| **P0** | Rescue permission rules | 🔧 Implemented |
| **P0** | Comparison result | 🔧 Implemented |
| **P0** | Multi-member tasks + personalized hours | 🔧 Implemented |
| **P0** | Accept/reject flow | 🔧 Implemented |
| **P0** | Plan Validator | 🔧 Implemented |
| **P0** | Weekly availability | 🔧 Implemented |
| **P1 (Should)** | Kanban Board (@dnd-kit) | ⏳ Frontend pending |
| **P1** | Gantt Chart | ⏳ Frontend pending |
| **P1** | Task Detail Panel | ⏳ Frontend pending |
| **P1** | Rescue Plan Modal | ⏳ Frontend pending |
| **P1** | WorkBuddy cloud.llm integration | ⏳ Pending activation |
| **P2 (Could)** | Hero typography refinement | ⏳ Frontend pending |
| **P2** | Visual polish | ⏳ Frontend pending |
| **P2** | PDF upload (Assignment Input) | ⏳ Future |

### 15.13 5-Scene Demo Story

| Scene | Description | Components Showcased | Data Source |
| --- | --- | --- | --- |
| Scene 1: Input | Paste Assignment + Rubric text | AssignmentInputForm | mockAssignment + rubricText |
| Scene 2: Pipeline | 6-Agent real-time execution | PipelineRunner | orchestrator + mock-llm |
| Scene 3: Plan | 11 tasks, multi-member assignments, invitation status | (TaskBoard pending) | mockPlanResult |
| Scene 4: Risk + Rescue | 5 risks → 6-step rescue → comparison | BeforeAfterComparison | mockRiskAssessment + mockRescuePlan |
| Scene 5: Architecture | 6 Agent cards + Track 2 mapping | AgentCard section | page.tsx CRITERIA_MAPPING |

### 15.14 MVP Requirements Implementation Summary

| MVP Requirement | Code Implementation | Mock Data | Prompt Update | Document Coverage |
| --- | --- | --- | --- | --- |
| Rubric Good/Average/Poor | ✅ types.ts | ✅ mockRubric | ✅ RUBRIC_AGENT | ✅ §15.1 |
| Multi-member tasks | ✅ types.ts | ✅ mockTasks | ✅ TASK_AGENT | ✅ §15.2 |
| Personalized time estimation | ✅ MemberTaskAssignment | ✅ task-005/010 | ✅ TASK_AGENT | ✅ §15.2 |
| Accept/reject flow | ✅ InvitationStatus | ✅ task-009 rejected | ✅ TASK_AGENT | ✅ §15.3 |
| 7 risk types | ✅ RiskFlag.riskType | ✅ mockRiskFlags | ✅ RISK_AGENT | ✅ §15.4 |
| 6-step rescue workflow | ✅ RescueWorkflowState | ✅ stepHistory | ✅ RESCUE_AGENT | ✅ §15.5 |
| Max 3 optimization rounds | ✅ maxRounds + optimizationRound | ✅ round=1 | ✅ RESCUE_AGENT | ✅ §15.6 |
| Rescue permission rules | ✅ requiresLeaderApproval | ✅ res-001 approved | ✅ RESCUE_AGENT | ✅ §15.7 |
| Rubric-aware rescue priority | ✅ prompt logic | ✅ rubric IDs in prompt | ✅ RESCUE_AGENT | ✅ §15.8 |
| Comparison result | ✅ RescueComparisonResult | ✅ 57h→50h | ✅ RESCUE_AGENT | ✅ §15.9 |
| Weekly availability | ✅ WeeklyAvailability | ✅ mockMembers | — | ✅ §15.10 |
| Plan Validator | ✅ PlanValidationResult | ✅ mockPlanResult.validation | — | ✅ §15.11 |
| P0/P1/P2 priority | ✅ all P0 done | ✅ | ✅ | ✅ §15.12 |
| 5-scene demo story | ✅ page.tsx | ✅ | — | ✅ §15.13 |

---

*Document version: 2026-10-11 v2 | Project: PlanPilot AI | Track 2: WorkBuddy Agentic Solution*
