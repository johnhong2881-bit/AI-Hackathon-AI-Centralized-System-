'use client';

/**
 * CountdownTimer.tsx — FR-008
 * Person A (Frontend)
 *
 * Real-time countdown to deadline.
 * Reads deadline from store and updates every second.
 *
 * Data source: store.deadline (mock: mockDeadline)
 * Helper: calculateDeadline() from utils for real-time calculation
 */

import { useTaskStore } from '@/store/useTaskStore';
import { calculateDeadline } from '@/lib/utils/helpers';
import { useEffect, useState } from 'react';

export default function CountdownTimer() {
  const deadline = useTaskStore((s) => s.deadline);
  const [live, setLive] = useState(deadline);

  useEffect(() => {
    if (!deadline?.deadline) return;
    const interval = setInterval(() => {
      setLive(calculateDeadline(deadline.deadline, deadline.assignmentId));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!live) return null;

  const hoursOnly = live.hoursRemaining % 24;
  const minsOnly = Math.floor(((live.hoursRemaining * 3600) % 3600) / 60);
  const secsOnly = Math.floor(((live.hoursRemaining * 3600 * 1000) % 1000) / 1000);

  return (
    <div className={`rounded-lg p-4 text-center ${live.isUrgent ? 'bg-red-50' : 'bg-green-50'}`}>
      <p className="text-xs text-slate-500">Deadline Countdown</p>
      <div className="mt-1 flex items-baseline justify-center gap-2">
        {live.isOverdue ? (
          <span className="text-2xl font-bold text-red-600">OVERDUE</span>
        ) : (
          <>
            <span className={`text-3xl font-bold ${live.isUrgent ? 'text-red-600' : 'text-slate-800'}`}>
              {live.daysRemaining}d
            </span>
            <span className={`text-xl ${live.isUrgent ? 'text-red-500' : 'text-slate-600'}`}>
              {hoursOnly}h
            </span>
            {!live.isUrgent && (
              <span className="text-sm text-slate-400">{minsOnly}m</span>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {live.isUrgent ? '⚠️ Less than 24 hours!' : 'On schedule'}
      </p>
    </div>
  );
}
