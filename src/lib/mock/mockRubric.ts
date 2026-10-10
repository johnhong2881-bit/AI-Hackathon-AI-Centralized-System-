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
    },
    {
      id: 'rub-002',
      criteria: 'Design & Wireframing',
      marks: 20,
      weightage: 20,
      mandatory: true,
      description:
        'Low-fidelity wireframes for all screens, information architecture map, consistent visual design language.',
    },
    {
      id: 'rub-003',
      criteria: 'Prototype',
      marks: 20,
      weightage: 20,
      mandatory: true,
      description:
        'Clickable Figma prototype covering all core user flows with responsive interactive elements.',
    },
    {
      id: 'rub-004',
      criteria: 'Evaluation',
      marks: 15,
      weightage: 15,
      mandatory: false,
      description:
        'Usability testing with 3+ participants, SUS score or equivalent metric, iteration based on feedback.',
    },
    {
      id: 'rub-005',
      criteria: 'Presentation',
      marks: 10,
      weightage: 10,
      mandatory: true,
      description: 'Clear structure, 15-min timing, all members present, Q&A handled well.',
    },
    {
      id: 'rub-006',
      criteria: 'Report Quality',
      marks: 10,
      weightage: 10,
      mandatory: false,
      description: 'Professional formatting, APA 7th citations, clear writing, no grammar errors.',
    },
  ],
  totalMarks: 100,
  parsedAt: '2026-10-10T10:30:00+08:00',
  rawExtractionConfidence: 0.92,
  warnings: [],
};
