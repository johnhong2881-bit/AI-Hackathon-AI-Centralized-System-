import type { Task, Priority, RiskLevel, TaskStatus, DeadlineInfo } from '../../types/types';

// ===== Formatting Helpers =====

/** Format hours into "Xh Ym" string */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Format ISO date to readable "Oct 15, 2026" */
export function formatDate(iso: string | null): string {
  if (!iso) return 'No deadline';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format ISO date to readable "Oct 15, 2:00 PM" */
export function formatDateTime(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ===== Status / Priority Helpers =====

/** Map TaskStatus to display color class (Tailwind) */
export function statusColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    'todo': 'bg-slate-100 text-slate-600 border-slate-300',
    'in-progress': 'bg-blue-100 text-blue-700 border-blue-300',
    'review': 'bg-amber-100 text-amber-700 border-amber-300',
    'done': 'bg-green-100 text-green-700 border-green-300',
    'blocked': 'bg-red-100 text-red-700 border-red-300',
  };
  return map[status];
}

/** Map Priority to display color and label */
export function priorityMeta(priority: Priority): { color: string; label: string; icon: string } {
  const map: Record<Priority, { color: string; label: string; icon: string }> = {
    'critical': { color: 'text-red-600', label: 'Critical', icon: '🔴' },
    'high': { color: 'text-orange-600', label: 'High', icon: '🟠' },
    'medium': { color: 'text-yellow-600', label: 'Medium', icon: '🟡' },
    'low': { color: 'text-green-600', label: 'Low', icon: '🟢' },
  };
  return map[priority];
}

/** Map RiskLevel to display color and label */
export function riskMeta(level: RiskLevel): { color: string; label: string; icon: string } {
  const map: Record<RiskLevel, { color: string; label: string; icon: string }> = {
    'high': { color: 'text-red-600 bg-red-50 border-red-200', label: 'High Risk', icon: '⚠️' },
    'medium': { color: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Medium Risk', icon: '⚡' },
    'low': { color: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Low Risk', icon: 'ℹ️' },
    'none': { color: 'text-green-600 bg-green-50 border-green-200', label: 'On Track', icon: '✅' },
  };
  return map[level];
}

// ===== Sorting Helpers (FR-011) =====

/** Sort tasks by priority: critical > high > medium > low */
export function sortByPriority(tasks: Task[]): Task[] {
  const order: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Sort tasks by estimated hours descending (most effort first) */
export function sortByHours(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.estimatedHours - a.estimatedHours);
}

/** Sort tasks by dependencies (topological-ish: fewer deps first) */
export function sortByDependencies(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.dependencies.length - b.dependencies.length);
}

// ===== Deadline Helpers (FR-008) =====

/** Calculate DeadlineInfo from an ISO deadline string */
export function calculateDeadline(deadlineISO: string | null, assignmentId: string = 'asg-001'): DeadlineInfo {
  if (!deadlineISO) {
    return { assignmentId, deadline: null, daysRemaining: 0, hoursRemaining: 0, isOverdue: false, isUrgent: false };
  }
  const deadline = new Date(deadlineISO);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const daysRemaining = Math.max(0, Math.floor(hoursRemaining / 24));
  return {
    assignmentId,
    deadline: deadlineISO,
    daysRemaining,
    hoursRemaining,
    isOverdue: diffMs < 0,
    isUrgent: hoursRemaining > 0 && hoursRemaining < 24,
  };
}

// ===== Misc =====

/** Get initials from a full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Truncate text to N chars with ellipsis */
export function truncate(text: string, maxLen: number = 50): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/** Generate a simple unique ID */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
