// ============================================================
// Full Pipeline Run API Route — Runs all 6 agents
// ============================================================
// POST /api/pipeline/run
// Body: { assignment: Assignment, members: Member[] }
// Returns: PipelineState (final state after all steps complete)
//
// When WorkBuddy cloud-service is activated, replace mock-llm
// imports with real cloud.llm calls. The agent function signature
// stays the same — only the implementation in mock-llm.ts changes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/agents';
import type { Assignment, Member } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assignment: Assignment = body.assignment;
    const members: Member[] = body.members;

    if (!assignment) {
      return NextResponse.json(
        { error: 'Missing "assignment" in request body' },
        { status: 400 }
      );
    }

    if (!members) {
      return NextResponse.json(
        { error: 'Missing "members" in request body' },
        { status: 400 }
      );
    }

    // Design Decision #2: MVP supports 2-10 team members
    if (members.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 team members required (MVP supports 2-10)' },
        { status: 400 }
      );
    }
    if (members.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 team members supported (MVP supports 2-10)' },
        { status: 400 }
      );
    }

    // runPipeline expects a progress callback. For a single HTTP
    // request/response cycle we use a no-op callback — the final
    // PipelineState is returned when all steps complete.
    // For real-time progress, use the client-side orchestrator or
    // a Server-Sent Events (SSE) endpoint.
    const finalState = await runPipeline(assignment, members, () => {});

    return NextResponse.json(finalState, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Pipeline run failed: ${message}` },
      { status: 500 }
    );
  }
}
