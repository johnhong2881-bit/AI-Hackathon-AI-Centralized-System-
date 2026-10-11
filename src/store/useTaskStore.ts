import { create } from 'zustand';
import type {
  PlanPilotState,
  Assignment,
  RubricResult,
  PlanResult,
  Member,
  SkillMatchResult,
  CriticalPathResult,
  RiskAssessment,
  RescuePlan,
  ProjectProgress,
  DeadlineInfo,
  Task,
  TaskStatus,
} from '../types/types';
import {
  mockAssignment,
  mockRubric,
  mockPlanResult,
  mockMembers,
  mockSkillMatch,
  mockCriticalPath,
  mockRiskAssessment,
  mockRescuePlan,
  mockProgress,
  mockDeadline,
} from '../lib/mock';

// ===== Actions Interface =====

interface PlanPilotActions {
  // Pipeline setters (for when backend APIs return real data)
  setAssignment: (a: Assignment) => void;
  setRubric: (r: RubricResult) => void;
  setPlan: (p: PlanResult) => void;
  setMembers: (m: Member[]) => void;
  setSkillMatch: (s: SkillMatchResult) => void;
  setCriticalPath: (c: CriticalPathResult) => void;
  setRiskAssessment: (r: RiskAssessment) => void;
  setRescuePlan: (r: RescuePlan | null) => void;
  setProgress: (p: ProjectProgress) => void;
  setDeadline: (d: DeadlineInfo) => void;

  // Task operations (for Kanban board interactions)
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  selectTask: (taskId: string | null) => void;
  assignTask: (taskId: string, memberId: string | null) => void;

  // Loading state
  setLoading: (key: string, value: boolean) => void;

  // Reset
  loadMockData: () => void;
  reset: () => void;
}

type Store = PlanPilotState & PlanPilotActions;

// ===== Initial State (loaded with mock data for development) =====

const initialState: PlanPilotState = {
  assignment: mockAssignment,
  rubric: mockRubric,
  plan: mockPlanResult,
  members: mockMembers,
  skillMatch: mockSkillMatch,
  criticalPath: mockCriticalPath,
  riskAssessment: mockRiskAssessment,
  rescuePlan: mockRescuePlan,
  progress: mockProgress,
  deadline: mockDeadline,
  selectedTaskId: null,
  isLoading: {},
};

export const useTaskStore = create<Store>((set) => ({
  ...initialState,

  // Pipeline setters
  setAssignment: (assignment) => set({ assignment }),
  setRubric: (rubric) => set({ rubric }),
  setPlan: (plan) => set({ plan }),
  setMembers: (members) => set({ members }),
  setSkillMatch: (skillMatch) => set({ skillMatch }),
  setCriticalPath: (criticalPath) => set({ criticalPath }),
  setRiskAssessment: (riskAssessment) => set({ riskAssessment }),
  setRescuePlan: (rescuePlan) => set({ rescuePlan }),
  setProgress: (progress) => set({ progress }),
  setDeadline: (deadline) => set({ deadline }),

  // Task operations
  updateTaskStatus: (taskId, status) =>
    set((state) => {
      if (!state.plan) return state;
      const tasks = state.plan.tasks.map((t: Task) =>
        t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t,
      );
      return { plan: { ...state.plan, tasks } };
    }),

  selectTask: (selectedTaskId) => set({ selectedTaskId }),

  assignTask: (taskId, memberId) =>
    set((state) => {
      if (!state.plan) return state;
      const tasks = state.plan.tasks.map((t: Task) =>
        t.id === taskId ? { ...t, assignedTo: memberId } : t,
      );
      return { plan: { ...state.plan, tasks } };
    }),

  // Loading state
  setLoading: (key, value) =>
    set((state) => ({ isLoading: { ...state.isLoading, [key]: value } })),

  // Reset
  loadMockData: () => set({ ...initialState }),
  reset: () => set({
    assignment: null,
    rubric: null,
    plan: null,
    members: [],
    skillMatch: null,
    criticalPath: null,
    riskAssessment: null,
    rescuePlan: null,
    progress: null,
    deadline: null,
    selectedTaskId: null,
    isLoading: {},
  }),
}));
