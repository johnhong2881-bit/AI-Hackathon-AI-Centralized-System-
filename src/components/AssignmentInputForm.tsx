'use client';

import { useState } from 'react';
import type { Assignment, AssignmentType, FullPipelineResult } from '@/types/types';
import { mockAssignment, mockMembers } from '@/lib/mock';
import { useTaskStore } from '@/store/useTaskStore';

// ===== Form State =====

interface FormState {
  title: string;
  course: string;
  assignmentType: AssignmentType;
  deadline: string; // datetime-local format (YYYY-MM-DDTHH:MM)
  teamSize: number;
  deliverables: string; // textarea, one per line
  rubricText: string;
  description: string;
}

// ===== Helpers =====

/** Convert an ISO timestamp to the datetime-local input format. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local value to an ISO timestamp. */
function toISO(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  const d = new Date(datetimeLocal);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ===== Assignment Type Options =====

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'research', label: 'Research' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'software', label: 'Software' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'mixed', label: 'Mixed' },
];

// ===== Component =====

export default function AssignmentInputForm() {
  const [form, setForm] = useState<FormState>({
    title: mockAssignment.title,
    course: mockAssignment.course,
    assignmentType: mockAssignment.assignmentType,
    deadline: toDatetimeLocal(mockAssignment.deadline),
    teamSize: mockAssignment.teamSize,
    deliverables: mockAssignment.deliverables.join('\n'),
    rubricText: mockAssignment.rubricText ?? '',
    description: mockAssignment.description,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    setAssignment,
    setRubric,
    setPlan,
    setMembers,
    setSkillMatch,
    setCriticalPath,
    setRiskAssessment,
    setRescuePlan,
    setProgress,
    setDeadline,
  } = useTaskStore();

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    // Parse form data into an Assignment object
    const assignment: Assignment = {
      id: mockAssignment.id,
      title: form.title.trim(),
      course: form.course.trim(),
      deliverables: form.deliverables
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      deadline: toISO(form.deadline),
      assignmentType: form.assignmentType,
      teamSize: form.teamSize,
      description: form.description.trim(),
      rubricText: form.rubricText.trim() || undefined,
    };

    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment, members: mockMembers }),
      });

      if (!res.ok) {
        throw new Error(`Pipeline failed with status ${res.status}`);
      }

      const result: FullPipelineResult = await res.json();

      // Store all pipeline results in Zustand
      setAssignment(result.assignment);
      setRubric(result.rubric);
      setPlan(result.plan);
      setMembers(result.members);
      setSkillMatch(result.skillMatch);
      setCriticalPath(result.criticalPath);
      setRiskAssessment(result.riskAssessment);
      setRescuePlan(result.rescuePlan);
      setProgress(result.progress);
      setDeadline(result.deadline);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Assignment Input</h2>
          <p className="mt-1 text-sm text-slate-500">
            The &ldquo;One Prompt&rdquo; entry point &mdash; fill in your assignment details and launch
            the full 6-agent pipeline.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Assignment Title */}
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
              Assignment Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. CS3041 HCI Group Project"
            />
          </div>

          {/* Course */}
          <div>
            <label htmlFor="course" className="mb-1 block text-sm font-medium text-slate-700">
              Course
            </label>
            <input
              id="course"
              type="text"
              required
              value={form.course}
              onChange={(e) => update('course', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. CS3041 — Human-Computer Interaction"
            />
          </div>

          {/* Assignment Type + Deadline */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="assignmentType"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Assignment Type
              </label>
              <select
                id="assignmentType"
                value={form.assignmentType}
                onChange={(e) => update('assignmentType', e.target.value as AssignmentType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ASSIGNMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="deadline" className="mb-1 block text-sm font-medium text-slate-700">
                Deadline
              </label>
              <input
                id="deadline"
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => update('deadline', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Team Size */}
          <div>
            <label htmlFor="teamSize" className="mb-1 block text-sm font-medium text-slate-700">
              Team Size
            </label>
            <input
              id="teamSize"
              type="number"
              min={2}
              max={10}
              required
              value={form.teamSize}
              onChange={(e) => update('teamSize', Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
            />
            <p className="mt-1 text-xs text-slate-400">MVP supports 2-10 members</p>
          </div>

          {/* Deliverables */}
          <div>
            <label htmlFor="deliverables" className="mb-1 block text-sm font-medium text-slate-700">
              Deliverables
            </label>
            <textarea
              id="deliverables"
              rows={4}
              required
              value={form.deliverables}
              onChange={(e) => update('deliverables', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="One deliverable per line"
            />
            <p className="mt-1 text-xs text-slate-400">One deliverable per line</p>
          </div>

          {/* Rubric Text */}
          <div>
            <label htmlFor="rubricText" className="mb-1 block text-sm font-medium text-slate-700">
              Rubric Text
            </label>
            <textarea
              id="rubricText"
              rows={6}
              value={form.rubricText}
              onChange={(e) => update('rubricText', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Paste your rubric text here..."
            />
            <p className="mt-1 text-xs text-slate-400">
              Text paste (MVP) — PDF upload planned for future. Image OCR not supported yet.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              required
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Describe the assignment..."
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && !isSubmitting && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Pipeline complete! Results have been stored. Check the dashboard.
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  ⚡ Running 6-agent pipeline...
                </>
              ) : (
                <>🚀 Start Agent Pipeline</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
