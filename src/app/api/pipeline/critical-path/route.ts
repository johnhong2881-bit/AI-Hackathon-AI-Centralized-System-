// ============================================================
// Critical Path Agent API Route — FR-004
// ============================================================
// POST /api/pipeline/critical-path
// Body: { tasks: Task[] }
// Returns: CriticalPathResult
//
// This agent is deterministic (no LLM). It uses the Critical Path
// Method (CPM) algorithm. No cloud-service replacement is needed.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { calculateCriticalPath } from '@/lib/agents';
import type { Task } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;

    if (!tasks) {
      return NextResponse.json(
        { error: 'Missing "tasks" in request body' },
        { status: 400 }
      );
    }

    const data = calculateCriticalPath(tasks);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Critical path agent failed: ${message}` },
      { status: 500 }
    );
  }
}
