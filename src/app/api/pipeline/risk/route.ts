// ============================================================
// Risk Agent API Route — FR-006
// ============================================================
// POST /api/pipeline/risk
// Body: { tasks: Task[], members: Member[], deadline: DeadlineInfo, progress: ProjectProgress }
// Returns: RiskAssessment
//
// When WorkBuddy cloud-service is activated, replace mock-llm
// imports with real cloud.llm calls. The agent function signature
// stays the same — only the implementation in mock-llm.ts changes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callRiskAgent } from '@/lib/agents';
import type { Task, Member, DeadlineInfo, ProjectProgress } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;
    const members: Member[] = body.members;
    const deadline: DeadlineInfo | null = body.deadline ?? null;
    const progress: ProjectProgress | null = body.progress ?? null;

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

    const { data } = await callRiskAgent(tasks, members, deadline, progress);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Risk agent failed: ${message}` },
      { status: 500 }
    );
  }
}
