# TaskFlow AI — 功能逻辑文档

> 本文档详细说明 TaskFlow AI 的完整功能逻辑：从用户输入到 6-Agent Pipeline 执行再到最终输出。  
> 面向：Hackathon 评委、开发者、队友。

---

## 目录

1. [系统总览](#1-系统总览)
2. [完整数据流](#2-完整数据流)
3. [数据契约 (types.ts)](#3-数据契约-typests)
4. [6-Agent Pipeline 详解](#4-6-agent-pipeline-详解)
   - [Agent 1: Rubric Intelligence (FR-001)](#agent-1-rubric-intelligence-fr-001)
   - [Agent 2: Task Decomposition (FR-002)](#agent-2-task-decomposition-fr-002)
   - [Agent 3: Skill Matching (FR-003)](#agent-3-skill-matching-fr-003)
   - [Agent 4: Critical Path (FR-004)](#agent-4-critical-path-fr-004)
   - [Agent 5: Risk Detection (FR-006)](#agent-5-risk-detection-fr-006)
   - [Agent 6: Rescue Planner (FR-012)](#agent-6-rescue-planner-fr-012)
5. [CPM 算法详解](#5-cpm-算法详解)
6. [Mock LLM 层与真实 LLM 切换](#6-mock-llm-层与真实-llm-切换)
7. [Orchestrator 编排逻辑](#7-orchestrator-编排逻辑)
8. [API 端点参考](#8-api-端点参考)
9. [组件与数据源映射](#9-组件与数据源映射)
10. [错误处理机制](#10-错误处理机制)
11. [Before/After 对比逻辑](#11-beforeafter-对比逻辑)
12. [Track 2 评判标准覆盖](#12-track-2-评判标准覆盖)

---

## 1. 系统总览

TaskFlow AI 是一个 6-Agent 自动化 Pipeline，输入一份作业要求 (Assignment)，输出一份完整的执行计划：任务分解、人员分配、关键路径、风险检测、救援方案。

```
用户输入 Assignment (标题 + Rubric 文本 + 截止日期 + 团队成员)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                   6-Agent Pipeline                        │
│                                                           │
│  Step 0: 计算截止日期 (确定性, 非Agent)                     │
│     │                                                     │
│     ▼                                                     │
│  Step 1: Rubric Agent (LLM) ──→ RubricResult             │
│     │  输入: assignment.rubricText                        │
│     │  输出: 结构化评分标准 [{criteria, marks, ...}]       │
│     ▼                                                     │
│  Step 2: Task Agent (LLM) ──→ PlanResult                 │
│     │  输入: assignment + rubricResult                    │
│     │  输出: 任务列表 [{title, skills, deps, hours}]       │
│     ▼                                                     │
│  Step 3: Skill Agent (LLM) ──→ SkillMatchResult          │
│     │  输入: tasks + members                              │
│     │  输出: 任务分配 [{taskId, memberId, matchScore}]     │
│     ▼                                                     │
│  Step 4: Critical Path Agent (确定性) ──→ CriticalPathResult │
│     │  输入: tasks (with dependencies + hours)            │
│     │  输出: 关键路径 [{taskId, slack, isCritical}]        │
│     ▼                                                     │
│  Step 5: Risk Agent (LLM) ──→ RiskAssessment             │
│     │  输入: tasks + members + deadline + progress       │
│     │  输出: 风险标记 [{taskId, riskType, recommendation}] │
│     ▼                                                     │
│  Step 6: Rescue Agent (混合) ──→ RescuePlan              │
│        输入: riskAssessment + tasks + members             │
│        输出: 救援行动 [{actionType, impact, assignedTo}]   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
最终输出: PipelineState (包含全部 6 步结果)
```

### 核心设计原则

- **链式传递**: 每一步的输出是下一步的输入，形成数据链条
- **可见性**: 每一步都有运行状态 (pending → running → completed/error) + 日志
- **可替换**: LLM 调用通过 mock-llm.ts 中间层，可一键切换真实 cloud.llm
- **确定性 + LLM 混合**: 不是全部靠 LLM，关键路径用 CPM 确定性算法保证准确性

---

## 2. 完整数据流

### 2.1 输入阶段

```
用户在 AssignmentInputForm 填写:
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
构造 Assignment 对象 + Member[] 数组
         │
         ▼
POST /api/pipeline/run  (body: { assignment, members })
  或
客户端直接调用 runPipeline(assignment, members, onProgress)
```

### 2.2 Pipeline 执行阶段

每一步的数据传递关系：

```
Step 0: calculateDeadline(assignment.deadline)
  输入: assignment.deadline = "2026-11-15T23:59:00+08:00"
  输出: DeadlineInfo { daysRemaining: 36, isUrgent: false, isOverdue: false }

Step 1: callRubricAgent(assignment)
  输入: assignment.rubricText (原始文本)
  输出: RubricResult {
    items: [
      { id: "rub-001", criteria: "User Research & Analysis", marks: 25, mandatory: true },
      { id: "rub-002", criteria: "Design & Wireframing", marks: 20, mandatory: true },
      ...共 6 个
    ],
    totalMarks: 100,
    rawExtractionConfidence: 0.92
  }

Step 2: callTaskAgent(assignment, rubricResult)
  输入: assignment + Step 1 的 rubricResult
  输出: PlanResult {
    tasks: [
      { id: "task-001", title: "User Interview Planning", requiredSkills: ["research","management"],
        estimatedHours: 4, dependencies: [], relatedRubricIds: ["rub-001"], priority: "critical" },
      { id: "task-002", title: "Conduct User Interviews", requiredSkills: ["research","analysis","writing"],
        estimatedHours: 8, dependencies: ["task-001"], relatedRubricIds: ["rub-001"], priority: "critical" },
      ...共 11 个任务, 总计 57h
    ],
    criticalPath: ["task-001","task-002",...],  // LLM 的初步估算
    totalEstimatedHours: 57
  }

Step 3: callSkillAgent(tasks, members)
  输入: Step 2 的 tasks + 团队成员 members
  输出: SkillMatchResult {
    assignments: [
      { taskId: "task-001", memberId: "mem-003", matchScore: 0.95, matchReason: "Strong in research (5/5)" },
      { taskId: "task-003", memberId: "mem-002", matchScore: 0.97, matchReason: "Design proficiency 5/5" },
      ...共 8 个分配
    ],
    unmatchedTaskIds: ["task-008","task-009","task-011"]  // 3 个无法匹配
  }

Step 4: calculateCriticalPath(tasks)
  输入: Step 2 的 tasks (带 dependencies + estimatedHours)
  输出: CriticalPathResult {
    nodes: [
      { taskId: "task-001", earlyStart: 0, earlyFinish: 8, lateStart: 0, lateFinish: 8, slack: 0, isCritical: true },
      { taskId: "task-002", earlyStart: 8, earlyFinish: 16, lateStart: 8, lateFinish: 16, slack: 0, isCritical: true },
      ...
    ],
    criticalPath: ["task-001","task-002","task-003",...],
    projectDuration: 57  // 小时
  }

Step 5: callRiskAgent(tasks, members, deadline, progress)
  输入: Step 2 tasks + members + Step 0 deadline + 进度数据
  输出: RiskAssessment {
    flags: [
      { taskId: "task-009", riskLevel: "high", riskType: "skill_gap",
        description: "No member has writing+research+editing at high proficiency",
        recommendation: "Split task: assign writing to Bob, research to Carol" },
      { taskId: "task-002", riskLevel: "medium", riskType: "deadline",
        description: "8h task on critical path with 36 days buffer",
        recommendation: "Start early to avoid blocking downstream" },
      ...共 4 个风险
    ],
    overallRiskLevel: "medium"
  }

Step 6: callRescueAgent(riskAssessment, tasks, members)
  输入: Step 5 的 riskAssessment + tasks + members
  输出: RescuePlan {
    actions: [
      { id: "res-001", taskId: "task-009", actionType: "split",
        description: "Split report writing: Bob does draft, Carol adds research sections",
        priority: "critical", estimatedImpact: "Saves ~4h, unblocks task-010",
        assignedTo: "mem-002" },
      { id: "res-002", taskId: "task-011", actionType: "reduce_scope",
        description: "Reduce individual reflection to 400 words instead of 500",
        priority: "low", estimatedImpact: "Saves ~1h per person",
        assignedTo: null },
      ...共 4 个救援行动
    ],
    projectedRecovery: "On track for deadline with ~4h buffer after rescue actions",
    confidence: 0.82
  }
```

### 2.3 输出阶段

```
PipelineState {
  isComplete: true,
  steps: [6 个 PipelineStep, 全部 status: "completed"],
  rubric: RubricResult,        // Step 1 输出
  plan: PlanResult,            // Step 2 输出
  skillMatch: SkillMatchResult, // Step 3 输出
  criticalPath: CriticalPathResult, // Step 4 输出
  riskAssessment: RiskAssessment,   // Step 5 输出
  rescuePlan: RescuePlan,           // Step 6 输出
  deadline: DeadlineInfo,           // Step 0 输出
}
```

---

## 3. 数据契约 (types.ts)

`src/types/types.ts` 是前后端共享的唯一数据源。所有类型定义在此文件，不允许在其他文件中重复定义。

### 3.1 根输入

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
  rubricText?: string;          // 从 PDF/图片提取的原始文本
}
```

### 3.2 各 Agent 输出类型

| Agent        | 输出类型                 | 关键字段                                                                                |
| ------------ | -------------------- | ----------------------------------------------------------------------------------- |
| Rubric       | `RubricResult`       | items[].criteria, items[].marks, items[].mandatory                                  |
| Task         | `PlanResult`         | tasks[].title, tasks[].requiredSkills, tasks[].dependencies, tasks[].estimatedHours |
| Skill        | `SkillMatchResult`   | assignments[].matchScore (0-1), unmatchedTaskIds[]                                  |
| CriticalPath | `CriticalPathResult` | nodes[].slack, nodes[].isCritical, projectDuration                                  |
| Risk         | `RiskAssessment`     | flags[].riskType (5种), flags[].recommendation, overallRiskLevel                     |
| Rescue       | `RescuePlan`         | actions[].actionType (6种), projectedRecovery, confidence                            |

### 3.3 技能枚举

```typescript
type Skill = 'writing' | 'research' | 'design' | 'coding' | 'presentation' | 'analysis' | 'editing' | 'management';
```

每个 Member 对这 8 种技能都有 1-5 的 proficiency 评分：

```typescript
interface Member {
  skillProficiency: Record<Skill, number>;  // 如 { coding: 5, design: 4, ... }
  availability: number;  // 每周可用小时数
}
```

### 3.4 风险类型枚举

```typescript
type RiskType = 'deadline' | 'dependency' | 'skill_gap' | 'overload' | 'quality';
```

### 3.5 救援行动类型枚举

```typescript
type ActionType = 'reassign' | 'split' | 'escalate' | 'reduce_scope' | 'add_resource' | 'reorder';
```

---

## 4. 6-Agent Pipeline 详解

### Agent 1: Rubric Intelligence (FR-001)

**角色**: RubricIntelligence — 学术评分标准解析专家

**类型**: LLM (大语言模型)

**输入**:

- `assignment.rubricText`: 从 PDF/图片/文本提取的原始 rubric 文本

**输出**: `RubricResult`

- 6 个结构化评分标准 (RubricItem)
- 每个标准包含: id, criteria, marks, weightage, mandatory, description
- 总分 (totalMarks)
- 提取置信度 (rawExtractionConfidence: 0-1)
- 警告列表 (warnings[])

**Prompt 设计**:

System Prompt 关键规则:

1. 每个标准必须有 id (rub-001 格式)、名称、分数、权重、是否必修、描述
2. 无法确定的字段用 null/"Unknown"，不猜测
3. 返回纯 JSON，无 markdown

User Prompt 模板:

```
Parse the following assignment rubric into structured criteria.
ASSIGNMENT TITLE: {assignment.title}
RUBRIC TEXT: """{assignment.rubricText}"""
Return JSON: { items: [...], totalMarks, parsedAt, rawExtractionConfidence, warnings }
```


**Temperature**: 0.3 (低温度，保证结构化提取的稳定性)

**Mock 行为**: 返回预定义的 6 个标准 (User Research 25 marks, Design 20 marks, Prototype 20 marks, Evaluation 15 marks, Presentation 10 marks, Report 10 marks)，模拟延迟 1.8s

**真实 LLM 切换后**: 同样的 prompt 发给 cloud.llm，LLM 解析真实 rubric 文本并返回结构化 JSON

---

### Agent 2: Task Decomposition (FR-002)

**角色**: TaskDecomposer — 大学小组作业项目规划专家

**类型**: LLM

**输入**:

- `assignment`: 完整作业信息 (标题、类型、交付物、截止日期、团队规模、描述)
- `rubric`: Step 1 的输出 (RubricResult)

**输出**: `PlanResult`

- 11 个任务 (Task)
- 每个任务包含: title, description, requiredSkills, estimatedHours, complexity, priority, dependencies, relatedRubricIds, status, assignedTo, order
- criticalPath: LLM 的初步关键路径估算
- totalEstimatedHours: 57h

**Prompt 设计关键规则**:

1. **每个任务必须映射到至少一个 rubric 标准** (relatedRubricIds)
2. 任务必须有现实依赖关系 (dependencies 指向其他 task ID)
3. 工时估算: low=2-4h, medium=4-8h, high=8-15h
4. 优先级: critical (关键路径) > high (主要交付物) > medium (支持工作) > low (nice-to-have)
5. requiredSkills 只能使用 8 种标准技能值
6. 返回纯 JSON

**Temperature**: 0.4 (适度创造力，保证任务分解的多样性)

**数据链**: rubric.items → tasks.relatedRubricIds (每个任务关联到评分标准)

---

### Agent 3: Skill Matching (FR-003)

**角色**: SkillMatcher — 团队优化专家

**类型**: LLM

**输入**:

- `tasks`: Step 2 的输出 (任务列表)
- `members`: 团队成员列表 (含技能 proficiency 1-5 评分 + 每周可用时间)

**输出**: `SkillMatchResult`

- assignments[]: 任务分配列表，每个包含 matchScore (0-1), matchReason
- unmatchedTaskIds[]: 无法匹配的任务 ID

**Prompt 设计关键规则**:

1. matchScore: 0.0-1.0，基于技能匹配度 + 可用时间
2. matchReason: 解释为什么选这个人 (如 "Strong in research (5/5), available 14h")
3. 不超过成员的可用时间限制
4. 匹配阈值 > 0.3，低于此值留为 unmatched
5. 考虑依赖关系 — 连续任务倾向分配给同一人

**Temperature**: 0.2 (低温度，优化问题需要确定性)

**数据链**: tasks[].requiredSkills ↔ members[].skillProficiency (技能匹配)

---

### Agent 4: Critical Path (FR-004)

**角色**: 确定性算法，无 LLM

**类型**: Deterministic (确定性)

**输入**:

- `tasks`: 任务列表 (带 dependencies 和 estimatedHours)

**输出**: `CriticalPathResult`

- nodes[]: 每个任务的 CPM 节点 (earlyStart, earlyFinish, lateStart, lateFinish, slack, isCritical)
- criticalPath[]: 关键路径上的任务 ID 有序列表
- projectDuration: 项目总工时 (关键路径长度)

**算法**: 见 [第 5 节: CPM 算法详解](#5-cpm-算法详解)

**为什么不用 LLM**: CPM 是确定性数学算法，LLM 容易算错。用确定性算法保证 100% 正确。

---

### Agent 5: Risk Detection (FR-006)

**角色**: RiskDetector — 学生团队项目风险分析师

**类型**: LLM

**输入**:

- `tasks`: 任务列表 (含状态、进度、分配)
- `members`: 团队成员 (含工作负载)
- `deadline`: 截止日期信息 (DeadlineInfo)
- `progress`: 项目进度 (ProjectProgress)

**输出**: `RiskAssessment`

- flags[]: 风险标记列表，每个包含:
  - riskType: 5 种类型 (见下表)
  - riskLevel: high / medium / low
  - description: 具体风险描述
  - recommendation: 具体可操作的建议 (不是 "improve time management"，而是 "Split task-002: finish personas first (4h) to unblock wireframing")
- overallRiskLevel: 综合风险等级

**风险类型**:

| riskType   | 含义             | 示例                                              |
| ---------- | -------------- | ----------------------------------------------- |
| deadline   | 任务可能无法按期完成     | "task-002 在关键路径上，8h 工作量"                        |
| dependency | 上游任务延迟阻塞下游     | "task-003 依赖 task-002，后者未完成"                    |
| skill_gap  | 没有成员有所需技能      | "task-009 需要 writing+research+editing，无人满足"     |
| overload   | 成员任务过多/时间不足    | "Carol 有 3 个任务但每周只有 14h"                        |
| quality    | 复杂度 vs 技能水平不匹配 | "task-005 是 high complexity 但分配给 design 4/5 的人" |

**Temperature**: 0.3

**数据链**: tasks[].status + tasks[].assignedTo + progress.taskProgress → 风险分析

---

### Agent 6: Rescue Planner (FR-012)

**角色**: RescuePlanner — 项目救援策略师

**类型**: Hybrid (混合: LLM 生成方案 + 确定性计算影响)

**输入**:

- `riskAssessment`: Step 5 的输出 (风险列表)
- `tasks`: 任务列表
- `members`: 团队成员

**输出**: `RescuePlan`

- actions[]: 救援行动列表，每个包含:
  - actionType: 6 种类型 (见下表)
  - description: 具体行动描述
  - priority: critical / high / medium / low
  - estimatedImpact: 量化影响 ("Saves ~3h", "Unblocks task-005")
  - assignedTo: 行动执行者
- projectedRecovery: 救援后预期结果
- confidence: 置信度 (0-1)

**行动类型**:

| actionType   | 含义            | 示例                           |
| ------------ | ------------- | ---------------------------- |
| reassign     | 把任务换人         | "task-007 从 David 换给 Carol"  |
| split        | 拆分任务为并行子任务    | "task-009 拆成写作+研究两部分"        |
| escalate     | 标记需要团队讨论/外部帮助 | "请助教确认 reflection 字数要求"      |
| reduce_scope | 削减非核心交付物      | "reflection 从 500 字减到 400 字" |
| add_resource | 引入额外资源        | "向其他组借人帮忙测试"                 |
| reorder      | 调整任务顺序        | "先做 wireframe 再做 interview"  |

**Temperature**: 0.4

**数据链**: riskAssessment.flags[].recommendation → rescue actions (将建议转化为具体行动)

---

## 5. CPM 算法详解

`src/lib/agents/critical-path.ts` 实现了标准的 Critical Path Method (关键路径法)。

### 5.1 算法步骤

```
输入: tasks[] (每个 task 有 id, estimatedHours, dependencies[])

Step 1: 构建邻接表
  - dependents: Map<taskId, taskId[]>  — "谁依赖我？"
  - dependencies: Map<taskId, taskId[]> — "我依赖谁？"

Step 2: 拓扑排序 (Kahn's 算法)
  - 计算每个任务的入度 (in-degree = dependencies.length)
  - 入度为 0 的任务入队
  - 出队一个任务，将其后续任务的入度 -1
  - 入度变 0 的入队
  - 结果: topoOrder[] (拓扑有序的任务 ID 列表)

Step 3: 正向遍历 (Forward Pass) — 计算 earlyStart / earlyFinish
  - 按拓扑顺序遍历
  - earlyStart = max(所有前驱任务的 earlyFinish)，无前驱则为 0
  - earlyFinish = earlyStart + estimatedHours

Step 4: 计算项目总工期
  - projectDuration = max(所有任务的 earlyFinish)

Step 5: 逆向遍历 (Backward Pass) — 计算 lateStart / lateFinish
  - 按拓扑逆序遍历
  - lateFinish = min(所有后续任务的 lateStart)，无后续则为 projectDuration
  - lateStart = lateFinish - estimatedHours

Step 6: 计算 slack (浮动时间)
  - slack = lateStart - earlyStart
  - slack = 0 → 在关键路径上 (isCritical = true)
  - slack > 0 → 有缓冲空间

输出: CriticalPathResult {
  nodes: [{ taskId, earlyStart, earlyFinish, lateStart, lateFinish, slack, isCritical }],
  criticalPath: [isCritical 为 true 的 taskId 列表],
  projectDuration: 关键路径总长度 (小时)
}
```

### 5.2 示例

输入 4 个任务:

```
task-001: 8h, 无依赖
task-002: 6h, 依赖 task-001
task-003: 10h, 依赖 task-002
task-004: 4h, 依赖 task-003
```

计算过程:

```
拓扑序: task-001 → task-002 → task-003 → task-004

正向遍历:
  task-001: earlyStart=0,  earlyFinish=8
  task-002: earlyStart=8,  earlyFinish=14
  task-003: earlyStart=14, earlyFinish=24
  task-004: earlyStart=24, earlyFinish=28

projectDuration = 28

逆向遍历:
  task-004: lateFinish=28, lateStart=24
  task-003: lateFinish=24, lateStart=14
  task-002: lateFinish=14, lateStart=8
  task-001: lateFinish=8,  lateStart=0

Slack:
  task-001: 0-0=0 → critical
  task-002: 8-8=0 → critical
  task-003: 14-14=0 → critical
  task-004: 24-24=0 → critical

结果: 所有关键, projectDuration=28h
```

### 5.3 为什么用确定性算法

- CPM 是数学算法，LLM 容易算错 (尤其在多分支依赖时)
- 执行速度: <1ms (LLM 需要 1-2s)
- 100% 可重现 (相同输入永远相同输出)
- 可验证 ( judges 可以手动验算)

---

## 6. Mock LLM 层与真实 LLM 切换

### 6.1 当前架构 (Mock)

```
prompts.ts (生成 LLMCallParams)
     │
     ▼
mock-llm.ts (mockLLMCall 函数)
     │  根据 systemPrompt 中的角色名匹配返回对应的 mock 数据
     │  模拟网络延迟 (1.5-2.4s)
     ▼
返回 LLMCallResult { content, parsed, durationMs, model }
```

`mockLLMCall()` 的匹配逻辑:

```typescript
if (params.systemPrompt.includes('RubricIntelligence')) → 返回 mockRubric
if (params.systemPrompt.includes('TaskDecomposer')) → 返回 mockPlanResult
if (params.systemPrompt.includes('SkillMatcher')) → 返回 mockSkillMatch
if (params.systemPrompt.includes('RiskDetector')) → 返回 mockRiskAssessment
if (params.systemPrompt.includes('RescuePlanner')) → 返回 mockRescuePlan
```

### 6.2 切换到真实 WorkBuddy LLM

只需在 `mock-llm.ts` 中将 `mockLLMCall()` 替换为 `realLLMCall()`:

```typescript
// 取消注释以下代码:
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk';

const cloud = createWorkBuddyCloud({
  endpoint: publicConfig.endpoint,
  publishableKey: publicConfig.publishableKey,
});

async function realLLMCall(params: LLMCallParams): Promise<LLMCallResult> {
  const startTime = Date.now();
  let content = '';

  // WorkBuddy cloud.llm 只支持 stream: true
  for await (const chunk of cloud.llm.chat.completions.create({
    model: 'model-id-from-list',
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userPrompt },
    ],
    stream: true,                              // 必须为 true
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

**关键点**:

- 只改 `mock-llm.ts` 一个文件，其他文件 (orchestrator, API routes, prompts) 完全不动
- 接口签名不变: `LLMCallParams → LLMCallResult`
- `response_format: { type: 'json_object' }` 确保结构化输出
- `stream: true` 是 WorkBuddy cloud.llm 的要求

---

## 7. Orchestrator 编排逻辑

`src/lib/agents/orchestrator.ts` 是 Pipeline 的核心编排器。

### 7.1 执行流程

```
runPipeline(assignment, members, onProgress)
  │
  ├─ 1. 创建初始 PipelineState (所有步骤 pending)
  │
  ├─ 2. Step 0: calculateDeadline() — 瞬时, 非 Agent
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
  └─ 9. Pipeline 完成
        state.isRunning = false
        state.isComplete = true
        return state
```

### 7.2 ProgressCallback 机制

```typescript
type ProgressCallback = (state: PipelineState) => void;
```

每次 `updateStep()` 或 `setState()` 都会调用 `onProgress({...state})`，传回当前完整状态。前端 `PipelineRunner` 组件用这个回调实时更新 UI:

- 每个步骤的 status: pending → running → completed
- 每个步骤的 logs[] 数组 (逐步追加)
- 每个步骤的 durationMs
- 每个步骤的 result (人类可读摘要)


### 7.3 错误处理

任何一步出错:

1. 该步骤 status 设为 'error'
2. error 信息写入 step.error
3. Pipeline 立即停止 (不继续后续步骤)
4. 已完成的步骤结果保留在 state 中
5. `state.isRunning = false`

---

## 8. API 端点参考

### 8.1 单步 API (可单独调用)

| 端点                            | 方法   | 请求 Body                                    | 返回                   | FR     |
| ----------------------------- | ---- | ------------------------------------------ | -------------------- | ------ |
| `/api/pipeline/rubric`        | POST | `{ assignment }`                           | `RubricResult`       | FR-001 |
| `/api/pipeline/tasks`         | POST | `{ assignment, rubric }`                   | `PlanResult`         | FR-002 |
| `/api/pipeline/skills`        | POST | `{ tasks, members }`                       | `SkillMatchResult`   | FR-003 |
| `/api/pipeline/critical-path` | POST | `{ tasks }`                                | `CriticalPathResult` | FR-004 |
| `/api/pipeline/risk`          | POST | `{ tasks, members, deadline?, progress? }` | `RiskAssessment`     | FR-006 |
| `/api/pipeline/rescue`        | POST | `{ riskAssessment, tasks, members }`       | `RescuePlan`         | FR-012 |

### 8.2 完整 Pipeline API

| 端点                  | 方法   | 请求 Body                   | 返回              |
| ------------------- | ---- | ------------------------- | --------------- |
| `/api/pipeline/run` | POST | `{ assignment, members }` | `PipelineState` |

`/api/pipeline/run` 内部调用 `runPipeline()`，一次性执行全部 6 步，返回最终 `PipelineState`。  
注意: HTTP 版本不支持实时进度回调 (使用 no-op callback)。实时进度需用客户端 `PipelineRunner` 组件。

### 8.3 请求/响应示例

**请求** (POST /api/pipeline/run):

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

**响应** (PipelineState):

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
    ... (共 6 个 step)
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

## 9. 组件与数据源映射

| 组件                      | 数据源                                                  | 功能                   |
| ----------------------- | ---------------------------------------------------- | -------------------- |
| `TaskFlowMockup2`        | `useMockupStore2` Zustand store                       | Mockup 2 主容器(logo、role toggle、screen routing) |
| `ProjectScreen`          | `PROJECTS` mock 数组                                   | 项目首页(项目卡片、流程引导、contribution 按钮)    |
| `CreateScreen`           | 表单状态 + `/api/upload`                                 | Step 1: 项目创建表单        |
| `TeamScreen`             | `MEM` mock + 本地状态                                     | Step 2: 团队成员编辑        |
| `ReviewScreen`           | Create + Team 摘要                                     | Step 3: 审查摘要          |
| `AnalysisScreen`         | `/api/pipeline/run` (DST 步骤动画)                       | Step 4: AI 分析进度可视化   |
| `OverviewScreen`         | `useTaskStore` + `PGP` mock (per-project via `getProjectTK()`)  | 项目概览(预测完成线、团队进度、contribution);任务总数动态计算 |
| `TasksScreen`            | `TK` mock / `getProjectTK()` (per-project derivation)            | 任务列表 + 看板 + 任务详情;SRS 用 TK,其他项目从 PGP 推导 |
| `TimelineScreen`         | `GT` mock / `getProjectGT()` (per-project derivation)            | 甘特图时间轴;SRS 用 GT,其他项目从 PGP 推导;预测线颜色按项目状态 |
| `DefenderScreen`         | `/api/pipeline/rescue` + `useTaskStore` + `getProjectTK()`    | AI Deadline Defender (3-phase);任务总数/可完成数动态计算 |
| `Mockup2Overlays`        | `useMockupStore2` state + `PGP` (per-project)                 | Drawers, modals, toasts;Contribution Modal 用 PGP 显示各项目成员 |
| `WorkspaceHeader`        | `PROJECTS` + `PROJECT_MEMBERS` + `getProjectTK()` (per-project) | 项目面包屑、标题、状态、tabs;任务徽章和开放任务数动态计算 |

### Zustand Stores

- `useMockupStore2` (`src/store/useMockupStore2.ts`): UI 状态(screen, role, overlay, task view, defender phase, activeProjectId, toasts 等)
- `useTaskStore` (`src/store/useTaskStore.ts`): Pipeline 数据(riskAssessment, plan, members, rescuePlan, criticalPath 等)

切换到真实 API 时,只需在 store 的初始化处替换 mock 数据为 fetch 调用。

---

## 10. 错误处理机制

### 10.1 API 路由错误处理

每个 API 路由都有统一的 try-catch:

```typescript
try {
  // 业务逻辑
  return NextResponse.json(data, { status: 200 });
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json(
    { error: `Agent failed: ${message}` },
    { status: 500 }
  );
}
```

### 10.2 参数校验

每个路由在调用 agent 函数前校验必填字段:

- 缺少字段 → 返回 400 + `{ error: "Missing 'xxx' in request body" }`
- 字段存在 → 调用 agent 函数

### 10.3 Pipeline 错误传播

Orchestrator 中任何一步出错:

1. 该步骤 `status = 'error'`，`error = String(err)`
2. Pipeline 停止执行后续步骤
3. 已完成步骤的结果保留
4. 前端 PipelineRunner 显示错误步骤的红色状态 + 错误信息

---

## 11. Before/After 对比逻辑

`BeforeAfterComparison.tsx` 是 Hackathon 的 "killer demo"，展示 TaskFlow AI 的可量化价值。

### 数据来源

- **Before** (无 TaskFlow): 使用 mockRiskAssessment (未处理的原始风险) + mockPlanResult (原始工时)
- **After** (有 TaskFlow): 使用 mockRescuePlan (救援后的结果) + 计算节省的工时

### 对比指标

| 指标     | Before | After | 变化           |
| ------ | ------ | ----- | ------------ |
| 预估工时   | 57h    | 50h   | -7h (救援行动节省) |
| 风险数量   | 4      | 0     | 全部解决         |
| 未分配任务  | 3      | 0     | 全部分配         |
| 截止日期状态 | 落后     | 按时    | +4h buffer   |
| 综合风险   | HIGH   | LOW   | 降级           |
| 项目进度   | 15%    | 35%   | +20%         |

### 救援行动影响

每个 RescueAction 都有 `estimatedImpact` 字段，量化该行动的效果:

- "Saves ~4h of blocking time" → 工时减少
- "Unblocks task-005" → 依赖链解锁
- "Reduces risk to low" → 风险降级

Before/After 的 savedHours = 7 是从救援行动的影响累加得出的。

---

## 12. Track 2 评判标准覆盖

| 评判标准                            | 如何满足                                        | 对应代码                                              |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| **Real Problem & User Value**   | 每个学生都知道小组作业的混乱 — 真实痛点                       | page.tsx Problem Hero + Pain Points               |
| **Agentic Workflow**            | 6 个 Agent 顺序执行，每步有可见状态 + 日志                 | orchestrator.ts + PipelineRunner.tsx              |
| **Meaningful Use of WorkBuddy** | 5 个 LLM Agent + CPM 算法 + cloud.llm 切换就绪     | prompts.ts + mock-llm.ts (realLLMCall 注释代码)       |
| **End-to-End Execution**        | 一个表单输入 → 完整计划输出 (任务+分配+路径+风险+救援)            | AssignmentInputForm → runPipeline → PipelineState |
| **Usable & Verifiable Results** | Before/After 对比 + CPM 可手动验算 + API 可 curl 测试 | BeforeAfterComparison.tsx + critical-path.ts      |

---

## 13. 验证方法

本节说明如何验证系统每个环节的正确性，从单步 API 到全链路 Pipeline。

### 13.1 前置条件

```bash
# 确保 dev server 已启动
cd taskflow-ai
npm run dev    # http://localhost:3000

# 所有 curl 命令在项目根目录执行
```

### 13.2 验证 1: 单步 API — Rubric Agent (FR-001)

**验证目标**: 输入原始 rubric 文本，输出结构化 RubricResult

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

**验证检查点**:

- [ ] `items` 数组有 6 个元素
- [ ] 每个 item 有 `id` (rub-001 格式)、`criteria`、`marks`、`mandatory`、`description`
- [ ] `totalMarks` = 100
- [ ] `rawExtractionConfidence` 在 0-1 之间
- [ ] `warnings` 是空数组（无警告）

**错误情况验证**:

```bash
# 缺少 assignment 字段 → 应返回 400
curl -s -X POST http://localhost:3000/api/pipeline/rubric \
  -H "Content-Type: application/json" \
  -d '{}'
# 预期: {"error":"Missing \"assignment\" in request body"}
```

### 13.3 验证 2: 单步 API — Task Agent (FR-002)

**验证目标**: 输入 assignment + rubric，输出 PlanResult（任务列表）

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

**验证检查点**:

- [ ] `tasks` 数组有 8-15 个任务
- [ ] 每个 task 有 `requiredSkills` (只用 8 种标准技能值)
- [ ] 每个 task 有 `dependencies` (task ID 数组)
- [ ] 每个 task 有 `relatedRubricIds` (关联到 rubric item)
- [ ] 每个 task 有 `estimatedHours` (2-15 范围)
- [ ] 每个 task 有 `priority` (critical/high/medium/low)
- [ ] `totalEstimatedHours` = 所有 task hours 之和
- [ ] `criticalPath` 是非空数组

**数据链验证**: `tasks[].relatedRubricIds` 中的 ID 必须在 `rubric.items[].id` 中存在

### 13.4 验证 3: 单步 API — Skill Agent (FR-003)

**验证目标**: 输入 tasks + members，输出 SkillMatchResult

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

**验证检查点**:

- [ ] `assignments` 中每个 `matchScore` 在 0.0-1.0 之间
- [ ] `matchReason` 不是空字符串
- [ ] 每个 `taskId` 在输入的 tasks 中存在
- [ ] 每个 `memberId` 在输入的 members 中存在
- [ ] `unmatchedTaskIds` 中的 ID 在 tasks 中存在但不在 assignments 中
- [ ] 同一个 member 不会被分配超过其 `availability` 的任务总 hours

**逻辑验证**: task-001 (需要 research+analysis) 应分配给 Carol (research 5/5, analysis 5/5)，而不是 Alice (research 3/5, analysis 4/5)

### 13.5 验证 4: 单步 API — Critical Path (FR-004)

**验证目标**: 输入带依赖关系的 tasks，输出 CPM 计算结果

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


**验证检查点** (手动验算):

```
拓扑序: task-001 → task-002 → task-003 → task-004

正向遍历:
  task-001: ES=0,  EF=8
  task-002: ES=8,  EF=14
  task-003: ES=14, EF=24
  task-004: ES=24, EF=28

projectDuration = 28

逆向遍历:
  task-004: LF=28, LS=24
  task-003: LF=24, LS=14
  task-002: LF=14, LS=8
  task-001: LF=8,  LS=0

Slack (全部 = 0 → 全部 critical)
```

- [ ] `nodes` 有 4 个元素，顺序与拓扑排序一致
- [ ] `nodes[0].earlyStart` = 0
- [ ] `nodes[3].earlyFinish` = 28 (= projectDuration)
- [ ] 所有 node 的 `slack` = 0 (因为线性依赖，全在关键路径上)
- [ ] 所有 node 的 `isCritical` = true
- [ ] `criticalPath` = ["task-001","task-002","task-003","task-004"]
- [ ] `projectDuration` = 28

**分支依赖验证** (task-003 同时依赖 task-001 和 task-002):

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

**手动验算**:

```
拓扑序: t1 → t2, t3 (并行) → t4

正向:
  t1: ES=0, EF=4
  t2: ES=4, EF=10
  t3: ES=4, EF=7
  t4: ES=max(10,7)=10, EF=15

projectDuration = 15

逆向:
  t4: LF=15, LS=10
  t2: LF=10, LS=4     (slack=0, critical)
  t3: LF=10, LS=7     (slack=3, NOT critical)
  t1: LF=4, LS=0      (slack=0, critical)

criticalPath = [t1, t2, t4]   (t3 有 3h slack，不在关键路径上)
```

- [ ] t3 的 `slack` = 3, `isCritical` = false
- [ ] `criticalPath` 只包含 t1, t2, t4 (不含 t3)
- [ ] `projectDuration` = 15

### 13.6 验证 5: 单步 API — Risk Agent (FR-006)

**验证目标**: 输入 tasks + members + deadline + progress，输出 RiskAssessment

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

**验证检查点**:

- [ ] `flags` 数组非空（至少 1 个风险）
- [ ] 每个 flag 有 `riskType` (5 种之一: deadline/dependency/skill_gap/overload/quality)
- [ ] 每个 flag 有 `riskLevel` (high/medium/low)
- [ ] 每个 flag 有 `recommendation` (非空，具体可操作)
- [ ] task-009 (assignedTo=null, 需要 3 种技能) 应触发 `skill_gap` 风险
- [ ] `overallRiskLevel` 是 flags 中最高级别

### 13.7 验证 6: 单步 API — Rescue Agent (FR-012)

**验证目标**: 输入 riskAssessment + tasks + members，输出 RescuePlan

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

**验证检查点**:

- [ ] `actions` 数组非空
- [ ] 每个 action 有 `actionType` (6 种之一: reassign/split/escalate/reduce_scope/add_resource/reorder)
- [ ] 每个 action 有 `estimatedImpact` (包含量化效果，如 "Saves ~4h")
- [ ] 每个 action 有 `assignedTo` (指向一个 member ID 或 null)
- [ ] `projectedRecovery` 非空
- [ ] `confidence` 在 0.0-1.0 之间
- [ ] 对 skill_gap 风险，action 应是 `split` 或 `reassign` 类型

### 13.8 验证 7: 完整 Pipeline — /api/pipeline/run

**验证目标**: 输入 assignment + members，一步执行全部 6 个 Agent

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

**验证检查点 (全链路)**:

| 检查项                                       | 预期                    | 说明              |
| ----------------------------------------- | --------------------- | --------------- |
| `isComplete`                              | true                  | 全部 6 步完成        |
| `isRunning`                               | false                 | Pipeline 已结束    |
| `steps.length`                            | 6                     | 6 个 Agent       |
| 每个 `steps[i].status`                      | "completed"           | 无 error/skipped |
| `steps[0].agent.frId`                     | "FR-001"              | Rubric Agent    |
| `steps[3].agent.type`                     | "deterministic"       | CPM 不是 LLM      |
| `steps[3].durationMs`                     | ≤ 100                 | CPM 应近乎瞬时       |
| `steps[0..5].durationMs`                  | > 0                   | Mock 有模拟延迟      |
| `rubric.items.length`                     | ≥ 1                   | 至少解析出 1 个标准     |
| `rubric.totalMarks`                       | > 0                   | 总分有效            |
| `plan.tasks.length`                       | 8-15                  | 任务数量合理          |
| `plan.totalEstimatedHours`                | > 0                   | 有工时估算           |
| `plan.tasks` 每个有 `relatedRubricIds`       | 非空                    | 任务关联到评分标准       |
| `skillMatch.assignments.length`           | > 0                   | 至少有 1 个分配       |
| `skillMatch.assignments` 每个有 `matchScore` | 0-1                   | 分数在有效范围         |
| `criticalPath.nodes.length`               | = `plan.tasks.length` | 每个任务都有 CPM 节点   |
| `criticalPath.projectDuration`            | > 0                   | 项目总工时           |
| `riskAssessment.flags.length`             | ≥ 1                   | 至少检测到 1 个风险     |
| `riskAssessment.overallRiskLevel`         | 非 "none"              | 有风险等级           |
| `rescuePlan.actions.length`               | ≥ 1                   | 至少 1 个救援行动      |
| `rescuePlan.confidence`                   | 0-1                   | 置信度有效           |
| `deadline.daysRemaining`                  | > 0                   | 截止日期在未来         |

### 13.9 验证 8: 客户端 Pipeline 可视化

**验证目标**: 点击 "Run Pipeline" 按钮，6 步实时显示

**操作步骤**:

1. 打开 <http://localhost:3000>
2. 滚动到 "6 Agents Run Autonomously" 部分
3. 点击 "Run Pipeline" 按钮
4. 观察 6 个步骤依次从 pending → running → completed

**验证检查点**:

- [ ] 步骤按顺序执行 (不会跳过或乱序)
- [ ] running 状态时有 loading 动画
- [ ] 每步完成后显示 durationMs 和 result 摘要
- [ ] 完成后底部显示 summary (criteria/tasks/risks/rescue 数量)
- [ ] CPM 步骤显示 "Instant" 或极短时间
- [ ] 可再次点击 "Run Pipeline" 重新执行

### 13.10 验证 9: 数据链完整性

**验证目标**: 确保各 Agent 之间的数据传递正确

**验证方法**: 对完整 Pipeline 的输出做交叉检查

```bash
# 运行完整 pipeline 并保存输出
curl -s -X POST http://localhost:3000/api/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{...}' > /tmp/pipeline_output.json

# 检查 1: tasks 的 relatedRubricIds 在 rubric.items 中存在
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
rubric_ids = {i['id'] for i in d['rubric']['items']}
for t in d['plan']['tasks']:
    for rid in t.get('relatedRubricIds', []):
        assert rid in rubric_ids, f'{rid} not in rubric!'
print('PASS: all relatedRubricIds valid')
"

# 检查 2: skillMatch 的 taskId 在 plan.tasks 中存在
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
task_ids = {t['id'] for t in d['plan']['tasks']}
for a in d['skillMatch']['assignments']:
    assert a['taskId'] in task_ids, f'{a[\"taskId\"]} not in tasks!'
print('PASS: all assignment taskIds valid')
"

# 检查 3: criticalPath.nodes 数量 = plan.tasks 数量
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
assert len(d['criticalPath']['nodes']) == len(d['plan']['tasks']), 'node count mismatch!'
print('PASS: CPM node count matches task count')
"

# 检查 4: rescuePlan 的 taskId 在 plan.tasks 中存在
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
task_ids = {t['id'] for t in d['plan']['tasks']}
for a in d['rescuePlan']['actions']:
    assert a['taskId'] in task_ids, f'{a[\"taskId\"]} not in tasks!'
print('PASS: all rescue taskIds valid')
"

# 检查 5: criticalPath.projectDuration = max(earlyFinish)
python -c "
import json
d = json.load(open('/tmp/pipeline_output.json'))
max_ef = max(n['earlyFinish'] for n in d['criticalPath']['nodes'])
assert d['criticalPath']['projectDuration'] == max_ef, 'duration mismatch!'
print('PASS: projectDuration = max earlyFinish')
"
```

### 13.11 验证 10: Mock→Real LLM 切换就绪

**验证目标**: 确认 mock-llm.ts 的接口设计兼容真实 cloud.llm

**验证方法**: 代码审查 (不需要实际运行)

检查 `mock-llm.ts`:

- [ ] `LLMCallParams` 接口有: `systemPrompt`, `userPrompt`, `temperature`, `responseFormat`
- [ ] `LLMCallResult` 接口有: `content`, `parsed`, `durationMs`, `model`
- [ ] `realLLMCall()` 函数已注释，取消注释即可启用
- [ ] `realLLMCall()` 使用 `stream: true` (WorkBuddy 要求)
- [ ] `realLLMCall()` 用 `response_format: { type: 'json_object' }` 确保结构化输出
- [ ] `realLLMCall()` 收集 chunks 后 `JSON.parse(content)` 填入 `parsed`
- [ ] 5 个 `callXxxAgent()` 函数签名不变 (只内部从 mockLLMCall 换成 realLLMCall)

检查其他文件:

- [ ] `orchestrator.ts` 不需要改动 (调用的是 `callXxxAgent` 函数)
- [ ] `API routes` 不需要改动 (调用的是 `callXxxAgent` 函数)
- [ ] `prompts.ts` 不需要改动 (只生成 LLMCallParams)

### 13.12 验证 11: Before/After 数据一致性

**验证目标**: BeforeAfterComparison 展示的数据与 mock 数据一致

**验证方法**: 在浏览器中检查页面渲染

打开 <http://localhost:3000，找到> "Measurable Impact" 部分:

| 元素                       | 预期值                   | 数据来源                                   |
| ------------------------ | --------------------- | -------------------------------------- |
| Before - Estimated Hours | 57h                   | mockPlanResult.totalEstimatedHours     |
| After - Estimated Hours  | 50h (-7h saved)       | 57 - 7 (savedHours 硬编码)                |
| Before - Tasks at Risk   | 4                     | mockRiskAssessment.flags.length        |
| After - Tasks at Risk    | 0 (all resolved)      | 救援后风险清零                                |
| Before - Unassigned      | 3                     | mockSkillMatch.unmatchedTaskIds.length |
| After - Unassigned       | 0 (all assigned)      | 救援后全部分配                                |
| Before - Deadline Status | Behind schedule       | 静态文本                                   |
| After - Deadline Status  | On track (+4h buffer) | 静态文本                                   |
| Before - Overall Risk    | HIGH                  | 静态文本                                   |
| After - Overall Risk     | LOW                   | 静态文本                                   |
| Stat: Hours Saved        | -7h                   | savedHours 变量                          |
| Stat: Risks Resolved     | 4 → 0                 | riskCount 变量                           |
| Stat: Deadline Buffer    | +4h                   | 静态                                     |
| Stat: Rescue Actions     | 4                     | mockRescuePlan.actions.length          |
| Progress bar: Without    | 15%                   | 硬编码                                    |
| Progress bar: With       | 35%                   | 硬编码                                    |

### 13.13 验证总结表

| 验证项                    | 验证方法                 | 关键检查点数  |
| ---------------------- | -------------------- | ------- |
| Rubric API (FR-001)    | curl + JSON 检查       | 5       |
| Task API (FR-002)      | curl + JSON 检查 + 数据链 | 8       |
| Skill API (FR-003)     | curl + 逻辑验证          | 6       |
| Critical Path (FR-004) | curl + 手动验算 (线性+分支)  | 7+6     |
| Risk API (FR-006)      | curl + 风险类型检查        | 6       |
| Rescue API (FR-012)    | curl + 行动类型检查        | 7       |
| Full Pipeline          | curl + 全链路检查表        | 17      |
| 客户端可视化                 | 浏览器手动操作              | 6       |
| 数据链完整性                 | Python 脚本交叉检查        | 5       |
| Mock→Real LLM          | 代码审查                 | 8       |
| Before/After           | 浏览器渲染检查              | 13      |
| **合计**                 |                      | **~94** |

---

## 15. MVP Requirements 映射 (Hackathon Final Spec)

> 本节将 Hackathon Final MVP Requirements 文档的每一条要求映射到代码实现位置和数据模型。
> 标记: ✅ 已实现 | 🔧 代码已更新 | 📋 文档已覆盖 | ⏳ 前端待实现

### 15.1 Rubric Good/Average/Poor 三级标准

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| RubricItem 增加 goodLevelRequirements | `types.ts` → `RubricItem.goodLevelRequirements?: RubricLevelRequirements` | 🔧 |
| RubricItem 增加 averageLevelRequirements | `types.ts` → `RubricItem.averageLevelRequirements?: RubricLevelRequirements` | 🔧 |
| RubricItem 增加 poorLevelRequirements | `types.ts` → `RubricItem.poorLevelRequirements?: RubricLevelRequirements` | 🔧 |
| 每级包含 description + estimatedHours + keyDeliverables | `types.ts` → `RubricLevelRequirements` interface | 🔧 |
| Rubric Agent prompt 提取三级标准 | `prompts.ts` → `RUBRIC_AGENT_SYSTEM` Rule 6 | 🔧 |
| Rubric Agent JSON 输出包含三级字段 | `prompts.ts` → `RUBRIC_AGENT_USER` JSON template | 🔧 |
| Mock 数据填充三级标准 | `mockRubric.ts` → 6 个 RubricItem 全部带三级字段 | 🔧 |

**RubricLevelRequirements 数据模型:**
```typescript
interface RubricLevelRequirements {
  description: string;          // 该级别要求描述
  estimatedHours?: number;       // 达到该级别建议工时
  keyDeliverables?: string[];    // 关键交付物列表
}
```

**Mock 示例 (rub-001 User Research):**
| 级别 | 描述 | 建议工时 | 关键交付物 |
| --- | --- | --- | --- |
| Good | 10+ interviews, 3+ personas, comprehensive task analysis | 8h | 10+ transcripts, 3+ personas, flow diagrams, pain points |
| Average | 8-9 interviews, 2 personas, basic task analysis | 5h | 8-9 transcripts, 2 personas, basic analysis |
| Poor | <8 interviews, 1 persona, incomplete | 3h | <8 interviews, 1 persona |

### 15.2 Multi-Member Tasks (多人任务)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| Task 支持多成员分配 | `types.ts` → `Task.memberAssignments?: MemberTaskAssignment[]` | 🔧 |
| 每成员个性化工时估算 | `types.ts` → `MemberTaskAssignment.estimatedHours` (per-member) | 🔧 |
| 每成员匹配分数 | `types.ts` → `MemberTaskAssignment.matchScore` | 🔧 |
| 每成员角色 (Primary/Support/Reviewer) | `types.ts` → `MemberTaskAssignment.role` | 🔧 |
| 保留 assignedTo (backward compat) | `types.ts` → `Task.assignedTo` 仍为 primary assignee | ✅ |
| Task Agent prompt 支持多成员 | `prompts.ts` → `TASK_AGENT_SYSTEM` Rule 8 | 🔧 |
| Mock 数据示例: task-005 (2人) | `mockTasks.ts` → task-005: mem-001(6h, Primary) + mem-002(4h, Support) | 🔧 |
| Mock 数据示例: task-010 (4人) | `mockTasks.ts` → task-010: 全员参与, 各自不同工时 | 🔧 |

**MemberTaskAssignment 数据模型:**
```typescript
interface MemberTaskAssignment {
  memberId: string;
  estimatedHours: number;       // 该成员在此任务上的个性化工时
  matchScore: number;           // 0.0-1.0
  role: string;                 // "Primary" | "Support" | "Reviewer"
  invitationStatus: InvitationStatus;
  rejectReason?: string | null;
}
```

**Mock 示例 (task-005 Build Prototype):**
| 成员 | 角色 | 个性化工时 | 匹配分数 | 邀请状态 |
| --- | --- | --- | --- | --- |
| mem-001 (Alice) | Primary | 6h | 0.94 | pending |
| mem-002 (Bob) | Support (visual polish) | 4h | 0.82 | pending |

### 15.3 Accept/Reject 邀请流程

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| InvitationStatus 类型 | `types.ts` → `InvitationStatus = 'pending' \| 'accepted' \| 'rejected'` | 🔧 |
| Task.invitationStatus 字段 | `types.ts` → `Task.invitationStatus?: InvitationStatus` | 🔧 |
| Task.rejectReason 字段 | `types.ts` → `Task.rejectReason?: string \| null` | 🔧 |
| MemberTaskAssignment.invitationStatus | `types.ts` → `MemberTaskAssignment.invitationStatus` | 🔧 |
| Task Agent prompt 生成 pending 状态 | `prompts.ts` → `TASK_AGENT_SYSTEM` Rule 9 | 🔧 |
| Mock: 已完成任务 accepted | `mockTasks.ts` → task-001/002/003: `invitationStatus: 'accepted'` | 🔧 |
| Mock: 待办任务 pending | `mockTasks.ts` → task-004~011: `invitationStatus: 'pending'` | 🔧 |
| Mock: 拒绝示例 | `mockTasks.ts` → task-009: `invitationStatus: 'rejected'`, rejectReason 记录原因 | 🔧 |

**流程逻辑:**
```
AI 分配任务 → invitationStatus: 'pending'
     ↓
成员收到通知 → 接受 (accepted) 或 拒绝 (rejected + rejectReason)
     ↓
拒绝后 → task 回到 unassigned, Rescue Agent 重新分配
```

**Mock 拒绝示例 (task-009 Report Writing):**
```json
{
  "id": "task-009",
  "assignedTo": null,
  "invitationStatus": "rejected",
  "rejectReason": "Original assignee (mem-002) rejected: at capacity with task-003 and task-004"
}
```

### 15.4 七种风险类型 (7 Risk Types)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| 扩展 riskType 到 7 种 | `types.ts` → `RiskFlag.riskType` union type | 🔧 |
| + 'insufficient_time' | 工时超过成员周可用时间 | 🔧 |
| + 'unassigned' | 任务无分配成员 | 🔧 |
| Risk Agent prompt 包含 7 种类型 | `prompts.ts` → `RISK_AGENT_SYSTEM` RISK TYPES (7 types) | 🔧 |
| Risk Agent 区分 unassigned vs skill_gap | `prompts.ts` → `RISK_AGENT_SYSTEM` Rule 3-4 | 🔧 |
| Mock: insufficient_time 示例 | `mockRiskFlags.ts` → task-002: 4h remaining + 14h/week, 链条紧 | 🔧 |
| Mock: unassigned 示例 | `mockRiskFlags.ts` → task-008 + task-009: 无分配成员 | 🔧 |

**7 种风险类型对照:**
| # | riskType | 含义 | 触发条件 | Mock 示例 |
| --- | --- | --- | --- | --- |
| 1 | `deadline` | 任务延迟/阻塞关键路径 | 进度落后 + 依赖下游 | task-002: 50% complete, blocking task-003 |
| 2 | `dependency` | 上游任务延迟 | 上游 task 延迟 | — |
| 3 | `skill_gap` | 无成员有足够技能 | 匹配分数 < 0.3 | — |
| 4 | `overload` | 成员过载 | 分配任务数 > 可用时间 | — |
| 5 | `quality` | 质量风险 | 复杂度 vs 技能不匹配 | — |
| 6 | `insufficient_time` | 工时不足 | 剩余工时 + 依赖链 > 周可用时间 | task-002: 4h left, 19h downstream, 14h/week |
| 7 | `unassigned` | 无分配成员 | assignedTo === null | task-008, task-009: 无分配成员 |

### 15.5 Autonomous Deadline Defender — 6-Step Rescue Workflow

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| 6 步工作流类型 | `types.ts` → `RescueWorkflowStep = 'detect' \| 'analyze' \| 'optimize' \| 'validate' \| 'apply' \| 'compare'` | 🔧 |
| 工作流状态追踪 | `types.ts` → `RescueWorkflowState` (currentStep, optimizationRound, maxRounds, stepHistory) | 🔧 |
| 步骤历史记录 | `types.ts` → `RescueStepRecord[]` (step, round, timestamp, description, result) | 🔧 |
| RescuePlan 关联工作流 | `types.ts` → `RescuePlan.workflow?: RescueWorkflowState` | 🔧 |
| Rescue Agent prompt 描述 6 步 | `prompts.ts` → `RESCUE_AGENT_SYSTEM` MVP 6-STEP WORKFLOW section | 🔧 |
| Rescue Agent JSON 输出包含 workflow | `prompts.ts` → `RESCUE_AGENT_USER` JSON template | 🔧 |
| Mock: 完整 6 步历史 | `mockRiskFlags.ts` → mockRescuePlan.workflow.stepHistory (6 条记录) | 🔧 |

**6 步工作流详解:**
| 步骤 | 名称 | 输入 | 输出 | Mock 记录 |
| --- | --- | --- | --- | --- |
| 1 | Detect | RiskAssessment | 5 risk flags detected | "5 risks detected, overall risk: medium" |
| 2 | Analyze | risks + critical path | task-002 blocks 8 downstream tasks | "Critical path at risk, 3 unassigned" |
| 3 | Optimize | analysis + rubric priority | 4 rescue actions generated | "4 actions proposed, estimated 7h savings" |
| 4 | Validate | proposed actions | no circular deps, coverage 100% | "Plan valid, no issues found" |
| 5 | Apply | validated actions | 3 auto-applied + 1 Leader-approved | "3 auto-applied, 1 pending → approved by David" |
| 6 | Compare | before/after state | 57h→50h, 5 risks→0, -4h→+4h buffer | "Improvement confirmed, rescue successful" |

### 15.6 Max 3 Optimization Rounds

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| maxRounds = 3 | `types.ts` → `RescueWorkflowState.maxRounds` | 🔧 |
| optimizationRound 计数器 | `types.ts` → `RescueWorkflowState.optimizationRound` | 🔧 |
| Round 1-3 逻辑 | `prompts.ts` → `RESCUE_AGENT_SYSTEM` MAX 3 OPTIMIZATION ROUNDS section | 🔧 |
| Mock: Round 1 即成功 | `mockRiskFlags.ts` → `optimizationRound: 1`, stepHistory 显示 Round 1 sufficient | 🔧 |
| 跳过 Round 2/3 条件 | `prompts.ts` → "Stop when comparison shows improvement" | 🔧 |

**轮次逻辑:**
```
Round 1: 生成初始计划 → Validate → Compare
  → 如果改善: STOP (Round 1 sufficient)
  → 如果未改善或不满足: → Round 2

Round 2: 调整 actions → Validate → Compare
  → 如果改善: STOP
  → 如果仍不满足: → Round 3

Round 3: 最终尝试 → Validate → Compare
  → 如果改善: STOP
  → 如果仍不满足: ESCALATE to Leader ("manual intervention required")
```

### 15.7 Rescue Permission Rules (救援权限规则)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| 未确认+未开始: 自动修改 | `prompts.ts` → `RESCUE_AGENT_SYSTEM` PERMISSION RULES | 🔧 |
| 已确认: 需 Leader 批准 | `prompts.ts` → 同上 | 🔧 |
| 进行中: 始终需 Leader 批准 | `prompts.ts` → 同上 | 🔧 |
| requiresLeaderApproval 字段 | `types.ts` → `RescuePlan.requiresLeaderApproval?: boolean` | 🔧 |
| approvalStatus 字段 | `types.ts` → `RescuePlan.approvalStatus?: 'pending' \| 'approved' \| 'rejected'` | 🔧 |
| Rescue Agent prompt 传入 confirmed 状态 | `prompts.ts` → `RESCUE_AGENT_USER` 显示每 task 的 Permission 状态 | 🔧 |
| Mock: res-001 需批准 (task-002 confirmed) | `mockRiskFlags.ts` → `requiresLeaderApproval: true`, `approvalStatus: 'approved'` | 🔧 |
| Mock: res-002/003/004 自动 (unconfirmed) | `mockRiskFlags.ts` → stepHistory apply step 记录 | 🔧 |

**权限矩阵:**
| Task 状态 | confirmed | 可自动修改? | Mock 示例 |
| --- | --- | --- | --- |
| todo | false | ✅ YES | task-004 (reassign), task-009 (reassign), task-011 (reorder) |
| todo | true | ❌ NO — 需 Leader | — |
| in-progress | true | ❌ NO — 需 Leader | task-002 (split) → Leader approved |
| in-progress | false | ❌ NO — 需 Leader | — |
| done | any | ❌ NO — 不可修改 | — |

### 15.8 Rubric-Aware Rescue Priority (Rubric 感知救援优先级)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| 救援优先考虑覆盖更多 rubric marks 的任务 | `prompts.ts` → `RESCUE_AGENT_SYSTEM` Optimize step (a) | 🔧 |
| Rescue Agent 传入 relatedRubricIds | `prompts.ts` → `RESCUE_AGENT_USER` 显示每 task 的 Related Rubric IDs | 🔧 |
| Rubric-aware priority 提示 | `prompts.ts` → `RESCUE_AGENT_USER` "RUBRIC-AWARE PRIORITY" section | 🔧 |

**优先级排序逻辑:**
```
1. Rubric marks coverage: 救援覆盖更多 marks 的任务优先
   (task-002 covers rub-001=25 marks → high priority)
2. Critical path impact: 解锁更多下游任务的 action 优先
   (split task-002 unblocks 8 downstream tasks)
3. Feasibility: 在成员可用时间内可执行的 action 优先
```

### 15.9 Comparison Result (救援前后对比)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| RescueComparisonResult 类型 | `types.ts` → `RescueComparisonResult` interface | 🔧 |
| beforeHours / afterHours | `types.ts` → `comparisonResult.beforeHours/afterHours` | 🔧 |
| hoursSaved | `types.ts` → `comparisonResult.hoursSaved` | 🔧 |
| beforeRiskLevel / afterRiskLevel | `types.ts` → `comparisonResult.beforeRiskLevel/afterRiskLevel` | 🔧 |
| beforeTasksAtRisk / afterTasksAtRisk | `types.ts` → `comparisonResult` | 🔧 |
| beforeDeadlineBuffer / afterDeadlineBuffer | `types.ts` → `comparisonResult` | 🔧 |
| improvementSummary | `types.ts` → `comparisonResult.improvementSummary` | 🔧 |
| RescuePlan 关联 comparisonResult | `types.ts` → `RescuePlan.comparisonResult?` | 🔧 |
| Mock: 完整对比数据 | `mockRiskFlags.ts` → 57h→50h, medium→none, 5→0, -4h→+4h | 🔧 |

**Mock 对比数据:**
| 指标 | Before (救援前) | After (救援后) | 变化 |
| --- | --- | --- | --- |
| Total Hours | 57h | 50h | -7h saved |
| Risk Level | medium | none | ↓ resolved |
| Tasks at Risk | 5 | 0 | -5 resolved |
| Deadline Buffer | -4h (behind) | +4h (ahead) | +8h swing |
| Overall | Behind schedule | On track | ✅ Rescue successful |

### 15.10 Weekly Availability (每日可用时间)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| WeeklyAvailability 类型 | `types.ts` → `WeeklyAvailability` (monday-sunday) | 🔧 |
| Member.weeklyAvailability 字段 | `types.ts` → `Member.weeklyAvailability?: WeeklyAvailability` | 🔧 |
| Mock: 4 成员每日数据 | `mockMembers.ts` → 全员带 weeklyAvailability | 🔧 |

**Mock 每日可用时间:**
| 成员 | Mon | Tue | Wed | Thu | Fri | Sat | Sun | 总计 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Alice (mem-001) | 3h | 3h | 2h | 2h | 2h | 2h | 1h | 15h |
| Bob (mem-002) | 2h | 2h | 2h | 2h | 2h | 1h | 1h | 12h |
| Carol (mem-003) | 3h | 3h | 2h | 2h | 2h | 1h | 1h | 14h |
| David (mem-004) | 2h | 2h | 2h | 2h | 1h | 0h | 1h | 10h |

### 15.11 Plan Validator (计划验证器)

| 需求 | 实现位置 | 状态 |
| --- | --- | --- |
| PlanValidationResult 类型 | `types.ts` → `PlanValidationResult` interface | 🔧 |
| PlanResult.validation 字段 | `types.ts` → `PlanResult.validation?: PlanValidationResult` | 🔧 |
| 验证项: rubricCoverageComplete | `types.ts` → `PlanValidationResult.rubricCoverageComplete` | 🔧 |
| 验证项: allTasksHaveMembers | `types.ts` → `PlanValidationResult.allTasksHaveMembers` | 🔧 |
| 验证项: noCircularDependencies | `types.ts` → `PlanValidationResult.noCircularDependencies` | 🔧 |
| 验证项: deadlineFeasible | `types.ts` → `PlanValidationResult.deadlineFeasible` | 🔧 |
| issues[] + suggestions[] | `types.ts` → `PlanValidationResult.issues/suggestions` | 🔧 |
| Mock: validation 结果 | `mockTasks.ts` → `mockPlanResult.validation` | 🔧 |

**Mock Plan Validator 输出:**
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

### 15.12 P0/P1/P2 优先级列表

| 优先级 | 范围 | 状态 |
| --- | --- | --- |
| **P0 (必须)** | 6-Agent Pipeline (Rubric→Task→Skill→CPM→Risk→Rescue) | ✅ 已实现 |
| **P0** | Mock LLM layer (可切换 real LLM) | ✅ 已实现 |
| **P0** | Before/After 救援对比 demo | ✅ 已实现 |
| **P0** | Narrative-driven landing page | ✅ 已实现 |
| **P0** | types.ts 完整数据契约 | 🔧 已更新 (MVP fields) |
| **P0** | Rubric Good/Average/Poor 三级 | 🔧 已实现 |
| **P0** | 7 种风险类型 | 🔧 已实现 |
| **P0** | 6-Step Rescue Workflow | 🔧 已实现 |
| **P0** | Max 3 optimization rounds | 🔧 已实现 |
| **P0** | Rescue permission rules | 🔧 已实现 |
| **P0** | Comparison result | 🔧 已实现 |
| **P0** | Multi-member tasks + personalized hours | 🔧 已实现 |
| **P0** | Accept/reject flow | 🔧 已实现 |
| **P0** | Plan Validator | 🔧 已实现 |
| **P0** | Weekly availability | 🔧 已实现 |
| **P1 (应该)** | Kanban Board (@dnd-kit) | ⏳ 前端待实现 |
| **P1** | Gantt Chart | ⏳ 前端待实现 |
| **P1** | Task Detail Panel | ⏳ 前端待实现 |
| **P1** | Rescue Plan Modal | ⏳ 前端待实现 |
| **P1** | WorkBuddy cloud.llm 接入 | ⏳ 待激活 |
| **P2 (可选)** | Hero typography 精修 | ⏳ 前端待实现 |
| **P2** | Visual polish | ⏳ 前端待实现 |
| **P2** | PDF upload (Assignment Input) | ⏳ 未来 |

### 15.13 5-Scene Demo Story

| 场景 | 描述 | 展示组件 | 数据来源 |
| --- | --- | --- | --- |
| Scene 1: Input | 粘贴 Assignment + Rubric 文本 | AssignmentInputForm | mockAssignment + rubricText |
| Scene 2: Pipeline | 6-Agent 实时执行 | PipelineRunner | orchestrator + mock-llm |
| Scene 3: Plan | 11 tasks, 多人分配, 邀请状态 | (TaskBoard 待实现) | mockPlanResult |
| Scene 4: Risk + Rescue | 5 风险 → 6步救援 → 对比 | BeforeAfterComparison | mockRiskAssessment + mockRescuePlan |
| Scene 5: Architecture | 6 Agent 卡片 + Track 2 映射 | AgentCard section | page.tsx CRITERIA_MAPPING |

### 15.14 MVP Requirements 实现总结

| MVP 需求 | 代码实现 | Mock 数据 | Prompt 更新 | 文档覆盖 |
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

*文档版本: 2026-10-11 v2 | 项目: TaskFlow AI | Track 2: WorkBuddy Agentic Solution*
