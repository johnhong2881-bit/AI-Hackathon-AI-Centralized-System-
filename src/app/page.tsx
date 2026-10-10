'use client';

/**
 * TaskFlow AI — Narrative-Driven Landing Page
 *
 * Mentor advice applied:
 * - "Don't make a dashboard" → replaced dashboard section with problem/solution narrative
 * - "Standout and be CLEAR with your pitch" → Problem → Solution → Demo → Proof flow
 * - "Start with a real problem you know" → opens with the real pain of student group projects
 *
 * Layout:
 * 1. Problem Hero — the real pain (4 students, 6 weeks, 1 grade)
 * 2. Solution — One Prompt → One Goal → End-to-End Execution
 * 3. Live Demo — AssignmentInputForm + PipelineRunner (6 agents in action)
 * 4. The Proof — BeforeAfterComparison (measurable value)
 * 5. Architecture — 6 agents mapped to judging criteria (replaces dashboard)
 */

import { mockFullPipeline } from '@/lib/mock';
import { AGENTS } from '@/lib/agents';
import PipelineRunner from '@/components/PipelineRunner';
import BeforeAfterComparison from '@/components/BeforeAfterComparison';
import AssignmentInputForm from '@/components/AssignmentInputForm';
import MemberCard from '@/components/MemberCard';

const PAIN_POINTS = [
  { icon: '🤷', text: 'Nobody knows who does what until week 4' },
  { icon: '⏰', text: 'Deadline sneaks up — 3 all-nighters in a row' },
  { icon: '📉', text: 'Rubric criteria missed because nobody read it' },
  { icon: '🔥', text: 'One member overloaded, another idle — nobody noticed' },
];

const CRITERIA_MAPPING = [
  { criterion: 'Real Problem & User Value', agents: 'All', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { criterion: 'Agentic Workflow', agents: '6 Agents in Pipeline', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { criterion: 'Meaningful Use of WorkBuddy', agents: 'LLM + CPM', color: 'bg-green-50 text-green-700 border-green-200' },
  { criterion: 'End-to-End Execution', agents: '1 Prompt → Full Plan', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { criterion: 'Usable & Verifiable Results', agents: 'Before/After Proof', color: 'bg-red-50 text-red-700 border-red-200' },
];

export default function Home() {
  const data = mockFullPipeline;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* ============================================
          SECTION 1: THE PROBLEM (narrative hook)
          "Start with a real problem you know"
          ============================================ */}
      <section className="mb-12">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-4xl">🤖</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TaskFlow AI</h1>
              <p className="text-sm text-slate-300">Rubric-Aware Autonomous Deadline Defender</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Left: The Pitch */}
            <div>
              <h2 className="mb-3 text-xl font-semibold text-white">
                4 students. 6 weeks. 1 grade.
              </h2>
              <p className="text-slate-300">
                Every semester, universities throw students into group projects with a rubric PDF and
                a deadline. No project manager. No visibility. Just chaos.
              </p>
              <p className="mt-3 font-medium text-blue-300">
                TaskFlow AI fixes this: paste your assignment → get a full execution plan in seconds.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                One Prompt → One Goal → End-to-End Execution
              </p>
            </div>

            {/* Right: Real Pain Points */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                The Problem We All Know
              </p>
              {PAIN_POINTS.map((pain, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2"
                >
                  <span className="text-lg">{pain.icon}</span>
                  <span className="text-sm text-slate-200">{pain.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 2: THE SOLUTION (one-liner + how it works)
          ============================================ */}
      <section className="mb-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">How It Works</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SolutionStep
              number="1"
              title="Paste Your Assignment"
              description="Rubric text, team members, deadline — one form."
              icon="📝"
            />
            <SolutionStep
              number="2"
              title="6 Agents Run Autonomously"
              description="Rubric → Tasks → Skills → Critical Path → Risk → Rescue"
              icon="🤖"
            />
            <SolutionStep
              number="3"
              title="Get a Defended Plan"
              description="Every task assigned, every risk caught, deadline protected."
              icon="✅"
            />
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 3: LIVE DEMO — Input + Pipeline
          "One Prompt → End-to-End Execution"
          ============================================ */}
      <section className="mb-12">
        <SectionHeader
          number="01"
          title="One Prompt In"
          subtitle="Paste assignment details → the agents take over"
        />
        <AssignmentInputForm />
      </section>

      <section className="mb-12">
        <SectionHeader
          number="02"
          title="6 Agents Run Autonomously"
          subtitle="Watch the pipeline execute step-by-step — no manual intervention"
        />
        <PipelineRunner />
      </section>

      {/* ============================================
          SECTION 4: THE PROOF — Before/After
          "Usable & Verifiable Results"
          ============================================ */}
      <section className="mb-12">
        <SectionHeader
          number="03"
          title="Measurable Impact"
          subtitle="Before vs After: how TaskFlow AI defended the deadline"
        />
        <BeforeAfterComparison />
      </section>

      {/* ============================================
          SECTION 5: ARCHITECTURE (replaces dashboard)
          Maps agents to judging criteria
          ============================================ */}
      <section className="mb-12">
        <SectionHeader
          number="04"
          title="Architecture: 6 Agents"
          subtitle="Each agent maps to a real requirement — not just a UI mockup"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {/* Criteria mapping table */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Track 2 Judging Criteria Coverage
          </p>
          <div className="space-y-2">
            {CRITERIA_MAPPING.map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{row.criterion}</span>
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium ${row.color}`}
                >
                  {row.agents}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          SECTION 6: TEAM (brief)
          ============================================ */}
      <section className="mb-12">
        <SectionHeader
          number="05"
          title="The Team"
          subtitle="Skills matched by AI — not by gut feeling"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 pt-4 text-center">
        <p className="text-xs text-slate-400">
          TaskFlow AI — Track 2: WorkBuddy Agentic Solution
          <br />
          6 AI Agents: Rubric → Task → Skill → Critical Path → Risk → Rescue
          <br />
          Built with Next.js 14 + WorkBuddy Cloud SDK (ready for real LLM swap)
        </p>
      </footer>
    </main>
  );
}

// ============================================
// Sub-components
// ============================================

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-slate-300">{number}</span>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>
      <p className="ml-10 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SolutionStep({
  number,
  title,
  description,
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
          {number}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">{agent.icon}</span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{agent.name}</p>
          <p className="text-[10px] font-medium text-slate-400">{agent.frId}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{agent.description}</p>
      <div className="mt-2">
        <span
          className={`rounded px-2 py-0.5 text-[10px] font-medium ${
            agent.type === 'llm'
              ? 'bg-purple-100 text-purple-700'
              : agent.type === 'deterministic'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-green-100 text-green-700'
          }`}
        >
          {agent.type.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
