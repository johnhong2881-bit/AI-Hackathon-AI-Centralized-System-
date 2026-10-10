'use client';

/**
 * Dashboard.tsx — FR-009
 * Person A (Frontend)
 *
 * Main dashboard showing project overview:
 * - Progress ring/bar (from store.progress)
 * - Deadline countdown (from store.deadline)
 * - Risk summary (from store.riskAssessment)
 * - Task stats
 *
 * Data sources: store.progress, store.deadline, store.riskAssessment
 */

import { useTaskStore } from '@/store/useTaskStore';
import { formatHours } from '@/lib/utils/helpers';

export default function Dashboard() {
  const progress = useTaskStore((s) => s.progress);
  const deadline = useTaskStore((s) => s.deadline);
  const risk = useTaskStore((s) => s.riskAssessment);
  if (!progress || !deadline) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Overall Progress</p>
        <p className="text-2xl font-bold text-blue-600">{progress.overallCompletion}%</p>
        <p className="text-xs text-slate-400">{progress.tasksCompleted}/{progress.tasksTotal} tasks done</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Days to Deadline</p>
        <p className={`text-2xl font-bold ${deadline.isUrgent ? 'text-red-600' : 'text-green-600'}`}>
          {deadline.daysRemaining}
        </p>
        <p className="text-xs text-slate-400">{deadline.isUrgent ? 'URGENT!' : 'On track'}</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Hours</p>
        <p className="text-2xl font-bold text-slate-700">{formatHours(progress.hoursSpent)}</p>
        <p className="text-xs text-slate-400">of {formatHours(progress.hoursTotal)} total</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Risk Level</p>
        <p className="text-2xl font-bold text-amber-600">
          {risk?.overallRiskLevel.toUpperCase() || 'N/A'}
        </p>
        <p className="text-xs text-slate-400">{risk?.flags.length || 0} flags</p>
      </div>
    </div>
  );
}
