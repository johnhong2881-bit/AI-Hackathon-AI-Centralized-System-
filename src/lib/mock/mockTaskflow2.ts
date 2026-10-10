// ===== TaskFlow AI Mockup2 Data =====
// All mock data for the TaskFlow AI UI mockup2 prototype

import type { Member, Skill } from '../../types/types';

export const AVC: Record<string, string> = { AT: 'av0', BL: 'av1', CN: 'av2', DC: 'av3', EW: 'av5', FA: 'av0', GL: 'av1', HS: 'av2', IK: 'av3', JW: 'av4' };

type MockMember = { k: string; n: string; lead?: number; sk: [string, number][]; wk: string[]; h: number[] };
export const MEM: MockMember[] = [
  { k: 'AT', n: 'Alice Tan', lead: 1, sk: [['Research', 3], ['Academic Writing', 2], ['Documentation', 2]], wk: ['Programming', 'Testing'], h: [2, 3, 0, 2, 4, 5, 3] },
  { k: 'BL', n: 'Bob Lee', sk: [['Documentation', 3], ['Testing', 2], ['Academic Writing', 2]], wk: ['UI/UX Design', 'Presentation'], h: [1, 1, 2, 1, 2, 3, 3] },
  { k: 'CN', n: 'Chloe Ng', sk: [['UI/UX Design', 3], ['Presentation', 3], ['Research', 1]], wk: ['Programming', 'Data Analysis'], h: [2, 2, 2, 2, 2, 3, 3] },
  { k: 'DC', n: 'David Chen', sk: [['Programming', 3], ['Data Analysis', 2], ['Testing', 3]], wk: ['Presentation', 'Academic Writing'], h: [3, 3, 3, 3, 3, 2, 2] },
];

export const SUGG = ['Research', 'Academic Writing', 'Programming', 'UI/UX Design', 'Data Analysis', 'Documentation', 'Testing', 'Presentation'];

export const LVN = ['', 'Beginner', 'Intermediate', 'Advanced'];
export const DN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SCR: [string, string, number][] = [
  ['project', 'Home', 0],
  ['create', 'Create', 1], ['team', 'Team', 1], ['review', 'Review', 1], ['analysis', 'AI analysis', 1],
  ['overview', 'Overview', 2], ['tasks', 'Tasks', 2], ['timeline', 'Timeline', 2], ['defender', 'AI Defender', 2],
];

export const GRP: Record<number, string> = { 0: '', 1: 'Create', 2: 'Workspace', 3: 'System' };

// Deadlines are relative to "today" = Oct 11 2026 (Sunday)
// At Risk: ~1 week left (Oct 18)
// On Track: ~1 month left (Nov 8)
// Completed: already done (Oct 5)
export const PROJECTS = [
  { id: 'srs', name: 'Software Requirements Specification', desc: 'Group SRS for a student library management system', status: 'dg', statusLabel: 'At Risk', members: 4, tasks: 10, done: 5, due: 'Sun 18 Oct', daysLeft: 7 },
  { id: 'web', name: 'Web Application Development', desc: 'Full-stack web app with React and Node.js', status: 'ok', statusLabel: 'On Track', members: 2, tasks: 4, done: 1, due: 'Sun 8 Nov', daysLeft: 28 },
  { id: 'data', name: 'Data Analysis Report', desc: 'Statistical analysis of survey data', status: 'ok', statusLabel: 'Completed', members: 2, tasks: 4, done: 4, due: 'Mon 5 Oct', daysLeft: 0 },
];

// Maps project ID → member keys that belong to that project
export const PROJECT_MEMBERS: Record<string, string[]> = {
  srs: ['AT', 'BL', 'CN', 'DC'],
  web: ['EW', 'FA'],
  data: ['GL', 'HS'],
};

export const FLOW = [
  { icon: 'ti-upload', title: 'Upload assignment', desc: 'PDF or paste text — the AI reads it instantly' },
  { icon: 'ti-users-plus', title: 'Add your team', desc: 'Skills, weaknesses, and weekly availability' },
  { icon: 'ti-sparkles', title: 'AI generates plan', desc: 'Tasks, deadlines, workload — in seconds' },
  { icon: 'ti-trophy', title: 'Track & optimize', desc: 'Monitor progress, maximize your marks' },
];

export const TABS: [string, string, string?][] = [
  ['overview', 'Overview'], ['tasks', 'Tasks'], ['timeline', 'Timeline'], ['defender', 'Project Rescue', '!'],
];

// Analysis stages: [title, subtitle, detail?, status?]
export type StageStatus = 'd' | 'w' | 'r' | 'p';
export const STG: [string, string, string?, string?][] = [
  ['Reading Assignment', 'Parsing the brief and rubric', '6 pages · 2,140 words read'],
  ['Extracting Rubric Criteria', 'Finding grading criteria and marks', '7 criteria · 30 marks'],
  ['Identifying Mandatory Requirements', 'Separating must-have from optional', '5 mandatory · 2 optional'],
  ['Breaking Down Project into Tasks', 'Turning requirements into actions', '15 tasks created'],
  ['Estimating Task Complexity', 'Estimating hours per task', '96 estimated hours'],
  ['Matching Team Skills', 'Matching tasks to skills and availability', '13 of 15 tasks match a member skill'],
  ['Building Project Timeline', 'Ordering tasks by dependency', 'Critical path found'],
  ['Checking Deadline Risks', 'Simulating the schedule day by day', 'Predicted finish Fri 6 Nov · at risk', 'w'],
  ['Validating Generated Plan', 'Checking for cycles and gaps', 'No cycles found'],
];

// Tasks: [id, title, desc, priority, hours, assignees, deps, date, status, late?]
export type TaskStatus = 'prog' | 'todo' | 'done';
export const TK: [number, string, string, string, number, string[], number, string, TaskStatus, string?][] = [
  [2, 'Gather requirements', 'Collect stakeholder needs into a requirement log', 'H', 6, ['AT', 'CN'], 1, 'Tue 13 Oct', 'done'],
  [3, 'Requirements Analysis', 'Functional and non-functional requirements', 'H', 10, ['AT', 'BL'], 1, 'Wed 14 Oct', 'done'],
  [4, 'Write introduction and scope', 'Purpose, audience, assumptions', 'M', 4, ['AT'], 1, 'Wed 14 Oct', 'done'],
  [5, 'Draw use case diagrams', 'Actors and use cases', 'H', 8, ['DC'], 1, 'Thu 22 Oct', 'prog'],
  [7, 'Design system architecture', 'Components, data flow, technology', 'H', 8, ['DC'], 1, 'Mon 26 Oct', 'todo'],
  [6, 'Class and sequence diagrams', 'UML models for core flows', 'H', 10, ['DC'], 1, 'Sat 24 Oct', 'todo'],
  [8, 'UI wireframes and prototype', 'Low-fidelity key screens', 'M', 8, ['CN'], 1, 'Mon 19 Oct', 'done'],
  [9, 'Test plan and test cases', 'Cases mapped to requirements', 'M', 8, ['BL'], 2, 'Sat 24 Oct', 'done'],
  [11, 'Compile SRS document', 'Merge all sections', 'M', 10, ['AT'], 4, 'Sat 31 Oct', 'todo', 'late'],
  [15, 'Final review and submission check', 'Check against the brief', 'H', 3, ['AT'], 3, 'Fri 6 Nov', 'todo', 'late'],
];

// Rubric marks per task: TK id → marks (total = 30)
export const RUBRIC_MARKS: Record<number, number> = {
  2: 3,   // Gather requirements
  3: 5,   // Requirements Analysis
  4: 2,   // Write introduction and scope
  5: 4,   // Draw use case diagrams
  6: 5,   // Class and sequence diagrams
  7: 4,   // Design system architecture
  8: 3,   // UI wireframes and prototype
  9: 2,   // Test plan and test cases
  11: 1,  // Compile SRS document
  15: 1,  // Final review and submission check
};
export const RUBRIC_TOTAL = 30;

// Per-member progress: [key, name, skills, totalHours, critical, tasks[]]
// tasks[]: [title, totalHours, remainingHours, status, pending?]
export type PgpTask = [string, number, number, TaskStatus, string?];
export type PgpMember = [string, string, string, number, number, PgpTask[]];
export const PGP: PgpMember[] = [
  ['AT', 'Alice Tan', 'Research, Writing', 49, 1, [
    ['Analyze assignment brief', 3, 0, 'done'], ['Gather requirements', 3, 0, 'done'], ['Requirements Analysis', 6, 0, 'done'],
    ['Write introduction and scope', 4, 0, 'done'], ['Compile SRS document', 10, 10, 'todo'], ['Referencing and formatting', 4, 4, 'todo'],
    ['Rehearse and finalize presentation', 2, 2, 'todo', 'p'], ['Final review and submission check', 3, 3, 'todo', 'p']]],
  ['BL', 'Bob Lee', 'Documentation, Testing', 33, 0, [
    ['Requirements Analysis', 4, 0, 'done'], ['Test plan and test cases', 8, 0, 'done'], ['Quality and risk plan', 4, 4, 'todo', 'p']]],
  ['CN', 'Chloe Ng', 'UI/UX, Presentation', 42, 0, [
    ['Gather requirements', 3, 0, 'done'], ['UI wireframes and prototype', 8, 0, 'done'],
    ['Prepare presentation slides', 6, 6, 'todo', 'p'], ['Rehearse and finalize presentation', 2, 2, 'todo', 'p']]],
  ['DC', 'David Chen', 'Programming, Testing', 53, 1, [
    ['Draw use case diagrams', 8, 5, 'prog'], ['Class and sequence diagrams', 10, 10, 'todo', 'p'], ['Design system architecture', 8, 8, 'todo', 'p']]],
  ['EW', 'Emma Wong', 'User research, Testing', 30, 0, [
    ['User testing', 8, 0, 'done'], ['Accessibility review', 4, 4, 'todo']]],
  ['FA', 'Farid Aziz', 'Data modelling, SQL', 28, 0, [
    ['Data model and ER diagram', 8, 8, 'todo'], ['API outline', 6, 6, 'todo', 'p']]],
  ['GL', 'Grace Lim', 'Research, Writing', 24, 0, [
    ['Competitor review', 6, 0, 'done'], ['Related work summary', 5, 0, 'done']]],
  ['HS', 'Hana Sato', 'QA, Accessibility', 22, 0, [
    ['Prototype usability checks', 5, 0, 'done'], ['Defect log', 3, 0, 'done']]],
  ['IK', 'Ivan Koh', 'Git, Documentation', 20, 0, [
    ['Version control and build setup', 4, 2, 'prog'], ['Release checklist', 3, 3, 'todo']]],
  ['JW', 'Jun Wei', 'Interviews, Editing', 20, 0, [
    ['Stakeholder interview notes', 5, 2, 'prog'], ['Glossary and definitions', 3, 3, 'todo']]],
];

// Gantt: [task, member, startDay, endDay, class?]
export const GT: [string, string, number, number, string?][] = [
  ['Gather requirements', 'AT', 0, 1, ''], ['Requirements Analysis', 'AT', 2, 4, ''],
  ['Write introduction and scope', 'AT', 1, 4, ''], ['UI wireframes and prototype', 'CN', 5, 7, ''],
  ['Draw use case diagrams', 'DC', 5, 8, ''], ['Class and sequence diagrams', 'DC', 9, 12, ''],
  ['Test plan and test cases', 'BL', 9, 12, ''], ['Design system architecture', 'DC', 8, 14, ''],
  ['Quality and risk plan', 'BL', 13, 14, ''], ['Prepare presentation slides', 'CN', 15, 17, ''],
  ['Compile SRS document', 'AT', 15, 19, 'late'], ['Referencing and formatting', 'AT', 20, 21, 'late'],
  ['Rehearse and finalize', 'CN', 22, 22, 'late'], ['Final review and submission', 'AT', 24, 25, 'late'],
];

// Defender logs: [stageIndex, icon, message, toolName, detail, flag?]
export const LOGS: [number, string, string, string, string, string?][] = [
  [0, 'ti-chart-line', 'Simulated the schedule day by day', 'schedule_simulator', 'Critical path: Requirements → Architecture → Compile SRS → Referencing → Rehearsal → Final review.'],
  [1, 'ti-route', 'Bottleneck: Compile SRS waits on 4 upstream tasks', 'dependency_graph', 'Alice has 0 h on Wednesdays, which stretches the tail.'],
  [2, 'ti-users', 'Checked spare capacity before the deadline', 'capacity_check', 'Chloe 23 h · Bob 17 h · David 27 h spare.'],
  [3, 'ti-arrows-exchange', 'Scored reallocations by skill fit and spare capacity', 'skill_matcher', 'Only unaccepted, unlocked work considered in attempt 1.'],
  [5, 'ti-sparkles', 'Attempt 1: move all 8 h of \u201CDesign system architecture\u201D to Chloe', 'plan_builder', 'Reason: Chloe has UI/UX Design (Advanced).'],
  [6, 'ti-flag', 'Checked that high-priority tasks still come first', 'priority_check', 'High-priority work keeps its place in the plan.'],
  [7, 'ti-x', 'Validation failed: ends Sun 1 Nov, 2 days late', 'schedule_simulator', 'Trying another approach.', 'f'],
  [4, 'ti-git-branch', 'Attempt 2: allow Compile SRS to start before diagrams finish', 'dependency_graph', 'Needs leader approval: it changes the planned order.'],
  [5, 'ti-sparkles', 'Attempt 2: split architecture 4 h David / 4 h Chloe', 'plan_builder', 'Safe change: the task is unaccepted and unlocked.'],
  [6, 'ti-flag', 'Re-checked task priorities', 'priority_check', 'No high-priority task was delayed or removed.'],
  [7, 'ti-check', 'Validation passed: ends Fri 30 Oct, on the deadline', 'schedule_simulator', 'Remaining risk: 0 days of buffer.', 'o'],
];

export const DST = [
  'Analyzing Remaining Time', 'Evaluating Task Difficulty', 'Scoring Mark Value per Task',
  'Ranking by Effort-to-Score Ratio', 'Identifying Quick Wins', 'Filtering Drop Candidates',
  'Generating Priority Plan', 'Validating Maximum Marks',
];

// Defender reasons: [icon, label]
export const REASONS: [string, string][] = [
  ['ti-hourglass', 'Not enough time to finish all tasks'],
  ['ti-user-off', 'A member is unavailable'],
  ['ti-gauge', 'A member is overloaded'],
  ['ti-puzzle', 'Skills don\u2019t match the task'],
  ['ti-calendar-event', 'Deadline moved earlier'],
  ['ti-dots', 'Other'],
];

// Rejection reasons
export const RJ_OPTS = ['Not Enough Time', 'Lack of Skills', 'Too Much Workload', 'Other'];

// ===== MEM → Member[] conversion (for API calls) =====
// Maps the UI mockup's skill names to the Skill type enum

const SKILL_MAP: Record<string, Skill> = {
  'Research': 'research',
  'Academic Writing': 'writing',
  'Documentation': 'editing',
  'Testing': 'management',
  'UI/UX Design': 'design',
  'Programming': 'coding',
  'Data Analysis': 'analysis',
  'Presentation': 'presentation',
};

const ALL_SKILLS: Skill[] = ['writing', 'research', 'design', 'coding', 'presentation', 'analysis', 'editing', 'management'];

export function memToMembers(): Member[] {
  return MEM.map((m, i) => {
    const skills: Skill[] = m.sk.map(s => SKILL_MAP[s[0]] || 'management');
    const proficiency = Math.min(5, Math.max(1, ...m.sk.map(s => s[1]))) >= 3 ? 5 : 3;
    const skillProficiency = {} as Record<Skill, number>;
    for (const sk of ALL_SKILLS) {
      const match = m.sk.find(s => SKILL_MAP[s[0]] === sk);
      skillProficiency[sk] = match ? Math.min(5, match[1] + 1) : 1;
    }
    const weeklyAvailability: NonNullable<Member['weeklyAvailability']> = {
      monday: m.h[0] || 0,
      tuesday: m.h[1] || 0,
      wednesday: m.h[2] || 0,
      thursday: m.h[3] || 0,
      friday: m.h[4] || 0,
      saturday: m.h[5] || 0,
      sunday: m.h[6] || 0,
    };
    return {
      id: `mem-${String(i + 1).padStart(3, '0')}`,
      name: m.n,
      avatar: m.k,
      skills,
      skillProficiency,
      availability: m.h.reduce((a, b) => a + b, 0),
      weeklyAvailability,
      role: m.lead ? 'Team Lead' : 'Member',
      isLeader: !!m.lead,
      currentTaskIds: [],
    };
  });
}

// ===== Per-project task derivation from PGP =====
// For SRS, returns the detailed TK array.
// For other projects (web, data), builds TK-format tuples from PGP member tasks.
export function getProjectTK(projectId: string): typeof TK {
  if (projectId === 'srs') return TK;
  const memberKeys = PROJECT_MEMBERS[projectId] || PROJECT_MEMBERS['srs'];
  const project = PROJECTS.find(p => p.id === projectId);
  const tasks: typeof TK = [];
  let id = 100;

  const dueDate = project?.due || 'Fri 30 Oct';
  const progDate = projectId === 'web' ? 'Wed 21 Oct' : dueDate;
  const todoDate = projectId === 'web' ? 'Sat 31 Oct' : dueDate;
  const pendDate = projectId === 'web' ? 'Fri 6 Nov' : dueDate;

  for (const key of memberKeys) {
    const pgpMember = PGP.find(p => p[0] === key);
    if (!pgpMember) continue;
    for (const t of pgpMember[5]) {
      const title = t[0];
      const totalHours = t[1];
      const status = t[3];
      const pending = t[4];

      // Skip duplicate titles — add member as co-assignee instead
      const existing = tasks.find(tk => tk[1] === title);
      if (existing) {
        if (!existing[5].includes(key)) existing[5].push(key);
        continue;
      }

      const date = status === 'done' ? dueDate : status === 'prog' ? progDate : pending === 'p' ? pendDate : todoDate;
      const priority = pending === 'p' || status === 'prog' ? 'H' : 'M';
      const isLate = pending === 'p' ? 'late' : undefined;

      tasks.push([
        id++,
        title,
        `${title} for ${project?.name || 'the project'}`,
        priority,
        totalHours,
        [key],
        1,
        date,
        status,
        isLate,
      ]);
    }
  }
  return tasks;
}

// ===== Per-project Gantt derivation from PGP =====
// For SRS, returns the detailed GT array.
// For other projects, builds GT-format tuples from PGP member tasks.
export function getProjectGT(projectId: string): typeof GT {
  if (projectId === 'srs') return GT;
  const memberKeys = PROJECT_MEMBERS[projectId] || PROJECT_MEMBERS['srs'];
  const result: typeof GT = [];

  for (const key of memberKeys) {
    const pgpMember = PGP.find(p => p[0] === key);
    if (!pgpMember) continue;
    let memberDay = 0;
    for (const t of pgpMember[5]) {
      const title = t[0];
      const totalHours = t[1];
      const status = t[3];
      const pending = t[4];
      const duration = Math.max(1, Math.ceil(totalHours / 4)); // ~4h per day
      const startDay = memberDay;
      const endDay = memberDay + duration - 1;
      memberDay = endDay + 1;
      const cls = pending === 'p' ? 'late' : '';
      result.push([title, key, startDay, endDay, cls]);
    }
  }
  return result;
}
