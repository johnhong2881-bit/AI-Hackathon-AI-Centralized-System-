// ============================================================
// Task Agent API Route — FR-002
// ============================================================
// POST /api/pipeline/tasks
// Body: { assignment: Assignment, rubric: RubricResult }
// Returns: PlanResult
//
// When WorkBuddy cloud-service is activated, replace mock-llm
// imports with real cloud.llm calls. The agent function signature
// stays the same — only the implementation in mock-llm.ts changes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callTaskAgent } from '@/lib/agents';
import type { Assignment, RubricResult } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assignment: Assignment = body.assignment;
    const rubric: RubricResult = body.rubric;

    if (!assignment) {
      return NextResponse.json(
        { error: 'Missing "assignment" in request body' },
        { status: 400 }
      );
    }

    if (!rubric) {
      return NextResponse.json(
        { error: 'Missing "rubric" in request body' },
        { status: 400 }
      );
    }

    const { data } = await callTaskAgent(assignment, rubric);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Task agent failed: ${message}` },
      { status: 500 }
    );
  }
}
