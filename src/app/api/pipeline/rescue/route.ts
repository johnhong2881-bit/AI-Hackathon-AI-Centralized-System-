// ============================================================
// Rescue Agent API Route — FR-012
// ============================================================
// POST /api/pipeline/rescue
// Body: {
//   riskAssessment: RiskAssessment,
//   tasks: Task[],
//   members: Member[],
//   deadline: DeadlineInfo | null,
//   leaderReason?: { type: string; memberId?: string; note?: string }
// }
// Returns: RescuePlan
//
// Uses the scheduler-validated 3-round rescue search (deterministic).
// The LLM call (if configured) is handled internally by the rescue workflow.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runRescueWorkflow } from '@/lib/logic/rescue-engine';
import type { RiskAssessment, Task, Member, DeadlineInfo } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const riskAssessment: RiskAssessment = body.riskAssessment;
    const tasks: Task[] = body.tasks;
    const members: Member[] = body.members;
    const deadline: DeadlineInfo | null = body.deadline ?? null;
    const leaderReason = body.leaderReason ?? undefined;

    if (!riskAssessment) {
      return NextResponse.json(
        { error: 'Missing "riskAssessment" in request body' },
        { status: 400 }
      );
    }

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

    const data = runRescueWorkflow({
      riskAssessment,
      tasks,
      members,
      deadline,
      leaderReason,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Rescue agent failed: ${message}` },
      { status: 500 }
    );
  }
}
