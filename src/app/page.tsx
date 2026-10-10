'use client';

import { mockFullPipeline } from '@/lib/mock';
import PipelineRunner from '@/components/PipelineRunner';
import BeforeAfterComparison from '@/components/BeforeAfterComparison';
import Dashboard from '@/components/Dashboard';
import MemberCard from '@/components/MemberCard';
import CountdownTimer from '@/components/CountdownTimer';

/**
 * TaskFlow AI — Main Page
 * 
 * Layout designed for hackathon judging:
 * 1. Hero + Summary → shows Real Problem & User Value
 * 2. Pipeline Runner → shows Agentic Workflow (6 agents, step-by-step)
 * 3. Before/After → shows Usable & Verifiable Results
 * 4. Dashboard → shows project overview
 * 5. Team Members → shows team
 */
export default function Home() {
  const data = mockFullPipeline;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🤖</span>
          <h1 className="text-2xl font-bold tracking-tight">TaskFlow AI</h1>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Rubric-Aware Autonomous Deadline Defender
          </span>
        </div>
        <p className="text-slate-600">
          {data.assignment.title}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          One Prompt → One Goal → End-to-End Execution
        </p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <SummaryCard
          label="Overall Progress"
          value={`${data.progress.overallCompletion}%`}
          subtext={`${data.progress.tasksCompleted}/${data.progress.tasksTotal} tasks done`}
          color="text-blue-600"
        />
        <SummaryCard
          label="Days to Deadline"
          value={`${data.deadline.daysRemaining}`}
          subtext={data.deadline.isUrgent ? 'URGENT!' : 'On track'}
          color={data.deadline.isUrgent ? 'text-red-600' : 'text-green-600'}
        />
        <SummaryCard
          label="Tasks Total"
          value={`${data.plan.tasks.length}`}
          subtext={`${data.plan.totalEstimatedHours}h estimated`}
          color="text-slate-700"
        />
        <SummaryCard
          label="Risk Level"
          value={data.riskAssessment.overallRiskLevel.toUpperCase()}
          subtext={`${data.riskAssessment.flags.length} flags`}
          color="text-amber-600"
        />
      </div>

      {/* Agentic Pipeline — THE KEY SECTION FOR JUDGING */}
      <section className="mb-8">
        <PipelineRunner />
      </section>

      {/* Before/After Rescue — THE KILLER DEMO */}
      <section className="mb-8">
        <BeforeAfterComparison />
      </section>

      {/* Dashboard */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">📊 Dashboard</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dashboard />
          <CountdownTimer />
        </div>
      </section>

      {/* Team Members */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">👥 Team Members</h2>
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
          Powered by 6 AI Agents: Rubric → Task → Skill → Critical Path → Risk → Rescue
        </p>
      </footer>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string;
  subtext: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400">{subtext}</p>
    </div>
  );
}
