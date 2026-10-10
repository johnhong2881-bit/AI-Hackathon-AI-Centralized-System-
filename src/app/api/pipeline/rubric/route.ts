// ============================================================
// Rubric Agent API Route — FR-001
// ============================================================
// POST /api/pipeline/rubric
// Body: { assignment: Assignment }
// Returns: RubricResult
//
// When WorkBuddy cloud-service is activated, replace mock-llm
// imports with real cloud.llm calls. The agent function signature
// stays the same — only the implementation in mock-llm.ts changes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callRubricAgent } from '@/lib/agents';
import type { Assignment } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const assignment: Assignment = body.assignment;

    if (!assignment) {
      return NextResponse.json(
        { error: 'Missing "assignment" in request body' },
        { status: 400 }
      );
    }

    const { data } = await callRubricAgent(assignment);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Rubric agent failed: ${message}` },
      { status: 500 }
    );
  }
}
