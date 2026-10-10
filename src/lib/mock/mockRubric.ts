import type { RubricResult } from '../../types/types';

/**
 * Mock Rubric Intelligence output.
 * Output of FR-001 — LLM parses rubricText → structured RubricResult.
 */
export const mockRubric: RubricResult = {
  assignmentId: 'asg-001',
  items: [
    {
      id: 'rub-001',
      criteria: 'User Research & Analysis',
      marks: 25,
      weightage: 25,
      mandatory: true,
      description:
        'Conduct at least 10 user interviews, identify 2+ personas, create task analysis flow diagrams, document pain points.',
      goodLevelRequirements: {
        description: '10+ interviews with detailed transcripts, 3+ personas with rich detail, comprehensive task analysis with flow diagrams, pain points mapped to design decisions.',
        estimatedHours: 8,
        keyDeliverables: ['10+ interview transcripts', '3+ personas', 'Task analysis flow diagrams', 'Pain point documentation'],
      },
      averageLevelRequirements: {
        description: '8-9 interviews, 2 personas, basic task analysis, pain points listed but not fully mapped.',
        estimatedHours: 5,
        keyDeliverables: ['8-9 interview transcripts', '2 personas', 'Basic task analysis'],
      },
      poorLevelRequirements: {
        description: 'Fewer than 8 interviews, 1 persona, incomplete task analysis, pain points missing.',
        estimatedHours: 3,
        keyDeliverables: ['<8 interviews', '1 persona'],
      },
    },
    {
      id: 'rub-002',
      criteria: 'Design & Wireframing',
      marks: 20,
      weightage: 20,
      mandatory: true,
      description:
        'Low-fidelity wireframes for all screens, information architecture map, consistent visual design language.',
      goodLevelRequirements: {
        description: 'Complete wireframes for all 6+ screens, detailed IA map with navigation logic, consistent design system with spacing/typography/color tokens.',
        estimatedHours: 7,
        keyDeliverables: ['Wireframes for all screens', 'IA map', 'Design system tokens'],
      },
      averageLevelRequirements: {
        description: 'Wireframes for 4-5 screens, basic IA map, some visual inconsistencies.',
        estimatedHours: 5,
        keyDeliverables: ['Wireframes for 4-5 screens', 'Basic IA map'],
      },
      poorLevelRequirements: {
        description: 'Wireframes for <4 screens, no IA map, inconsistent design.',
        estimatedHours: 3,
        keyDeliverables: ['<4 wireframes'],
      },
    },
    {
      id: 'rub-003',
      criteria: 'Prototype',
      marks: 20,
      weightage: 20,
      mandatory: true,
      description:
        'Clickable Figma prototype covering all core user flows with responsive interactive elements.',
      goodLevelRequirements: {
        description: 'Full clickable prototype with all core flows (browse, cart, checkout, tracking, profile), smooth transitions, form validation, error states.',
        estimatedHours: 10,
        keyDeliverables: ['All core user flows', 'Transitions and animations', 'Form validation', 'Error states'],
      },
      averageLevelRequirements: {
        description: 'Prototype with 3-4 core flows, basic transitions, some missing interactive elements.',
        estimatedHours: 7,
        keyDeliverables: ['3-4 core flows', 'Basic transitions'],
      },
      poorLevelRequirements: {
        description: 'Prototype with <3 flows, minimal interactivity, no transitions.',
        estimatedHours: 4,
        keyDeliverables: ['<3 flows'],
      },
    },
    {
      id: 'rub-004',
      criteria: 'Evaluation',
      marks: 15,
      weightage: 15,
      mandatory: false,
      description:
        'Usability testing with 3+ participants, SUS score or equivalent metric, iteration based on feedback.',
      goodLevelRequirements: {
        description: '5+ test participants, SUS score 75+, detailed feedback analysis, 3+ iterations based on findings.',
        estimatedHours: 6,
        keyDeliverables: ['5+ test sessions', 'SUS score 75+', 'Feedback analysis report', '3+ design iterations'],
      },
      averageLevelRequirements: {
        description: '3-4 test participants, SUS score 60-74, basic feedback summary, 1-2 iterations.',
        estimatedHours: 4,
        keyDeliverables: ['3-4 test sessions', 'SUS score 60-74', 'Basic feedback summary'],
      },
      poorLevelRequirements: {
        description: '<3 participants or no SUS score, minimal feedback, no iterations.',
        estimatedHours: 2,
        keyDeliverables: ['<3 test sessions'],
      },
    },
    {
      id: 'rub-005',
      criteria: 'Presentation',
      marks: 10,
      weightage: 10,
      mandatory: true,
      description: 'Clear structure, 15-min timing, all members present, Q&A handled well.',
      goodLevelRequirements: {
        description: 'Clear narrative arc, perfect 15-min timing, all members present with defined roles, confident Q&A with data-backed answers.',
        estimatedHours: 4,
        keyDeliverables: ['15-min presentation', 'All members present', 'Q&A preparation notes'],
      },
      averageLevelRequirements: {
        description: 'Adequate structure, 12-18 min timing, all members present, some Q&A hesitation.',
        estimatedHours: 3,
        keyDeliverables: ['12-18 min presentation', 'All members present'],
      },
      poorLevelRequirements: {
        description: 'Poor structure, timing off by 5+ min, missing members, weak Q&A.',
        estimatedHours: 2,
        keyDeliverables: ['Presentation draft'],
      },
    },
    {
      id: 'rub-006',
      criteria: 'Report Quality',
      marks: 10,
      weightage: 10,
      mandatory: false,
      description: 'Professional formatting, APA 7th citations, clear writing, no grammar errors.',
      goodLevelRequirements: {
        description: '3000+ words, professional formatting throughout, correct APA 7th citations, clear academic writing, zero grammar errors.',
        estimatedHours: 6,
        keyDeliverables: ['3000+ words', 'APA 7th citations', 'Professional formatting'],
      },
      averageLevelRequirements: {
        description: '2500-2999 words, mostly correct citations, adequate formatting, minor grammar issues.',
        estimatedHours: 4,
        keyDeliverables: ['2500-2999 words', 'Mostly correct citations'],
      },
      poorLevelRequirements: {
        description: '<2500 words, citation errors, poor formatting, multiple grammar errors.',
        estimatedHours: 2,
        keyDeliverables: ['<2500 words'],
      },
    },
  ],
  totalMarks: 100,
  parsedAt: '2026-10-10T10:30:00+08:00',
  rawExtractionConfidence: 0.92,
  warnings: [],
};
