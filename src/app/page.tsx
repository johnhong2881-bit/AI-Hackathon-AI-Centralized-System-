'use client';

import { useState } from 'react';
import { mockAssignment, mockMembers } from '@/lib/mock';
import AssignmentInputForm from '@/components/AssignmentInputForm';
import PipelineRunner from '@/components/PipelineRunner';
import BeforeAfterComparison from '@/components/BeforeAfterComparison';
import TaskFlowMockup2 from '@/components/TaskFlowMockup2';

// ===== View Mode =====

type ViewMode = 'demo' | 'mockup';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('demo');

  return (
    <main className="min-h-screen bg-slate-50">
      {/* === Header === */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-lg font-bold text-slate-800">TaskFlow AI</h1>
            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              One Prompt. One Goal. Zero Missed Deadlines.
            </span>
          </div>

          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setViewMode('demo')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === 'demo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              🚀 Live Demo
            </button>
            <button
              onClick={() => setViewMode('mockup')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                viewMode === 'mockup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              📱 UI Mockup
            </button>
          </div>
        </div>
      </header>

      {/* === Content === */}
      {viewMode === 'mockup' ? (
        <TaskFlowMockup2 />
      ) : (
        <div className="mx-auto max-w-5xl px-4 py-6">
          {/* Problem Statement */}
          <section className="mb-6 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 p-6 text-white">
            <h2 className="text-2xl font-bold">73% of student teams miss deadlines.</h2>
            <p className="mt-2 text-sm text-blue-50">
              TaskFlow AI runs 6 autonomous agents that parse your rubric, decompose tasks,
              match skills, schedule resources, detect risks, and generate rescue plans —
              all from a single assignment paste.
            </p>
          </section>

          {/* Assignment Input Form */}
          <section className="mb-6">
            <AssignmentInputForm />
          </section>

          {/* Pipeline Runner */}
          <section className="mb-6">
            <PipelineRunner assignment={mockAssignment} members={mockMembers} />
          </section>

          {/* Before/After Comparison */}
          <section className="mb-6">
            <BeforeAfterComparison />
          </section>

          {/* Architecture */}
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              🏗️ Two-Layer Architecture
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold text-blue-600">LLM Layer (4 agents)</p>
                <p className="mt-1 text-xs text-slate-600">
                  Rubric parsing, task decomposition, skill matching, risk explanation
                  — powered by GPT-OSS 120B via SovernStack API.
                </p>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                <p className="text-xs font-semibold text-cyan-600">Deterministic Layer (2 agents)</p>
                <p className="mt-1 text-xs text-slate-600">
                  Resource-constrained scheduler (day-by-day capacity) + 3-round
                  scheduler-validated rescue search.
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="py-6 text-center text-xs text-slate-400">
            <p>Built on WorkBuddy AI · 6-Agent Autonomous Pipeline · SovernStack GPT-OSS 120B</p>
          </footer>
        </div>
      )}
    </main>
  );
}
