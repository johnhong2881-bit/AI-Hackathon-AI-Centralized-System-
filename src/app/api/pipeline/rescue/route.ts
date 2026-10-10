// ============================================================
// Rescue Agent API Route — FR-012
// ============================================================
// POST /api/pipeline/rescue
// Body: { riskAssessment: RiskAssessment, tasks: Task[], members: Member[] }
// Returns: RescuePlan
//
// When WorkBuddy cloud-service is activated, replace mock-llm
// imports with real cloud.llm calls. The agent function signature
// stays the same — only the implementation in mock-llm.ts changes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callRescueAgent } from '@/lib/agents';
import type { RiskAssessment, Task, Member } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const riskAssessment: RiskAssessment = body.riskAssessment;
    const tasks: Task[] = body.tasks;
    const members: Member[] = body.members;

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

    const { data } = await callRescueAgent(riskAssessment, tasks, members);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Rescue agent failed: ${message}` },
      { status: 500 }
    );
  }
}
