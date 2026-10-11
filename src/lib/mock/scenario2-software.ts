import type {
  Assignment,
  RubricResult,
  Member,
  Task,
  PlanResult,
  SkillMatchResult,
  CriticalPathResult,
  RiskAssessment,
  RescuePlan,
  ProjectProgress,
  DeadlineInfo,
  FullPipelineResult,
} from '../../types/types';

/**
 * ============================================================
 * Scenario 2 — Software Engineering Group Project
 * ============================================================
 * A "software" assignment type demo scenario.
 * Project: Build a food delivery mobile app with real-time tracking.
 *
 * This scenario demonstrates the PlanPilot AI pipeline on a
 * software-engineering project with a 5-person team, 12 tasks,
 * critical-path dependencies, risk detection, and a rescue plan.
 *
 * Contrast with Scenario 1 (mixed HCI project) to show the
 * system works across different assignment types.
 * ============================================================
 */

const now = '2026-10-10T10:00:00+08:00';

// ===== Assignment (Root Input) =====

const assignment: Assignment = {
  id: 'asg-002',
  title: 'CS3215 Software Engineering Group Project',
  course: 'CS3215 — Software Engineering',
  deliverables: [
    'Requirements Document (SRS)',
    'Design Document (SDD)',
    'Source Code (GitHub repo)',
    'Test Suite (unit + integration)',
    'Demo Video (5 min)',
    'User Manual',
  ],
  deadline: '2026-11-07T23:59:00+08:00',
  assignmentType: 'software',
  teamSize: 5,
  description:
    'Build a food delivery mobile app with real-time order tracking. ' +
    'The app must support user authentication, restaurant browsing, ' +
    'order placement, live courier tracking via WebSocket, and push ' +
    'notifications. Tech stack: React Native, Node.js, PostgreSQL, WebSocket.',
  rubricText: `
    Rubric — Total 100 marks

    1. Requirements Analysis (20 marks, mandatory)
       - Complete SRS document with functional and non-functional requirements
       - Use case diagrams for all major features
       - Requirements traced to implementation

    2. System Design (20 marks, mandatory)
       - Architecture diagram (MVC or layered)
       - Database schema with ER diagram
       - REST API specification with endpoints
       - Design decisions justified

    3. Implementation (25 marks, mandatory)
       - Working food delivery app with all core features
       - User authentication (login/register)
       - Restaurant browsing and search
       - Order placement and payment flow
       - Real-time order tracking via WebSocket
       - Code quality: readable, modular, documented

    4. Testing (15 marks)
       - Unit tests with adequate coverage (>60%)
       - Integration tests for key flows
       - Test report with results and known issues

    5. Demo (10 marks, mandatory)
       - Live demonstration of all features
       - 5-minute demo video
       - Handles edge cases gracefully

    6. Documentation (10 marks)
       - User manual with screenshots
       - Setup and deployment guide
       - API documentation
  `,
};

// ===== Rubric Result (FR-001 output) =====

const rubric: RubricResult = {
  assignmentId: 'asg-002',
  items: [
    {
      id: 's2-rub-01',
      criteria: 'Requirements Analysis',
      marks: 20,
      weightage: 20,
      mandatory: true,
      description:
        'Complete SRS document with functional and non-functional requirements, use case diagrams, and requirements traceability.',
    },
    {
      id: 's2-rub-02',
      criteria: 'System Design',
      marks: 20,
      weightage: 20,
      mandatory: true,
      description:
        'Architecture diagram (MVC), database schema with ER diagram, REST API specification, justified design decisions.',
    },
    {
      id: 's2-rub-03',
      criteria: 'Implementation',
      marks: 25,
      weightage: 25,
      mandatory: true,
      description:
        'Working food delivery app: authentication, restaurant browsing, order placement, real-time tracking via WebSocket. Code must be readable, modular, documented.',
    },
    {
      id: 's2-rub-04',
      criteria: 'Testing',
      marks: 15,
      weightage: 15,
      mandatory: false,
      description:
        'Unit tests (>60% coverage), integration tests for key flows, test report with results and known issues.',
    },
    {
      id: 's2-rub-05',
      criteria: 'Demo',
      marks: 10,
      weightage: 10,
      mandatory: true,
      description:
        'Live demonstration of all features, 5-minute demo video, graceful handling of edge cases.',
    },
    {
      id: 's2-rub-06',
      criteria: 'Documentation',
      marks: 10,
      weightage: 10,
      mandatory: false,
      description:
        'User manual with screenshots, setup and deployment guide, API documentation.',
    },
  ],
  totalMarks: 100,
  parsedAt: '2026-10-10T10:30:00+08:00',
  rawExtractionConfidence: 0.90,
  warnings: [],
};

// ===== Team Members =====

const members: Member[] = [
  {
    id: 's2-mem-01',
    name: 'Ethan Lee',
    avatar: '📱',
    skills: ['coding', 'design', 'analysis'],
    skillProficiency: {
      coding: 5,
      design: 3,
      analysis: 2,
      writing: 2,
      research: 2,
      presentation: 2,
      editing: 2,
      management: 2,
    },
    availability: 15,
    role: 'Frontend Developer',
    isLeader: false,
    currentTaskIds: ['s2-task-06', 's2-task-07'],
  },
  {
    id: 's2-mem-02',
    name: 'Felix Wu',
    avatar: '⚙️',
    skills: ['coding', 'analysis', 'management'],
    skillProficiency: {
      coding: 5,
      design: 2,
      analysis: 4,
      writing: 2,
      research: 2,
      presentation: 2,
      editing: 2,
      management: 3,
    },
    availability: 15,
    role: 'Backend Developer',
    isLeader: false,
    currentTaskIds: ['s2-task-03', 's2-task-04', 's2-task-05'],
  },
  {
    id: 's2-mem-03',
    name: 'Grace Tan',
    avatar: '🐞',
    skills: ['coding', 'analysis', 'writing'],
    skillProficiency: {
      coding: 3,
      design: 2,
      analysis: 5,
      writing: 4,
      research: 3,
      presentation: 2,
      editing: 3,
      management: 2,
    },
    availability: 12,
    role: 'QA / Testing Specialist',
    isLeader: false,
    currentTaskIds: ['s2-task-02', 's2-task-11'],
  },
  {
    id: 's2-mem-04',
    name: 'Helen Park',
    avatar: '🎨',
    skills: ['design', 'writing', 'presentation'],
    skillProficiency: {
      coding: 1,
      design: 5,
      analysis: 2,
      writing: 3,
      research: 2,
      presentation: 4,
      editing: 3,
      management: 2,
    },
    availability: 12,
    role: 'UI/UX Designer',
    isLeader: false,
    currentTaskIds: ['s2-task-12'],
  },
  {
    id: 's2-mem-05',
    name: 'Ivan Ong',
    avatar: '📋',
    skills: ['management', 'writing', 'presentation'],
    skillProficiency: {
      coding: 1,
      design: 2,
      analysis: 3,
      writing: 4,
      research: 3,
      presentation: 4,
      editing: 3,
      management: 5,
    },
    availability: 10,
    role: 'Project Manager',
    isLeader: true,
    currentTaskIds: ['s2-task-01'],
  },
];

// ===== Tasks (FR-002 output) =====

const tasks: Task[] = [
  {
    id: 's2-task-01',
    title: 'Requirements Gathering & Analysis',
    description:
      'Stakeholder interviews, competitive analysis of GrabFood/Foodpanda. Produce SRS document with functional and non-functional requirements, constraints, and assumptions.',
    requiredSkills: ['analysis', 'research', 'management'],
    estimatedHours: 8,
    complexity: 'medium',
    priority: 'critical',
    dependencies: [],
    relatedRubricIds: ['s2-rub-01'],
    status: 'done',
    assignedTo: 's2-mem-05',
    order: 1,
    createdAt: now,
    updatedAt: '2026-10-10T18:00:00+08:00',
    confirmed: false,
  },
  {
    id: 's2-task-02',
    title: 'Use Case Modeling',
    description:
      'Create use case diagrams for all major features: register/login, browse restaurants, place order, track delivery, rate order. Document actor-system interactions and edge cases.',
    requiredSkills: ['analysis', 'design'],
    estimatedHours: 6,
    complexity: 'medium',
    priority: 'critical',
    dependencies: ['s2-task-01'],
    relatedRubricIds: ['s2-rub-01'],
    status: 'done',
    assignedTo: 's2-mem-03',
    order: 2,
    createdAt: now,
    updatedAt: '2026-10-11T12:00:00+08:00',
    confirmed: false,
  },
  {
    id: 's2-task-03',
    title: 'Architecture Design (MVC)',
    description:
      'Define system architecture: MVC layers, client-server separation, technology stack justification. Create component diagram showing React Native frontend, Node.js backend, PostgreSQL database, and WebSocket gateway.',
    requiredSkills: ['analysis', 'coding', 'design'],
    estimatedHours: 8,
    complexity: 'high',
    priority: 'critical',
    dependencies: ['s2-task-02'],
    relatedRubricIds: ['s2-rub-02'],
    status: 'in-progress',
    assignedTo: 's2-mem-02',
    order: 3,
    createdAt: now,
    updatedAt: '2026-10-11T16:00:00+08:00',
    confirmed: false,
  },
  {
    id: 's2-task-04',
    title: 'Database Schema Design',
    description:
      'Design PostgreSQL schema: users, restaurants, menu_items, orders, order_items, couriers, deliveries, ratings. Create ER diagram with relationships, indexes, and constraints.',
    requiredSkills: ['coding', 'analysis'],
    estimatedHours: 6,
    complexity: 'medium',
    priority: 'high',
    dependencies: ['s2-task-03'],
    relatedRubricIds: ['s2-rub-02'],
    status: 'todo',
    assignedTo: 's2-mem-02',
    order: 4,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-05',
    title: 'API Design (REST)',
    description:
      'Design RESTful API specification: auth endpoints, restaurant CRUD, order lifecycle, courier location. Document request/response schemas, status codes, authentication strategy (JWT).',
    requiredSkills: ['coding', 'analysis'],
    estimatedHours: 6,
    complexity: 'medium',
    priority: 'high',
    dependencies: ['s2-task-03', 's2-task-04'],
    relatedRubricIds: ['s2-rub-02'],
    status: 'todo',
    assignedTo: 's2-mem-02',
    order: 5,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-06',
    title: 'Frontend: Home Screen',
    description:
      'Implement React Native home screen: restaurant carousel, search bar, category filters, location toggle. Wire up to restaurant API. Include loading states and error handling.',
    requiredSkills: ['coding', 'design'],
    estimatedHours: 8,
    complexity: 'medium',
    priority: 'critical',
    dependencies: ['s2-task-03', 's2-task-05'],
    relatedRubricIds: ['s2-rub-03'],
    status: 'todo',
    assignedTo: 's2-mem-01',
    order: 6,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-07',
    title: 'Frontend: Order Tracking Screen',
    description:
      'Implement real-time order tracking screen: live courier location on map, estimated arrival countdown, order status timeline. Connect to WebSocket for live updates.',
    requiredSkills: ['coding', 'design'],
    estimatedHours: 10,
    complexity: 'high',
    priority: 'critical',
    dependencies: ['s2-task-03', 's2-task-05', 's2-task-10'],
    relatedRubricIds: ['s2-rub-03'],
    status: 'todo',
    assignedTo: 's2-mem-01',
    order: 7,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-08',
    title: 'Backend: Auth Service',
    description:
      'Implement authentication microservice: register, login, JWT issuance, password hashing (bcrypt), middleware for protected routes. Integrate with users table.',
    requiredSkills: ['coding'],
    estimatedHours: 6,
    complexity: 'medium',
    priority: 'high',
    dependencies: ['s2-task-04', 's2-task-05'],
    relatedRubricIds: ['s2-rub-03'],
    status: 'todo',
    assignedTo: null,
    order: 8,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-09',
    title: 'Backend: Order Service',
    description:
      'Implement order microservice: create order, update status, calculate totals, assign courier. REST endpoints for order CRUD. Business logic for order lifecycle (pending → confirmed → preparing → dispatched → delivered).',
    requiredSkills: ['coding', 'analysis'],
    estimatedHours: 8,
    complexity: 'medium',
    priority: 'critical',
    dependencies: ['s2-task-04', 's2-task-05'],
    relatedRubricIds: ['s2-rub-03'],
    status: 'todo',
    assignedTo: null,
    order: 9,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-10',
    title: 'Backend: Real-time Tracking (WebSocket)',
    description:
      'Implement WebSocket server for live courier tracking: broadcast courier GPS coordinates to connected clients, manage connection lifecycle, handle reconnection. Integrate with order service for status updates.',
    requiredSkills: ['coding', 'analysis'],
    estimatedHours: 12,
    complexity: 'high',
    priority: 'critical',
    dependencies: ['s2-task-04', 's2-task-05'],
    relatedRubricIds: ['s2-rub-03'],
    status: 'todo',
    assignedTo: null,
    order: 10,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-11',
    title: 'Integration Testing',
    description:
      'Write and run integration tests for key flows: register → login → browse → order → track → deliver. Test API contracts, database transactions, WebSocket reconnection. Generate test coverage report (>60%).',
    requiredSkills: ['coding', 'analysis', 'writing'],
    estimatedHours: 8,
    complexity: 'high',
    priority: 'high',
    dependencies: ['s2-task-06', 's2-task-07', 's2-task-08', 's2-task-09', 's2-task-10'],
    relatedRubricIds: ['s2-rub-04'],
    status: 'todo',
    assignedTo: 's2-mem-03',
    order: 11,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
  {
    id: 's2-task-12',
    title: 'Demo Preparation & Documentation',
    description:
      'Record 5-minute demo video showcasing all features. Write user manual with screenshots. Create setup guide (docker-compose, env vars, seed data). Generate API docs from OpenAPI spec.',
    requiredSkills: ['presentation', 'writing', 'design'],
    estimatedHours: 6,
    complexity: 'medium',
    priority: 'medium',
    dependencies: ['s2-task-11'],
    relatedRubricIds: ['s2-rub-05', 's2-rub-06'],
    status: 'todo',
    assignedTo: 's2-mem-04',
    order: 12,
    createdAt: now,
    updatedAt: now,
    confirmed: false,
  },
];

// ===== Plan Result (FR-002) =====

const plan: PlanResult = {
  assignmentId: 'asg-002',
  tasks,
  criticalPath: [
    's2-task-01',
    's2-task-02',
    's2-task-03',
    's2-task-04',
    's2-task-05',
    's2-task-10',
    's2-task-07',
    's2-task-11',
    's2-task-12',
  ],
  totalEstimatedHours: 92,
  rubricCoverage: {
    coveredRubricIds: ['s2-rub-01', 's2-rub-02', 's2-rub-03', 's2-rub-04', 's2-rub-05', 's2-rub-06'],
    uncoveredRubricIds: [],
    totalMarks: 100,
    maxMarks: 100,
    coveragePercent: 100,
  },
  generatedAt: now,
};

// ===== Skill Match Result (FR-003) =====

const skillMatch: SkillMatchResult = {
  assignmentId: 'asg-002',
  assignments: [
    {
      taskId: 's2-task-01',
      memberId: 's2-mem-05',
      matchScore: 0.82,
      matchReason: 'Strong management (5/5) with analysis (3/5) and research (3/5), 10h available',
      assignedAt: now,
    },
    {
      taskId: 's2-task-02',
      memberId: 's2-mem-03',
      matchScore: 0.80,
      matchReason: 'Top analysis (5/5), design (2/5) for diagramming, available 12h/week',
      assignedAt: now,
    },
    {
      taskId: 's2-task-03',
      memberId: 's2-mem-02',
      matchScore: 0.93,
      matchReason: 'Coding (5/5), analysis (4/5), design (3/5) — ideal for architecture work',
      assignedAt: now,
    },
    {
      taskId: 's2-task-04',
      memberId: 's2-mem-02',
      matchScore: 0.92,
      matchReason: 'Coding (5/5) + analysis (4/5) for schema design',
      assignedAt: now,
    },
    {
      taskId: 's2-task-05',
      memberId: 's2-mem-02',
      matchScore: 0.92,
      matchReason: 'Coding (5/5) + analysis (4/5) for API specification',
      assignedAt: now,
    },
    {
      taskId: 's2-task-06',
      memberId: 's2-mem-01',
      matchScore: 0.85,
      matchReason: 'Coding (5/5) + design (3/5), 15h available for frontend work',
      assignedAt: now,
    },
    {
      taskId: 's2-task-07',
      memberId: 's2-mem-01',
      matchScore: 0.83,
      matchReason: 'Coding (5/5) + design (3/5) for tracking screen UI',
      assignedAt: now,
    },
    {
      taskId: 's2-task-11',
      memberId: 's2-mem-03',
      matchScore: 0.80,
      matchReason: 'Analysis (5/5), coding (3/5), writing (4/5) for test reports',
      assignedAt: now,
    },
    {
      taskId: 's2-task-12',
      memberId: 's2-mem-04',
      matchScore: 0.78,
      matchReason: 'Design (5/5) + presentation (4/5) + writing (3/5) for demo and docs',
      assignedAt: now,
    },
  ],
  unmatchedTaskIds: ['s2-task-08', 's2-task-09', 's2-task-10'],
  generatedAt: '2026-10-10T10:01:00+08:00',
};

// ===== Critical Path Result (FR-004) =====

const criticalPath: CriticalPathResult = {
  nodes: [
    { taskId: 's2-task-01', earlyStart: 0, earlyFinish: 8, lateStart: 0, lateFinish: 8, slack: 0, isCritical: true },
    { taskId: 's2-task-02', earlyStart: 8, earlyFinish: 14, lateStart: 8, lateFinish: 14, slack: 0, isCritical: true },
    { taskId: 's2-task-03', earlyStart: 14, earlyFinish: 22, lateStart: 14, lateFinish: 22, slack: 0, isCritical: true },
    { taskId: 's2-task-04', earlyStart: 22, earlyFinish: 28, lateStart: 22, lateFinish: 28, slack: 0, isCritical: true },
    { taskId: 's2-task-05', earlyStart: 28, earlyFinish: 34, lateStart: 28, lateFinish: 34, slack: 0, isCritical: true },
    { taskId: 's2-task-06', earlyStart: 34, earlyFinish: 42, lateStart: 48, lateFinish: 56, slack: 14, isCritical: false },
    { taskId: 's2-task-07', earlyStart: 46, earlyFinish: 56, lateStart: 46, lateFinish: 56, slack: 0, isCritical: true },
    { taskId: 's2-task-08', earlyStart: 34, earlyFinish: 40, lateStart: 50, lateFinish: 56, slack: 16, isCritical: false },
    { taskId: 's2-task-09', earlyStart: 34, earlyFinish: 42, lateStart: 48, lateFinish: 56, slack: 14, isCritical: false },
    { taskId: 's2-task-10', earlyStart: 34, earlyFinish: 46, lateStart: 34, lateFinish: 46, slack: 0, isCritical: true },
    { taskId: 's2-task-11', earlyStart: 56, earlyFinish: 64, lateStart: 56, lateFinish: 64, slack: 0, isCritical: true },
    { taskId: 's2-task-12', earlyStart: 64, earlyFinish: 70, lateStart: 64, lateFinish: 70, slack: 0, isCritical: true },
  ],
  criticalPath: [
    's2-task-01',
    's2-task-02',
    's2-task-03',
    's2-task-04',
    's2-task-05',
    's2-task-10',
    's2-task-07',
    's2-task-11',
    's2-task-12',
  ],
  projectDuration: 70,
  // Scheduler output — populated when calculateCriticalPathWithSchedule() is used
  schedule: [], predictedCompletionDay: 0, deadlineDay: 0,
  delayDays: 0, riskStatus: 'On Track', memberLoads: [],
  delayedTaskIds: [], hasCircularDependency: false,
};

// ===== Risk Assessment (FR-006) =====

const riskAssessment: RiskAssessment = {
  assignmentId: 'asg-002',
  flags: [
    {
      taskId: 's2-task-10',
      riskLevel: 'high',
      riskType: 'skill_gap',
      description:
        'Real-time tracking (WebSocket) is the most complex task (12h, high complexity) and is on the critical path with zero slack. No team member has prior WebSocket experience. The backend developer who would normally handle this is already assigned to tasks 03, 04, 05 (20h total).',
      recommendation:
        'Escalate to course staff for WebSocket guidance. Consider using Socket.io to reduce implementation complexity. Split server-side and client-side work between backend and frontend developers.',
      detectedAt: '2026-10-11T16:00:00+08:00',
    },
    {
      taskId: 's2-task-11',
      riskLevel: 'medium',
      riskType: 'dependency',
      description:
        'Integration testing depends on all 5 feature tasks (06, 07, 08, 09, 10) completing. Three of those (08, 09, 10) are currently unassigned. Any delay in any feature cascades directly to testing, which is on the critical path with zero slack.',
      recommendation:
        'Start writing test cases and building the test harness in parallel with feature development. Only test execution needs to wait for feature completion.',
      detectedAt: '2026-10-11T16:00:00+08:00',
    },
    {
      taskId: 's2-task-08',
      riskLevel: 'medium',
      riskType: 'overload',
      description:
        'Backend auth service is unassigned. The backend developer (s2-mem-02, Felix) is already assigned to architecture (03), DB schema (04), and API design (05) — 20h of work. With only 15h/week availability, he cannot also handle tasks 08, 09, and 10 (26h additional). No other member has coding proficiency above 3.',
      recommendation:
        'Reassign auth service (08) to the frontend developer (s2-mem-01, coding 5/5) after home screen (06) completes. Auth is self-contained and suitable for cross-training.',
      detectedAt: '2026-10-11T16:00:00+08:00',
    },
  ],
  overallRiskLevel: 'high',
  assessedAt: '2026-10-11T16:00:00+08:00',
};

// ===== Rescue Plan (FR-012) =====

const rescuePlan: RescuePlan = {
  assignmentId: 'asg-002',
  actions: [
    {
      id: 's2-res-01',
      taskId: 's2-task-10',
      actionType: 'escalate',
      description:
        'Escalate WebSocket complexity to course TA. Request a guidance session on Socket.io integration. Use Socket.io library instead of raw ws to reduce implementation complexity from ~12h to ~8h.',
      priority: 'critical',
      estimatedImpact: 'Reduces task-10 from 12h to ~8h, saves 4h on critical path',
      assignedTo: null,
    },
    {
      id: 's2-res-02',
      taskId: 's2-task-10',
      actionType: 'split',
      description:
        'Split real-time tracking into: (a) courier location data pipeline + WebSocket server (7h) assigned to backend dev (s2-mem-02), (b) client-side WebSocket integration + map rendering (5h) assigned to frontend dev (s2-mem-01) after task-06 completes. Both sub-tasks can proceed in parallel.',
      priority: 'critical',
      estimatedImpact: 'Parallelizes 5h of work, net saving ~5h on critical path',
      assignedTo: 's2-mem-01',
    },
    {
      id: 's2-res-03',
      taskId: 's2-task-11',
      actionType: 'reorder',
      description:
        'Reorder integration testing: start writing test cases and building the test harness (Jest + Supertest setup, mock data, API contract tests) immediately, in parallel with feature development. Only final execution waits for all features.',
      priority: 'high',
      estimatedImpact: 'Saves ~4h by front-loading test infrastructure work',
      assignedTo: 's2-mem-03',
    },
    {
      id: 's2-res-04',
      taskId: 's2-task-08',
      actionType: 'reassign',
      description:
        'Reassign auth service (task-08) to frontend developer (s2-mem-01, coding 5/5) after home screen (task-06) completes. Auth is self-contained (JWT + bcrypt) and does not depend on other backend services, making it suitable for cross-training.',
      priority: 'high',
      estimatedImpact: 'Reduces backend dev load by 6h, unblocks task-08 without new blocker',
      assignedTo: 's2-mem-01',
    },
  ],
  projectedRecovery:
    'After redistributing backend work and parallelizing test infrastructure, project is on track for deadline with ~6h buffer',
  confidence: 0.78,
  generatedAt: '2026-10-11T16:05:00+08:00',
};

// ===== Project Progress (FR-013) =====

const progress: ProjectProgress = {
  assignmentId: 'asg-002',
  overallCompletion: 20,
  taskProgress: [
    { taskId: 's2-task-01', completionPercent: 100, hoursSpent: 8, hoursRemaining: 0, lastUpdated: '2026-10-10T18:00:00+08:00' },
    { taskId: 's2-task-02', completionPercent: 100, hoursSpent: 6, hoursRemaining: 0, lastUpdated: '2026-10-11T12:00:00+08:00' },
    { taskId: 's2-task-03', completionPercent: 50, hoursSpent: 4, hoursRemaining: 4, lastUpdated: '2026-10-11T16:00:00+08:00' },
    { taskId: 's2-task-04', completionPercent: 0, hoursSpent: 0, hoursRemaining: 6, lastUpdated: now },
    { taskId: 's2-task-05', completionPercent: 0, hoursSpent: 0, hoursRemaining: 6, lastUpdated: now },
    { taskId: 's2-task-06', completionPercent: 0, hoursSpent: 0, hoursRemaining: 8, lastUpdated: now },
    { taskId: 's2-task-07', completionPercent: 0, hoursSpent: 0, hoursRemaining: 10, lastUpdated: now },
    { taskId: 's2-task-08', completionPercent: 0, hoursSpent: 0, hoursRemaining: 6, lastUpdated: now },
    { taskId: 's2-task-09', completionPercent: 0, hoursSpent: 0, hoursRemaining: 8, lastUpdated: now },
    { taskId: 's2-task-10', completionPercent: 0, hoursSpent: 0, hoursRemaining: 12, lastUpdated: now },
    { taskId: 's2-task-11', completionPercent: 0, hoursSpent: 0, hoursRemaining: 8, lastUpdated: now },
    { taskId: 's2-task-12', completionPercent: 0, hoursSpent: 0, hoursRemaining: 6, lastUpdated: now },
  ],
  tasksCompleted: 2,
  tasksTotal: 12,
  hoursSpent: 18,
  hoursTotal: 92,
  isOnTrack: true,
  updatedAt: '2026-10-11T16:00:00+08:00',
};

// ===== Deadline Info (FR-008) =====

const deadline: DeadlineInfo = {
  assignmentId: 'asg-002',
  deadline: '2026-11-07T23:59:00+08:00',
  daysRemaining: 28,
  hoursRemaining: 672,
  isOverdue: false,
  isUrgent: false,
};

// ===== Full Pipeline Result =====

/**
 * Scenario 2 — complete pipeline output for the software engineering project.
 * Import this to load the entire app state for the second demo scenario.
 */
export const scenario2: FullPipelineResult = {
  assignment,
  rubric,
  plan,
  members,
  skillMatch,
  criticalPath,
  riskAssessment,
  rescuePlan,
  progress,
  deadline,
};
