'use client';

/**
 * RescuePlanModal.tsx — FR-012
 * Person A (Frontend)
 *
 * Modal showing AI-generated rescue plan for at-risk tasks.
 * Reads rescuePlan from store.
 *
 * Data source: store.rescuePlan (mock: mockRescuePlan)
 */

import { useTaskStore } from '@/store/useTaskStore';
import { priorityMeta } from '@/lib/utils/helpers';

export default function RescuePlanModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const rescuePlan = useTaskStore((s) => s.rescuePlan);
  const plan = useTaskStore((s) => s.plan);
  if (!rescuePlan || !plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">🛡️ Rescue Plan</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="mb-4 rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Projected Recovery:</span> {rescuePlan.projectedRecovery}
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Confidence: {(rescuePlan.confidence * 100).toFixed(0)}%
          </p>
        </div>

        <div className="space-y-3">
          {rescuePlan.actions.map((action) => {
            const task = plan.tasks.find((t) => t.id === action.taskId);
            const pm = priorityMeta(action.priority);
            return (
              <div key={action.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{action.actionType.toUpperCase()}</p>
                    <p className="text-xs text-slate-500">{task?.title || action.taskId}</p>
                  </div>
                  <span className={`text-xs ${pm.color}`}>{pm.icon} {pm.label}</span>
                </div>
                <p className="mt-2 text-sm">{action.description}</p>
                <p className="mt-1 text-xs text-green-600">📊 {action.estimatedImpact}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
