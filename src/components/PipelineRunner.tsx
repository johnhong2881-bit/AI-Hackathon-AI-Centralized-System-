'use client';

/**
 * PipelineRunner.tsx — Agentic Workflow Visualization
 * 
 * This is the MOST IMPORTANT component for the hackathon judging.
 * It shows the 6-agent pipeline running step-by-step with:
 * - Visible "thinking" states (loading spinners, logs)
 * - Each agent's role and FR mapping
 * - Real-time logs per step
 * - Completion summary
 * 
 * Judges need to see: "One Prompt → One Goal → End-to-End Execution"
 */

import { useState, useCallback } from 'react';
import { runPipeline } from '@/lib/agents';
import type { PipelineState, StepStatus } from '@/lib/agents';
import { mockAssignment, mockMembers } from '@/lib/mock';

const STATUS_STYLES: Record<StepStatus, { icon: string; color: string; bg: string }> = {
  pending: { icon: '⏳', color: 'text-slate-400', bg: 'bg-slate-50' },
  running: { icon: '⚡', color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { icon: '✅', color: 'text-green-600', bg: 'bg-green-50' },
  error: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50' },
  skipped: { icon: '⏭️', color: 'text-slate-400', bg: 'bg-slate-50' },
};

export default function PipelineRunner() {
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setPipelineState(null);

    await runPipeline(mockAssignment, mockMembers, (state) => {
      setPipelineState({ ...state });
    });

    setIsRunning(false);
  }, []);

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
      {pipelineState && (
        <div className="space-y-2">
          {pipelineState.steps.map((step, index) => {
            const style = STATUS_STYLES[step.status];
            const isActive = pipelineState.currentStepIndex === index;
            return (
              <div
                key={step.agent.id}
                className={`rounded-lg border p-4 ${style.bg} ${
                  isActive ? 'border-blue-400 shadow-sm' : 'border-slate-200'
                } transition-all`}
              >
                <div className="flex items-start gap-3">
                  {/* Agent icon */}
                  <div className="text-2xl">{step.agent.icon}</div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${style.color}`}>
                        {step.agent.name}
                      </span>
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-600">
                        {step.agent.frId}
                      </span>
                      <span className={`text-[10px] ${style.color}`}>
                        {step.agent.type.toUpperCase()}
                      </span>
                      <span className="text-xs">{style.icon}</span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500">{step.agent.description}</p>

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

                  {/* Connecting line */}
                  {index < pipelineState.steps.length - 1 && (
                    <div className="absolute" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Summary */}
      {pipelineState?.isComplete && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-700">✅ Pipeline Complete!</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Summary label="Criteria" value={`${pipelineState.rubric?.items.length || 0}`} />
            <Summary label="Tasks" value={`${pipelineState.plan?.tasks.length || 0}`} />
            <Summary label="Risks" value={`${pipelineState.riskAssessment?.flags.length || 0}`} />
            <Summary label="Rescue Actions" value={`${pipelineState.rescuePlan?.actions.length || 0}`} />
          </div>
          <p className="mt-2 text-xs text-green-600">
            📈 {pipelineState.rescuePlan?.projectedRecovery}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!pipelineState && !isRunning && (
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
