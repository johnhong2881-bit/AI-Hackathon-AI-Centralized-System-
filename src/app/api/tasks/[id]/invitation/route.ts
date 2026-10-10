import { NextResponse } from 'next/server';
import type { Task } from '../../../../../types/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const { action, rejectReason } = body as { action: 'accept' | 'reject'; rejectReason?: string };
  const taskId = params.id;
  const now = new Date().toISOString();
  const invitationStatus = action === 'accept' ? 'accepted' : 'rejected';

  const task: Task = {
    id: taskId,
    title: '',
    description: '',
    requiredSkills: [],
    estimatedHours: 0,
    complexity: 'low',
    priority: 'medium',
    dependencies: [],
    relatedRubricIds: [],
    status: 'todo',
    assignedTo: action === 'accept' ? 'member-1' : null,
    confirmed: action === 'accept',
    invitationStatus,
    rejectReason: action === 'reject' ? (rejectReason ?? null) : null,
    order: 0,
    createdAt: now,
    updatedAt: now,
  };

  return NextResponse.json(task);
}
