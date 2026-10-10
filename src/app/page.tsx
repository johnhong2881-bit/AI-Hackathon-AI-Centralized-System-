'use client';

import { useTaskStore } from '@/store/useTaskStore';
import { mockFullPipeline } from '@/lib/mock';

/**
 * Main page — renders the TaskFlow AI dashboard.
 * Currently loads mock data and shows a summary.
 *
 * Person A (Frontend) will build out the actual components here:
 * - Dashboard (FR-009)
 * - Kanban Board (FR-005)
 * - Gantt Chart (FR-007)
 * - Member Cards (FR-010)
 * - Task Detail Panel (FR-014)
 * - Countdown Timer (FR-008)
 * - Rescue Plan Modal (FR-012)
 */
export default function Home() {
  const { assignment, plan, members, progress, deadline } = useTaskStore();

  // Load mock data for development
  const data = mockFullPipeline;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🤖</span>
          <h1 className="text-2xl font-bold tracking-tight">TaskFlow AI</h1>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Demo Mode
          </span>
        </div>
        <p className="text-slate-500">
          {data.assignment.title}
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

      {/* Placeholder for Kanban Board */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Kanban Board</h2>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          📋 Kanban Board (FR-005) — Person A will build this here.
          <br />
          <span className="text-xs">
            Data ready: {data.plan.tasks.length} tasks in mockTasks.ts
          </span>
        </div>
      </section>

      {/* Placeholder for Gantt Chart */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Timeline (Gantt)</h2>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          📅 Gantt Chart (FR-007) — Person A will build this here.
          <br />
          <span className="text-xs">
            Data ready: critical path with {data.criticalPath.nodes.length} nodes
          </span>
        </div>
      </section>

      {/* Team Members */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Team Members</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.members.map((m) => (
            <div key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{m.avatar}</span>
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {m.skills.map((s) => (
                  <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
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
