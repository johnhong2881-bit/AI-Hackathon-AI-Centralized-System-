'use client';

/**
 * KanbanBoard.tsx — FR-005
 * Person A (Frontend)
 *
 * Drag-and-drop task board with columns: To Do / In Progress / Review / Done / Blocked
 * Uses @dnd-kit for DnD. Reads tasks from useTaskStore.
 *
 * Data source: store.plan.tasks (mock: mockPlanResult.tasks)
 * Actions: store.updateTaskStatus()
 *
 * TODO (Person A):
 * - Set up DndContext + SortableContext
 * - Create TaskCard component
 * - Implement onDragEnd → updateTaskStatus
 */

import { useTaskStore } from '@/store/useTaskStore';
import type { TaskStatus } from '@/types/types';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'border-slate-300' },
  { id: 'in-progress', label: 'In Progress', color: 'border-blue-300' },
  { id: 'review', label: 'Review', color: 'border-amber-300' },
  { id: 'done', label: 'Done', color: 'border-green-300' },
  { id: 'blocked', label: 'Blocked', color: 'border-red-300' },
];

export default function KanbanBoard() {
  const plan = useTaskStore((s) => s.plan);
  if (!plan) return null;

  return (
    <div className="grid grid-cols-5 gap-3">
      {COLUMNS.map((col) => {
        const tasks = plan.tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className={`rounded-lg border-2 ${col.color} bg-slate-50 p-3`}>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              {col.label} ({tasks.length})
            </h3>
            <div className="space-y-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="cursor-pointer rounded-md border border-slate-200 bg-white p-2 hover:shadow-sm"
                >
                  <p className="text-xs font-medium">{t.title}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{t.estimatedHours}h</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
