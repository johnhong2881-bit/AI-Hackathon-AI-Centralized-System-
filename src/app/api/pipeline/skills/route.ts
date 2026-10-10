// ============================================================
// Skill Agent API Route — FR-003
// ============================================================
// POST /api/pipeline/skills
// Body: { tasks: Task[], members: Member[] }
// Returns: SkillMatchResult
//
// When WorkBuddy cloud-service is activated, replace mock-llm
// imports with real cloud.llm calls. The agent function signature
// stays the same — only the implementation in mock-llm.ts changes.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callSkillAgent } from '@/lib/agents';
import type { Task, Member } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;
    const members: Member[] = body.members;

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

    const { data } = await callSkillAgent(tasks, members);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Skill agent failed: ${message}` },
      { status: 500 }
    );
  }
}
