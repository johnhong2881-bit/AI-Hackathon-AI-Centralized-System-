import type { Assignment } from '../../types/types';

/**
 * Mock Assignment data.
 * This represents the root input to the TaskFlow AI pipeline.
 * FR-001 (Rubric Intelligence) consumes `rubricText`.
 */
export const mockAssignment: Assignment = {
  id: 'asg-001',
  title: 'CS3041 Human-Computer Interaction Group Project',
  course: 'CS3041 — Human-Computer Interaction',
  deliverables: [
    'Research Report (3000 words)',
    'Prototype Demo (Figma)',
    'Presentation Slides (15 min)',
    'Individual Reflection (500 words)',
  ],
  deadline: '2026-11-15T23:59:00+08:00',
  assignmentType: 'mixed',
  teamSize: 4,
  description:
    'Design and evaluate a user interface for a campus food ordering app. ' +
    'Conduct user research, create wireframes, build a clickable prototype, ' +
    'and present findings with supporting evidence.',
  rubricText: `
    Rubric — Total 100 marks

    1. User Research & Analysis (25 marks, mandatory)
       - Conducted at least 10 user interviews
       - Identified key user personas (at least 2)
       - Task analysis with flow diagrams
       - Pain points clearly documented

    2. Design & Wireframing (20 marks, mandatory)
       - Low-fidelity wireframes for all screens
       - Information architecture map
       - Consistent visual design language

    3. Prototype (20 marks, mandatory)
       - Clickable Figma prototype
       - Covers all core user flows
       - Interactive elements respond correctly

    4. Evaluation (15 marks)
       - Usability testing with 3+ participants
       - SUS score or equivalent metric
       - Iteration based on feedback

    5. Presentation (10 marks, mandatory)
       - Clear structure and timing (15 min)
       - All members present
       - Q&A handled well

    6. Report Quality (10 marks)
       - Professional formatting
       - Proper citations (APA 7th)
       - Clear writing, no grammar errors
  `,
};
