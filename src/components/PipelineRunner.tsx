'use client';

/**
 * PipelineRunner.tsx — Agentic Workflow Visualization (LIVE)
 *
 * Calls API routes step-by-step for real-time progress display.
 * Each step calls a server-side API route that uses the real LLM
 * (SovernStack GPT-OSS 120B when configured in .env).
 *
 * Judges see: "One Prompt → One Goal → End-to-End Execution"
 * with visible step-by-step AI agent progress.
 */

import { useState, useCallback } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { mockAssignment, mockMembers, mockProgress } from '@/lib/mock';
import { calculateDeadline } from '@/lib/utils/helpers';
import type {
  Assignment,
  Member,
  RubricResult,
  PlanResult,
  SkillMatchResult,
  CriticalPathResult,
  RiskAssessment,
  RescuePlan,
} from '@/types/types';

// ===== Agent step definitions (matches AGENTS in types.ts) =====

interface StepDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  frId: string;
  type: 'LLM' | 'Deterministic' | 'Hybrid';
}

const STEPS: StepDef[] = [
  { id: 'rubric', name: 'Rubric Intelligence Agent', icon: '📋', description: 'Parse rubric into structured criteria', frId: 'FR-001', type: 'LLM' },
  { id: 'task', name: 'Task Decomposition Agent', icon: '🧩', description: 'Break assignment into actionable tasks', frId: 'FR-002', type: 'LLM' },
  { id: 'skill', name: 'Skill Matching Agent', icon: '🎯', description: 'Match tasks to team members', frId: 'FR-003', type: 'LLM' },
  { id: 'critical-path', name: 'Critical Path Agent', icon: '📊', description: 'Calculate timeline & resource schedule', frId: 'FR-004', type: 'Deterministic' },
  { id: 'risk', name: 'Risk Detection Agent', icon: '⚠️', description: 'Identify at-risk tasks', frId: 'FR-006', type: 'LLM' },
  { id: 'rescue', name: 'Rescue Plan Agent', icon: '🛡️', description: 'Generate rescue actions', frId: 'FR-012', type: 'Hybrid' },
];

type StepStatus = 'pending' | 'running' | 'completed' | 'error';

const STATUS_STYLES: Record<StepStatus, { icon: string; color: string; bg: string; border: string }> = {
  pending: { icon: '⏳', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200' },
  running: { icon: '⚡', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400' },
  completed: { icon: '✅', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  error: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

interface StepState {
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  result?: string;
  error?: string;
  logs: string[];
}

// ===== API call helper =====

async function apiCall<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errData.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ===== Main Component =====

export default function PipelineRunner({ assignment, members }: { assignment: Assignment; members: Member[] }) {
  const [steps, setSteps] = useState<StepState[]>(
    STEPS.map(() => ({ status: 'pending' as StepStatus, logs: [] }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);

  // Zustand store
  const store = useTaskStore();

  const updateStep = useCallback((index: number, partial: Partial<StepState>) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  }, []);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setIsComplete(false);
    setCurrentStep(-1);

    // Reset all steps
    setSteps(STEPS.map(() => ({ status: 'pending' as StepStatus, logs: [] })));

    // Store assignment + members + deadline in Zustand
    store.setAssignment(assignment);
    store.setMembers(members);
    const deadline = calculateDeadline(assignment.deadline, assignment.id);
    store.setDeadline(deadline);

    let rubric: RubricResult;
    let plan: PlanResult;
    let skillMatch: SkillMatchResult;
    let criticalPath: CriticalPathResult;
    let riskAssessment: RiskAssessment;
    let rescuePlan: RescuePlan;

    // === Step 0: Rubric Agent ===
    setCurrentStep(0);
    updateStep(0, { status: 'running', startedAt: Date.now(), logs: ['📊 Sending rubric text to LLM...', '📋 Parsing criteria...'] });
    try {
      rubric = await apiCall<RubricResult>('/api/pipeline/rubric', { assignment });
      store.setRubric(rubric);
      updateStep(0, {
        status: 'completed',
        completedAt: Date.now(),
        durationMs: Date.now() - (steps[0]?.startedAt ?? Date.now()),
        result: `Extracted ${rubric.items.length} criteria, total ${rubric.totalMarks} marks`,
        logs: [`✅ Found ${rubric.items.length} criteria (${rubric.totalMarks} total marks)`],
      });
    } catch (err) {
      updateStep(0, { status: 'error', error: String(err), logs: [`❌ Error: ${err}`] });
      setIsRunning(false);
      return;
    }

    // === Step 1: Task Agent ===
    setCurrentStep(1);
    updateStep(1, { status: 'running', startedAt: Date.now(), logs: ['🧩 Decomposing assignment into tasks...', '🔗 Mapping tasks to rubric criteria...'] });
    try {
      plan = await apiCall<PlanResult>('/api/pipeline/tasks', { assignment, rubric });
      store.setPlan(plan);
      updateStep(1, {
        status: 'completed',
        completedAt: Date.now(),
        durationMs: Date.now() - (steps[1]?.startedAt ?? Date.now()),
        result: `Generated ${plan.tasks.length} tasks, ${plan.totalEstimatedHours}h total`,
        logs: [`✅ Created ${plan.tasks.length} tasks (${plan.totalEstimatedHours}h estimated)`],
      });
    } catch (err) {
      updateStep(1, { status: 'error', error: String(err), logs: [`❌ Error: ${err}`] });
      setIsRunning(false);
      return;
    }

    // === Step 2: Skill Agent ===
    setCurrentStep(2);
    updateStep(2, { status: 'running', startedAt: Date.now(), logs: ['🎯 Matching tasks to team members...', '📊 Calculating skill scores...'] });
    try {
      skillMatch = await apiCall<SkillMatchResult>('/api/pipeline/skills', { tasks: plan.tasks, members });
      store.setSkillMatch(skillMatch);
      updateStep(2, {
        status: 'completed',
        completedAt: Date.now(),
        durationMs: Date.now() - (steps[2]?.startedAt ?? Date.now()),
        result: `Assigned ${skillMatch.assignments.length}/${plan.tasks.length} tasks, ${skillMatch.unmatchedTaskIds.length} unmatched`,
        logs: [`✅ Matched ${skillMatch.assignments.length} tasks (${skillMatch.unmatchedTaskIds.length} unmatched)`],
      });
    } catch (err) {
      updateStep(2, { status: 'error', error: String(err), logs: [`❌ Error: ${err}`] });
      setIsRunning(false);
      return;
    }

    // === Step 3: Critical Path (scheduler) ===
    setCurrentStep(3);
    updateStep(3, { status: 'running', startedAt: Date.now(), logs: ['📊 Running resource-constrained scheduler...', '🗓️ Computing per-day capacity...'] });
    try {
      criticalPath = await apiCall<CriticalPathResult>('/api/pipeline/critical-path', { tasks: plan.tasks, members, deadline });
      store.setCriticalPath(criticalPath);
      updateStep(3, {
        status: 'completed',
        completedAt: Date.now(),
        durationMs: Date.now() - (steps[3]?.startedAt ?? Date.now()),
        result: `Predicted: Day ${criticalPath.predictedCompletionDay} | Deadline: Day ${criticalPath.deadlineDay} | Status: ${criticalPath.riskStatus}`,
        logs: [
          `✅ Predicted completion: Day ${criticalPath.predictedCompletionDay}`,
          `📅 Deadline: Day ${criticalPath.deadlineDay} (${criticalPath.delayDays > 0 ? `${criticalPath.delayDays} days late` : 'on track'})`,
          `⚠️ Risk status: ${criticalPath.riskStatus}`,
          `🔗 Critical path: ${criticalPath.criticalPath.length} tasks`,
          ...criticalPath.memberLoads.map(m => `   • ${m.memberName}: ${m.remainingWorkHours}h work / ${m.availableHours}h available${m.isOverloaded ? ' ⚠️ OVERLOADED' : ''}`),
        ],
      });
    } catch (err) {
      updateStep(3, { status: 'error', error: String(err), logs: [`❌ Error: ${err}`] });
      setIsRunning(false);
      return;
    }

    // === Step 4: Risk Agent ===
    setCurrentStep(4);
    updateStep(4, { status: 'running', startedAt: Date.now(), logs: [
      `⚠️ Scheduler computed: ${criticalPath.riskStatus} (${criticalPath.delayDays}d delay)`,
      `📝 LLM writing plain-language risk explanation...`,
    ]});
    try {
      const schedulerFacts = {
        riskStatus: criticalPath.riskStatus,
        predictedCompletionDay: criticalPath.predictedCompletionDay,
        deadlineDay: criticalPath.deadlineDay,
        delayDays: criticalPath.delayDays,
        delayedTaskIds: criticalPath.delayedTaskIds,
        criticalPath: criticalPath.criticalPath,
        memberLoads: criticalPath.memberLoads,
      };
      riskAssessment = await apiCall<RiskAssessment>('/api/pipeline/risk', {
        tasks: plan.tasks,
        members,
        deadline,
        progress: mockProgress,
        schedulerFacts,
      });
      store.setRiskAssessment(riskAssessment);
      store.setProgress(mockProgress);
      updateStep(4, {
        status: 'completed',
        completedAt: Date.now(),
        durationMs: Date.now() - (steps[4]?.startedAt ?? Date.now()),
        result: `${criticalPath.riskStatus} (computed) | ${riskAssessment.flags.length} flags (LLM explained)`,
        logs: [
          `✅ Risk status: ${criticalPath.riskStatus} (computed by scheduler, not LLM)`,
          `📊 overallRiskLevel: ${riskAssessment.overallRiskLevel}`,
        ],
      });
    } catch (err) {
      updateStep(4, { status: 'error', error: String(err), logs: [`❌ Error: ${err}`] });
      setIsRunning(false);
      return;
    }

    // === Step 5: Rescue Agent ===
    setCurrentStep(5);
    updateStep(5, { status: 'running', startedAt: Date.now(), logs: [
      '🛡️ Starting scheduler-validated rescue search...',
      '  📊 Round 1: Move unstarted work',
      '  🔄 Round 2: Rebalance accepted work',
      '  ✂️ Round 3: Reduce low-priority scope',
    ]});
    try {
      rescuePlan = await apiCall<RescuePlan>('/api/pipeline/rescue', {
        riskAssessment,
        tasks: plan.tasks,
        members,
        deadline,
      });
      store.setRescuePlan(rescuePlan);
      const cmp = rescuePlan.comparisonResult;
      const wf = rescuePlan.workflow;
      updateStep(5, {
        status: 'completed',
        completedAt: Date.now(),
        durationMs: Date.now() - (steps[5]?.startedAt ?? Date.now()),
        result: `${rescuePlan.actions.length} rescue actions, confidence ${(rescuePlan.confidence * 100).toFixed(0)}%`,
        logs: cmp ? [
          `✅ Best result: Round ${wf?.optimizationRound ?? 1}`,
          `📊 Comparison: ${cmp.beforeHours}h → ${cmp.afterHours}h (saved ${cmp.hoursSaved}h)`,
          `⚠️ Risk: ${cmp.beforeRiskLevel} → ${cmp.afterRiskLevel}`,
          `📅 Deadline buffer: ${cmp.beforeDeadlineBuffer}h → ${cmp.afterDeadlineBuffer}h`,
          `📈 ${rescuePlan.projectedRecovery}`,
        ] : [`✅ ${rescuePlan.actions.length} rescue actions generated`],
      });
    } catch (err) {
      updateStep(5, { status: 'error', error: String(err), logs: [`❌ Error: ${err}`] });
      setIsRunning(false);
      return;
    }

    // === Pipeline complete ===
    setCurrentStep(-1);
    setIsComplete(true);
    setIsRunning(false);
  }, [assignment, members, store, updateStep, steps]);

  return (
    <div className="space-y-4">
      {/* Run Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">🤖 Agentic Pipeline</h2>
          <p className="text-sm text-slate-500">6 AI agents run autonomously — no manual steps</p>
        </div>
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`rounded-lg px-6 py-2 text-sm font-medium text-white transition ${
            isRunning ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? '⚡ Running...' : '🚀 Run Pipeline'}
        </button>
      </div>

      {/* Pipeline Steps */}
      <div className="space-y-2">
        {STEPS.map((stepDef, index) => {
          const step = steps[index];
          const style = STATUS_STYLES[step.status];
          const isActive = currentStep === index;
          return (
            <div
              key={stepDef.id}
              className={`rounded-lg border p-4 ${style.bg} ${
                isActive ? `${style.border} shadow-sm ring-2 ring-blue-200` : 'border-slate-200'
              } transition-all`}
            >
              <div className="flex items-start gap-3">
                {/* Agent icon */}
                <div className="text-2xl">{stepDef.icon}</div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-medium ${style.color}`}>
                      {stepDef.name}
                    </span>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                      {stepDef.frId}
                    </span>
                    <span className={`text-[10px] ${style.color}`}>
                      {stepDef.type.toUpperCase()}
                    </span>
                    <span className="text-xs">{style.icon}</span>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-500">{stepDef.description}</p>

                  {/* Result summary */}
                  {step.result && (
                    <p className={`mt-1 text-xs font-medium ${style.color}`}>
                      {step.result}
                    </p>
                  )}

                  {/* Error */}
                  {step.error && (
                    <p className="mt-1 text-xs text-red-500">Error: {step.error}</p>
                  )}

                  {/* Logs */}
                  {step.logs.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {step.logs.map((log, i) => (
                        <p key={i} className="text-[10px] font-mono text-slate-400">
                          {log}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Duration */}
                  {step.durationMs !== undefined && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      ⏱️ {step.durationMs < 1000 ? `${step.durationMs}ms` : `${(step.durationMs / 1000).toFixed(1)}s`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Summary */}
      {isComplete && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-700">✅ Pipeline Complete!</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Summary label="Criteria" value={`${store.rubric?.items.length || 0}`} />
            <Summary label="Tasks" value={`${store.plan?.tasks.length || 0}`} />
            <Summary label="Risks" value={`${store.riskAssessment?.flags.length || 0}`} />
            <Summary label="Rescue Actions" value={`${store.rescuePlan?.actions.length || 0}`} />
          </div>
          {store.rescuePlan?.projectedRecovery && (
            <p className="mt-2 text-xs text-green-600">
              📈 {store.rescuePlan.projectedRecovery}
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isRunning && !isComplete && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-400">Click "Run Pipeline" to see the 6-agent workflow in action</p>
          <p className="mt-1 text-xs text-slate-300">
            Rubric → Tasks → Skills → Critical Path → Risk → Rescue
          </p>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/60 px-2 py-1">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-green-700">{value}</p>
    </div>
  );
}
