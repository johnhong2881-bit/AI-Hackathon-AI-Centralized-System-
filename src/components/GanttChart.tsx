'use client';

/**
 * GanttChart.tsx — FR-007
 * Person A (Frontend)
 *
 * Horizontal timeline showing tasks on critical path.
 * Uses Recharts or custom SVG. Reads criticalPath from store.
 *
 * Data source: store.criticalPath (mock: mockCriticalPath)
 * Highlights critical path tasks (slack === 0) in red.
 *
 * TODO (Person A):
 * - Render horizontal bars for each task
 * - Position bars by earlyStart/earlyFinish
 * - Color critical path tasks differently
 * - Add time axis labels
 */

import { useTaskStore } from '@/store/useTaskStore';
import { formatHours } from '@/lib/utils/helpers';

export default function GanttChart() {
  const criticalPath = useTaskStore((s) => s.criticalPath);
  const plan = useTaskStore((s) => s.plan);
  if (!criticalPath || !plan) return null;

  const maxEnd = Math.max(...criticalPath.nodes.map((n) => n.earlyFinish));

  return (
    <div className="space-y-1">
      {criticalPath.nodes.map((node) => {
        const task = plan.tasks.find((t) => t.id === node.taskId);
        if (!task) return null;
        const leftPercent = (node.earlyStart / maxEnd) * 100;
        const widthPercent = ((node.earlyFinish - node.earlyStart) / maxEnd) * 100;
        return (
          <div key={node.taskId} className="flex items-center gap-2">
            <span className="w-32 truncate text-xs text-slate-600">{task.title}</span>
            <div className="relative h-6 flex-1 rounded bg-slate-100">
              <div
                className={`absolute h-6 rounded ${
                  node.isCritical ? 'bg-red-400' : 'bg-blue-300'
                }`}
                style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                title={`${formatHours(node.earlyStart)} - ${formatHours(node.earlyFinish)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
