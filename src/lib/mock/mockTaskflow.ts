// ===== TaskFlow AI Mockup Data =====
// All mock data for the TaskFlow AI UI mockup prototype

export const AVC: Record<string, string> = { AT: 'av0', BL: 'av1', CN: 'av2', DC: 'av3' };

type Member = { k: string; n: string; lead?: number; sk: [string, number][]; h: number[] };
export const MEM: Member[] = [
  { k: 'AT', n: 'Alice Tan', lead: 1, sk: [['Research', 3], ['Academic Writing', 2], ['Documentation', 2]], h: [2, 3, 0, 2, 4, 5, 3] },
  { k: 'BL', n: 'Bob Lee', sk: [['Documentation', 3], ['Testing', 2], ['Academic Writing', 2]], h: [1, 1, 2, 1, 2, 3, 3] },
  { k: 'CN', n: 'Chloe Ng', sk: [['UI/UX Design', 3], ['Presentation', 3], ['Research', 1]], h: [2, 2, 2, 2, 2, 3, 3] },
  { k: 'DC', n: 'David Chen', sk: [['Programming', 3], ['Data Analysis', 2], ['Testing', 3]], h: [3, 3, 3, 3, 3, 2, 2] },
];

export const LVN = ['', 'Beginner', 'Intermediate', 'Advanced'];
export const DN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SCR: [string, string, number][] = [
  ['create', 'Create', 1], ['team', 'Team', 1], ['review', 'Review', 1], ['analysis', 'AI analysis', 1],
  ['overview', 'Overview', 2], ['tasks', 'Tasks', 2], ['rubric', 'Rubric', 2], ['timeline', 'Timeline', 2],
  ['defender', 'AI Defender', 2], ['activity', 'Activity', 2], ['states', 'UI states', 3],
];

export const GRP: Record<number, string> = { 1: 'Create', 2: 'Workspace', 3: 'System' };

export const TABS: [string, string, string?][] = [
  ['overview', 'Overview'], ['tasks', 'Tasks', '14'], ['rubric', 'Rubric', '1 gap'],
  ['timeline', 'Timeline'], ['defender', 'AI Defender', '!'], ['activity', 'Activity'],
];

// Analysis stages: [title, subtitle, status, detail]
export type StageStatus = 'd' | 'w' | 'r' | 'p' | 'f';
export const STG: [string, string, StageStatus, string][] = [
  ['Reading Assignment', 'Parsing the brief (6 pages)', 'd', '6 pages · 2,140 words read'],
  ['Extracting Rubric Criteria', 'Finding grading criteria and marks', 'd', '7 criteria · 30 marks'],
  ['Identifying Mandatory Requirements', 'Separating must-have from optional', 'w', '5 mandatory · 2 optional · 3 unclear items'],
  ['Breaking Down Project into Tasks', 'Turning requirements into actions', 'd', '15 tasks created'],
  ['Estimating Task Complexity', 'Estimating hours per task', 'd', '96 estimated hours'],
  ['Matching Team Skills', 'Matching tasks to skills and availability', 'd', '13 of 15 tasks match a member skill'],
  ['Building Project Timeline', 'Ordering tasks by dependency', 'd', 'Critical path found'],
  ['Checking Deadline Risks', 'Simulating the schedule day by day', 'r', 'Predicted finish Fri 6 Nov'],
  ['Validating Generated Plan', 'Checking for cycles and gaps', 'p', ''],
];

// Rubric criteria for analysis edit
export const RUB: [string, number, number, string][] = [
  ['Introduction and Scope', 3, 1, 'Purpose, scope and audience clearly stated · Assumptions and definitions listed'],
  ['Requirements Analysis', 4, 1, 'Complete functional requirements · Complete non-functional requirements · Clear descriptions'],
  ['Use Case and UML Modelling', 6, 1, ''], ['System Design', 5, 1, ''],
  ['Testing and Quality Plan', 4, 1, ''], ['Documentation and Formatting', 3, 0, ''],
  ['Presentation', 5, 0, ''],
];

// Overview load bars: [memberKey, remaining, available]
export const LOAD: [string, number, number][] = [
  ['AT', 28, 49], ['BL', 16, 33], ['CN', 19, 42], ['DC', 26, 53],
];

// Tasks: [id, title, desc, priority, hours, assignees, rubricCrit, deps, date, status, late?]
export type TaskStatus = 'prog' | 'todo' | 'done';
export const TK: [number, string, string, string, number, string[], string[], number, string, TaskStatus, string?][] = [
  [2, 'Gather requirements', 'Collect stakeholder needs into a requirement log', 'H', 6, ['AT', 'CN'], ['C2'], 1, 'Tue 13 Oct', 'prog'],
  [3, 'Requirements Analysis', 'Functional and non-functional requirements', 'H', 10, ['AT', 'BL'], ['C2'], 1, 'Wed 14 Oct', 'prog'],
  [4, 'Write introduction and scope', 'Purpose, audience, assumptions', 'M', 4, ['AT'], ['C1'], 1, 'Wed 14 Oct', 'todo'],
  [5, 'Draw use case diagrams', 'Actors and use cases', 'H', 8, ['DC'], ['C3'], 1, 'Thu 22 Oct', 'todo'],
  [7, 'Design system architecture', 'Components, data flow, technology', 'H', 8, ['DC'], ['C4'], 1, 'Mon 26 Oct', 'todo'],
  [6, 'Class and sequence diagrams', 'UML models for core flows', 'H', 10, ['DC'], ['C3'], 1, 'Sat 24 Oct', 'todo'],
  [8, 'UI wireframes and prototype', 'Low-fidelity key screens', 'M', 8, ['CN'], ['C4'], 1, 'Mon 19 Oct', 'todo'],
  [9, 'Test plan and test cases', 'Cases mapped to requirements', 'M', 8, ['BL'], ['C5'], 2, 'Sat 24 Oct', 'todo'],
  [11, 'Compile SRS document', 'Merge all sections', 'M', 10, ['AT'], ['C6'], 4, 'Sat 31 Oct', 'todo', 'late'],
  [15, 'Final review and submission check', 'Check against the brief', 'H', 3, ['AT'], ['C1', 'C6'], 3, 'Fri 6 Nov', 'todo', 'late'],
];

// Rubric details: [code, name, marks, mandatory, status, ...]
// Using a flexible type since arrays have variable lengths
export const RD: any[] = [
  ['C1', 'Introduction and Scope', 3, 1, 'Planned', 'tasks: Analyze brief ✓ · Write introduction',
    [['Purpose, scope and audience clearly stated', 1], ['Assumptions and definitions listed', 1]],
    ['Purpose and scope stated, audience or assumptions missing'],
    ['Introduction missing or unrelated'],
    ['Gather Requirements', 'Requirements Analysis', 'Write introduction and scope']],
  ['C2', 'Requirements Analysis', 4, 1, 'Planned', '',
    [['Complete functional requirements', 1], ['Complete non-functional requirements', 1], ['Clear descriptions with sufficient detail', 1]],
    ['Most functional requirements listed, non-functional partly covered'],
    ['Vague, incomplete or untestable requirements'],
    ['Gather Requirements', 'Requirements Analysis', 'Write introduction and scope']],
  ['C3', 'Use Case and UML Modelling', 6, 1, 'Planned'],
  ['C4', 'System Design', 5, 1, 'Planned'],
  ['C5', 'Testing and Quality Plan', 4, 1, 'Gap', null,
    [['Test cases cover each requirement', 1], ['Quality and risk plan included', 1], ['Traceability matrix from requirements to tests', 0]],
    ['Test cases exist but do not map to requirements'],
    ['No test planning'],
    ['Test plan and test cases', 'Quality and risk plan']],
  ['C6', 'Documentation and Formatting', 3, 0, 'Planned'],
  ['C7', 'Presentation', 5, 0, 'Planned'],
];

// Workload: [key, name, skills, remaining, available, tasks]
export const WL: [string, string, string, number, number, number, string[]][] = [
  ['AT', 'Alice Tan', 'Research · Writing · Docs', 19, 28, 49, ['Compile SRS', 'Final review', '+4']],
  ['BL', 'Bob Lee', 'Documentation · Testing', 13, 16, 33, ['Test plan', 'Quality plan']],
  ['CN', 'Chloe Ng', 'UI/UX · Presentation', 16, 19, 42, ['Wireframes', 'Slides', 'Rehearsal']],
  ['DC', 'David Chen', 'Programming · Testing', 19, 26, 53, ['Use cases', 'Diagrams', 'Architecture']],
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

// Activity log: [actor, iconClass, badgeClass, action, detail, status, time]
export const ACT: [string, string, string, string, string, string, string][] = [
  ['AI', 'ti-sparkles', 'b-ai', 'AI generated the project plan', '15 tasks · 96 h · 7 rubric criteria', 'Plan v1 ready', 'Today 09:02'],
  ['AI', 'ti-shield-check', 'b-ai', 'Deadline forecast calculated', 'Predicted completion Fri 6 Nov', 'At Risk', 'Today 09:02'],
  ['Leader', 'ti-user-check', 'b-blue', 'Alice accepted "Requirements Analysis"', '', 'Accepted', 'Today 09:20'],
  ['Member', 'ti-checks', 'b-ok', 'Bob updated remaining time on "Requirements Analysis"', 'Remaining 6 h → 4 h', 'Forecast recalculated', 'Today 10:41'],
  ['Leader', 'ti-lock', 'b-blue', 'Alice locked "Use case diagrams"', 'Locked tasks need approval before AI changes them', 'Locked', 'Today 11:05'],
];

// UI States: [icon, title, description, button, badgeClass]
export const STS: [string, string, string, string, string][] = [
  ['ti-folder-plus', 'Empty project', 'No projects yet. Create one or open the sample.', 'Create project', 'b-blue'],
  ['ti-file-upload', 'No document uploaded', 'Add the assignment PDF or paste its text to continue.', 'Upload PDF', 'b-blue'],
  ['ti-file-alert', 'Invalid file type', 'Only PDF files are supported.', 'Choose another file', 'b-dg'],
  ['ti-file-broken', 'Parsing error', 'The PDF looks scanned. Paste the text instead.', 'Paste text', 'b-dg'],
  ['ti-target-off', 'Missing rubric', 'No rubric found. The AI inferred starter criteria.', 'Review criteria', 'b-wn'],
  ['ti-users', 'No team members', 'Add at least one member to generate a plan.', 'Add member', 'b-blue'],
  ['ti-clock-off', 'Member with no availability', 'Alice has 0 hours this week and can\'t be assigned work.', 'Edit availability', 'b-wn'],
  ['ti-alert-circle', 'Incomplete team setup', '2 members are missing skills.', 'Fix team', 'b-wn'],
  ['ti-loader-2', 'AI analysis loading', 'Step 4 of 9: Breaking down the project.', 'View progress', 'b-blue'],
  ['ti-cloud-off', 'AI analysis failed', 'Couldn\'t read the rubric table.', 'Retry or add manually', 'b-dg'],
  ['ti-shield-check', 'No deadline risk', 'Predicted finish Wed 28 Oct, 2 days of buffer.', 'View timeline', 'b-ok'],
  ['ti-shield-bolt', 'Rescue in progress', 'Checking team capacity…', 'Watch agent', 'b-blue'],
  ['ti-hand-stop', 'Approval required', '1 change affects accepted work.', 'Review change', 'b-wn'],
  ['ti-circle-check', 'Rescue validated', 'New plan meets the deadline.', 'Apply plan', 'b-ok'],
  ['ti-alert-triangle', 'Risk unresolved', 'No feasible plan without cutting scope.', 'See options', 'b-dg'],
  ['ti-user-check', 'Task accepted', 'Bob accepted "Test plan".', 'Open task', 'b-ok'],
  ['ti-user-x', 'Task rejected', 'Chloe rejected "Slides": Not enough time.', 'Reassign', 'b-wn'],
  ['ti-arrows-exchange', 'Task reassigned', '"Slides" moved to Bob.', 'Undo', 'b-blue'],
  ['ti-lock', 'Locked task', 'AI needs approval to change this task.', 'Unlock', 'b-wn'],
  ['ti-user-search', 'No suitable member', 'Nobody has the Testing skill with spare time.', 'Reassign task', 'b-wn'],
  ['ti-circle-check', 'All tasks done', 'Every task is complete. Review against rubric.', 'Final review', 'b-ok'],
  ['ti-flag', 'Project submitted', 'Final deliverable submitted on time.', 'View report', 'b-ok'],
];

// Defender logs: [stageIndex, icon, message, toolName, detail, flag?]
export const LOGS: [number, string, string, string, string, string?][] = [
  [0, 'ti-chart-line', 'Simulated the schedule day by day', 'schedule_simulator', 'Critical path: Requirements → Diagrams → Compile SRS → Referencing → Final review.'],
  [1, 'ti-route', 'Bottleneck: Compile SRS waits on 4 upstream tasks', 'dependency_graph', 'Alice has 0 h on Wednesdays, which stretches the tail.'],
  [2, 'ti-users', 'Checked spare capacity before the deadline', 'capacity_check', 'Chloe 23 h · Bob 17 h · David 27 h spare.'],
  [3, 'ti-arrows-exchange', 'Scored reallocations by skill fit and spare capacity', 'skill_matcher', 'Only unaccepted, unlocked work considered in attempt 1.'],
  [5, 'ti-sparkles', 'Attempt 1: move all 8 h of "Design system architecture" to Chloe', 'plan_builder', 'Reason: Chloe has UI/UX Design (Advanced).'],
  [6, 'ti-target', 'Checked mandatory rubric criteria are still covered', 'rubric_validator', 'All 5 mandatory criteria keep tasks. Known gap: traceability matrix.'],
  [7, 'ti-x', 'Validation failed: ends Sun 1 Nov, 2 days late', 'schedule_simulator', 'Trying another approach.', 'f'],
  [4, 'ti-git-branch', 'Attempt 2: allow Compile SRS to start before diagrams finish', 'dependency_graph', 'Needs leader approval: it changes the planned order.'],
  [5, 'ti-sparkles', 'Attempt 2: split architecture 4 h David / 4 h Chloe', 'plan_builder', 'Safe change: the task is unaccepted and unlocked.'],
  [6, 'ti-target', 'Re-validated rubric coverage', 'rubric_validator', 'No mandatory requirement removed.'],
  [7, 'ti-check', 'Validation passed: ends Fri 30 Oct, on the deadline', 'schedule_simulator', 'Remaining risk: 0 days of buffer.', 'o'],
];

export const DST = [
  'Analyzing Deadline Risks', 'Identifying Bottlenecks', 'Checking Available Team Capacity',
  'Evaluating Reallocation Opportunities', 'Optimizing Task Dependencies', 'Generating a Recovery Plan',
  'Validating Rubric Coverage', 'Validating Deadline Feasibility',
];

// Rejection reasons
export const RJ_OPTS = ['Not Enough Time', 'Lack of Skills', 'Too Much Workload', 'Other'];
