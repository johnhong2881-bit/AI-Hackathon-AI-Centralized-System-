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

| Agent | 输出类型 | 关键字段 |
|-------|---------|---------|
| Rubric | `RubricResult` | items[].criteria, items[].marks, items[].mandatory |
| Task | `PlanResult` | tasks[].title, tasks[].requiredSkills, tasks[].dependencies, tasks[].estimatedHours |
| Skill | `SkillMatchResult` | assignments[].matchScore (0-1), unmatchedTaskIds[] |
| CriticalPath | `CriticalPathResult` | nodes[].slack, nodes[].isCritical, projectDuration |
| Risk | `RiskAssessment` | flags[].riskType (5种), flags[].recommendation, overallRiskLevel |
| Rescue | `RescuePlan` | actions[].actionType (6种), projectedRecovery, confidence |

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

| riskType | 含义 | 示例 |
|----------|------|------|
| deadline | 任务可能无法按期完成 | "task-002 在关键路径上，8h 工作量" |
| dependency | 上游任务延迟阻塞下游 | "task-003 依赖 task-002，后者未完成" |
| skill_gap | 没有成员有所需技能 | "task-009 需要 writing+research+editing，无人满足" |
| overload | 成员任务过多/时间不足 | "Carol 有 3 个任务但每周只有 14h" |
| quality | 复杂度 vs 技能水平不匹配 | "task-005 是 high complexity 但分配给 design 4/5 的人" |

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

| actionType | 含义 | 示例 |
|------------|------|------|
| reassign | 把任务换人 | "task-007 从 David 换给 Carol" |
| split | 拆分任务为并行子任务 | "task-009 拆成写作+研究两部分" |
| escalate | 标记需要团队讨论/外部帮助 | "请助教确认 reflection 字数要求" |
| reduce_scope | 削减非核心交付物 | "reflection 从 500 字减到 400 字" |
| add_resource | 引入额外资源 | "向其他组借人帮忙测试" |
| reorder | 调整任务顺序 | "先做 wireframe 再做 interview" |

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

| 端点 | 方法 | 请求 Body | 返回 | FR |
|------|------|----------|------|-----|
| `/api/pipeline/rubric` | POST | `{ assignment }` | `RubricResult` | FR-001 |
| `/api/pipeline/tasks` | POST | `{ assignment, rubric }` | `PlanResult` | FR-002 |
| `/api/pipeline/skills` | POST | `{ tasks, members }` | `SkillMatchResult` | FR-003 |
| `/api/pipeline/critical-path` | POST | `{ tasks }` | `CriticalPathResult` | FR-004 |
| `/api/pipeline/risk` | POST | `{ tasks, members, deadline?, progress? }` | `RiskAssessment` | FR-006 |
| `/api/pipeline/rescue` | POST | `{ riskAssessment, tasks, members }` | `RescuePlan` | FR-012 |

### 8.2 完整 Pipeline API

| 端点 | 方法 | 请求 Body | 返回 |
|------|------|----------|------|
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

| 组件 | 数据源 | 功能 |
|------|--------|------|
| `AssignmentInputForm` | 用户输入 → POST /api/pipeline/run | "One Prompt" 入口表单 |
| `PipelineRunner` | `runPipeline()` 客户端调用 | 6-Agent 步骤可视化 (实时进度) |
| `BeforeAfterComparison` | mockRiskAssessment + mockRescuePlan + mockPlanResult | Before/After 救援对比 |
| `Dashboard` | Zustand store (mockFullPipeline) | 项目概览 (进度、风险、截止日期) |
| `MemberCard` | mockMembers | 团队成员卡片 (技能条) |
| `CountdownTimer` | mockDeadline | 实时倒计时 |
| `KanbanBoard` | (待实现) | 看板拖拽 (@dnd-kit) |
| `GanttChart` | (待实现) | 甘特图时间轴 |
| `TaskDetailPanel` | (待实现) | 任务详情侧栏 |
| `RescuePlanModal` | (待实现) | 救援方案弹窗 |

### Zustand Store

`src/store/useTaskStore.ts` 预加载所有 mock 数据，组件通过 `useTaskStore()` 读取。切换到真实 API 时，只需在 store 的初始化处替换 mock 数据为 fetch 调用。

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

| 指标 | Before | After | 变化 |
|------|--------|-------|------|
| 预估工时 | 57h | 50h | -7h (救援行动节省) |
| 风险数量 | 4 | 0 | 全部解决 |
| 未分配任务 | 3 | 0 | 全部分配 |
| 截止日期状态 | 落后 | 按时 | +4h buffer |
| 综合风险 | HIGH | LOW | 降级 |
| 项目进度 | 15% | 35% | +20% |

### 救援行动影响

每个 RescueAction 都有 `estimatedImpact` 字段，量化该行动的效果:
- "Saves ~4h of blocking time" → 工时减少
- "Unblocks task-005" → 依赖链解锁
- "Reduces risk to low" → 风险降级

Before/After 的 savedHours = 7 是从救援行动的影响累加得出的。

---

## 12. Track 2 评判标准覆盖

| 评判标准 | 如何满足 | 对应代码 |
|----------|---------|---------|
| **Real Problem & User Value** | 每个学生都知道小组作业的混乱 — 真实痛点 | page.tsx Problem Hero + Pain Points |
| **Agentic Workflow** | 6 个 Agent 顺序执行，每步有可见状态 + 日志 | orchestrator.ts + PipelineRunner.tsx |
| **Meaningful Use of WorkBuddy** | 5 个 LLM Agent + CPM 算法 + cloud.llm 切换就绪 | prompts.ts + mock-llm.ts (realLLMCall 注释代码) |
| **End-to-End Execution** | 一个表单输入 → 完整计划输出 (任务+分配+路径+风险+救援) | AssignmentInputForm → runPipeline → PipelineState |
| **Usable & Verifiable Results** | Before/After 对比 + CPM 可手动验算 + API 可 curl 测试 | BeforeAfterComparison.tsx + critical-path.ts |

---

*文档版本: 2026-10-10 | 项目: TaskFlow AI | Track 2: WorkBuddy Agentic Solution*
