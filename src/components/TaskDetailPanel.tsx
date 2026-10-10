'use client';

/**
 * TaskDetailPanel.tsx — FR-014
 * Person A (Frontend)
 *
 * Side panel showing full details of the selected task.
 * Reads selectedTaskId from store, finds task in store.plan.tasks.
 *
 * Data sources: store.plan.tasks, store.skillMatch, store.riskAssessment
 * Action: store.selectTask(null) to close
 */

import { useTaskStore } from '@/store/useTaskStore';
import { priorityMeta, formatHours, statusColor } from '@/lib/utils/helpers';

export default function TaskDetailPanel() {
  const plan = useTaskStore((s) => s.plan);
  const members = useTaskStore((s) => s.members);
  const selectTask = useTaskStore((s) => s.selectTask);
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId);
  const riskAssessment = useTaskStore((s) => s.riskAssessment);

  if (!plan || !selectedTaskId) return null;

  const task = plan.tasks.find((t) => t.id === selectedTaskId);
  if (!task) return null;

  const assignee = members.find((m) => m.id === task.assignedTo);
  const pm = priorityMeta(task.priority);
  const taskRisk = riskAssessment?.flags.find((f) => f.taskId === task.id);

  return (
    <div className="fixed right-0 top-0 h-full w-96 overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{task.title}</h2>
        <button onClick={() => selectTask(null)} className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">Description</p>
          <p className="text-sm">{task.description}</p>
        </div>

        <div className="flex gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(task.status)}`}>
            {task.status}
          </span>
          <span className={`text-xs ${pm.color}`}>{pm.icon} {pm.label}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-slate-500">Est. Hours</p>
            <p>{formatHours(task.estimatedHours)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Complexity</p>
            <p className="capitalize">{task.complexity}</p>
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500">Assigned To</p>
          <p>{assignee ? `${assignee.avatar} ${assignee.name}` : 'Unassigned'}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Required Skills</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {task.requiredSkills.map((s) => (
              <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                {s}
              </span>
            ))}
          </div>
        </div>

        {task.dependencies.length > 0 && (
          <div>
            <p className="text-xs text-slate-500">Depends On</p>
            <p className="text-xs">{task.dependencies.join(', ')}</p>
          </div>
        )}

        {taskRisk && (
          <div className="rounded border border-amber-200 bg-amber-50 p-2">
            <p className="text-xs font-medium text-amber-700">⚠️ Risk: {taskRisk.riskLevel}</p>
            <p className="text-xs text-amber-600">{taskRisk.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
