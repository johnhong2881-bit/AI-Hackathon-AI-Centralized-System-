import type { Task, Member, MemberTaskAssignment } from '../../types/types';

function calculateMatchScore(task: Task, member: Member): number {
  if (task.requiredSkills.length === 0) return 0.5;
  const total = task.requiredSkills.reduce(
    (s, sk) => s + (member.skillProficiency[sk] ?? 0), 0
  );
  return total / (task.requiredSkills.length * 5);
}

function getMostRelevantProficiency(task: Task, member: Member): number {
  if (task.requiredSkills.length === 0) return 3;
  return Math.max(...task.requiredSkills.map(s => member.skillProficiency[s] ?? 0));
}

export function assignMultiMember(tasks: Task[], members: Member[]): Task[] {
  return tasks.map(task => {
    if (task.memberAssignments && task.memberAssignments.length > 0) {
      return task;
    }

    const needsMulti =
      task.complexity === 'high' || task.requiredSkills.length >= 2;
    if (!needsMulti) return task;

    const candidates = members
      .filter(m => !m.isLeader)
      .map(m => ({
        member: m,
        matchScore: calculateMatchScore(task, m),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const assignCount = Math.min(
      task.requiredSkills.length >= 3 ? 3 : 2,
      candidates.length
    );
    if (assignCount === 0) return task;

    const selected = candidates.slice(0, assignCount);

    const assignments: MemberTaskAssignment[] = selected.map((c, idx) => {
      const proficiency = getMostRelevantProficiency(task, c.member);
      const personalizedHours = Math.round(
        task.estimatedHours * (proficiency / 5) * 10
      ) / 10;

      return {
        memberId: c.member.id,
        estimatedHours: personalizedHours,
        matchScore: Math.round(c.matchScore * 100) / 100,
        role: idx === 0 ? 'Primary' : 'Support',
        invitationStatus: 'pending',
      };
    });

    return {
      ...task,
      assignedTo: assignments[0].memberId,
      memberAssignments: assignments,
    };
  });
}
