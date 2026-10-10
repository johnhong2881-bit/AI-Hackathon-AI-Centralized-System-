// ============================================================
// Critical Path Agent API Route — FR-004
// ============================================================
// POST /api/pipeline/critical-path
// Body: { tasks: Task[], members: Member[], deadline: DeadlineInfo }
// Returns: CriticalPathResult
//
// Uses the resource-constrained scheduler (not the old CPM-only).
// This is a deterministic agent — no LLM, no cloud-service needed.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { calculateCriticalPathWithSchedule } from '@/lib/logic/scheduler';
import type { Task, Member, DeadlineInfo } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;
    const members: Member[] = body.members;
    const deadline: DeadlineInfo | null = body.deadline ?? null;

    if (!tasks) {
      return NextResponse.json(
        { error: 'Missing "tasks" in request body' },
        { status: 400 }
      );
    }

    if (!members) {
      return NextResponse.json(
        { error: 'Missing "members" in request body' },
        { status: 400 }
      );
    }

    const data = calculateCriticalPathWithSchedule(tasks, members, deadline);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Critical path agent failed: ${message}` },
      { status: 500 }
    );
  }
}
