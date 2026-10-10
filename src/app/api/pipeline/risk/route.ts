// ============================================================
// Risk Agent API Route — FR-006
// ============================================================
// POST /api/pipeline/risk
// Body: {
//   tasks: Task[],
//   members: Member[],
//   deadline: DeadlineInfo | null,
//   progress: ProjectProgress | null,
//   schedulerFacts?: { riskStatus, predictedCompletionDay, deadlineDay, delayDays, delayedTaskIds, criticalPath, memberLoads }
// }
// Returns: RiskAssessment
//
// The risk STATUS is computed by the scheduler (deterministic).
// The LLM only writes the plain-language explanation and flags.
// When SovernStack API key is set, real GPT-OSS 120B is used.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callRiskAgent } from '@/lib/agents';
import type { Task, Member, DeadlineInfo, ProjectProgress, RiskLevel } from '@/types/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tasks: Task[] = body.tasks;
    const members: Member[] = body.members;
    const deadline: DeadlineInfo | null = body.deadline ?? null;
    const progress: ProjectProgress | null = body.progress ?? null;
    const schedulerFacts = body.schedulerFacts ?? undefined;

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

    const { data } = await callRiskAgent(tasks, members, deadline, progress, schedulerFacts);

    // If schedulerFacts were provided, override LLM's overallRiskLevel with the computed status
    if (schedulerFacts) {
      const riskStatusMap: Record<string, RiskLevel> = {
        'Complete': 'none',
        'On Track': 'low',
        'At Risk': 'high',
        'Overdue': 'high',
      };
      data.overallRiskLevel = riskStatusMap[schedulerFacts.riskStatus] ?? 'low';
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Risk agent failed: ${message}` },
      { status: 500 }
    );
  }
}
