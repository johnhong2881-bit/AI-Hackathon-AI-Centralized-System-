import { create } from 'zustand';

export type ScreenId =
  | 'project' | 'create' | 'team' | 'review' | 'analysis'
  | 'overview' | 'tasks' | 'timeline' | 'defender';

export type OverlayId =
  | null | 'drMember' | 'drTask'
  | 'mdReject' | 'mdOverride' | 'mdEdit' | 'mdSave' | 'mdContrib';

export type RoleMode = 'lead' | 'mem';
export type FileState = 'ok' | 'empty' | 'type' | 'parse';
export type AnalysisMode = 'default';
export type TaskView = 'list' | 'board';
export type DefenderPhase = 'risk' | 'run' | 'result';
export type ProposalState = 'pending' | 'approved' | 'rejected';
export type ProgressSort = 'def' | 'low';

interface ToastMsg { id: number; text: string; icon: string; }

interface MockupState {
  screen: ScreenId;
  role: RoleMode;
  overlay: OverlayId;
  fileState: FileState;
  taskView: TaskView;
  defenderPhase: DefenderPhase;
  proposal2: ProposalState;
  taskAccepted: boolean;
  taskLocked: boolean;
  taskEditMode: boolean;
  defenderReason: number | null;
  defenderWho: string;
  expandedProgress: Set<number>;
  progressSort: ProgressSort;
  activeProjectId: string;
  toasts: ToastMsg[];
  // Pipeline state — tracks whether real API pipeline has run
  pipelineRan: boolean;
  pipelineRunning: boolean;
  pipelineError: string | null;
  selectedTaskId: string | null;
  pendingTaskEdit: {
    taskId: string;
    title: string;
    description: string;
    priority: string;
    targetDate: string;
    locked: boolean;
  } | null;
  defenderReasonText: string;
  editingMemberId: string | null;
  // Task progress overrides — tracks status/hours changes when no real plan exists
  taskOverrides: Record<string, { status: string; hours: number }>;
  // actions
  go: (s: ScreenId) => void;
  setRole: (r: RoleMode) => void;
  openOverlay: (o: OverlayId) => void;
  closeOverlay: () => void;
  setFileState: (f: FileState) => void;
  setTaskView: (v: TaskView) => void;
  setDefenderPhase: (p: DefenderPhase) => void;
  setProposal2: (p: ProposalState) => void;
  setTaskAccepted: (v: boolean) => void;
  setTaskLocked: (v: boolean) => void;
  setTaskEditMode: (v: boolean) => void;
  setDefenderReason: (r: number | null) => void;
  setDefenderWho: (w: string) => void;
  toggleProgress: (i: number) => void;
  setProgressSort: (s: ProgressSort) => void;
  setActiveProject: (id: string) => void;
  addToast: (text: string, icon?: string) => void;
  removeToast: (id: number) => void;
  setPipelineRan: (v: boolean) => void;
  setPipelineRunning: (v: boolean) => void;
  setPipelineError: (e: string | null) => void;
  setSelectedTaskId: (id: string | null) => void;
  setPendingTaskEdit: (data: MockupState['pendingTaskEdit']) => void;
  setDefenderReasonText: (s: string) => void;
  setEditingMemberId: (id: string | null) => void;
  setTaskOverride: (taskId: string, data: { status: string; hours: number }) => void;
}

let toastId = 0;

export const useMockupStore2 = create<MockupState>((set, get) => ({
  screen: 'project',
  role: 'lead',
  overlay: null,
  fileState: 'ok',
  taskView: 'list',
  defenderPhase: 'risk',
  proposal2: 'pending',
  taskAccepted: false,
  taskLocked: false,
  taskEditMode: false,
  defenderReason: null,
  defenderWho: 'Alice Tan',
  expandedProgress: new Set([0]),
  progressSort: 'def',
  activeProjectId: 'srs',
  toasts: [],
  pipelineRan: false,
  pipelineRunning: false,
  pipelineError: null,
  selectedTaskId: null,
  pendingTaskEdit: null,
  defenderReasonText: '',
  editingMemberId: null,
  taskOverrides: {},
  go: (s) => {
    set({ screen: s, overlay: null, taskEditMode: false });
    window.scrollTo(0, 0);
    if (s === 'defender') set({ defenderPhase: 'risk' });
  },
  setRole: (r) => set({ role: r }),
  openOverlay: (o) => set({ overlay: o }),
  closeOverlay: () => set({ overlay: null, taskEditMode: false, pendingTaskEdit: null }),
  setFileState: (f) => set({ fileState: f }),
  setTaskView: (v) => set({ taskView: v }),
  setDefenderPhase: (p) => set({ defenderPhase: p }),
  setProposal2: (p) => set({ proposal2: p }),
  setTaskAccepted: (v) => set({ taskAccepted: v }),
  setTaskLocked: (v) => set({ taskLocked: v }),
  setTaskEditMode: (v) => set({ taskEditMode: v }),
  setDefenderReason: (r) => set({ defenderReason: r }),
  setDefenderWho: (w) => set({ defenderWho: w }),
  toggleProgress: (i) => {
    const s = new Set(get().expandedProgress);
    if (s.has(i)) s.delete(i); else s.add(i);
    set({ expandedProgress: s });
  },
  setProgressSort: (s) => set({ progressSort: s }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  addToast: (text, icon = 'ti-circle-check') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, icon }] });
    setTimeout(() => { set({ toasts: get().toasts.filter(t => t.id !== id) }); }, 3200);
  },
  removeToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
  setPipelineRan: (v) => set({ pipelineRan: v }),
  setPipelineRunning: (v) => set({ pipelineRunning: v }),
  setPipelineError: (e) => set({ pipelineError: e }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setPendingTaskEdit: (data) => set({ pendingTaskEdit: data }),
  setDefenderReasonText: (s) => set({ defenderReasonText: s }),
  setEditingMemberId: (id) => set({ editingMemberId: id }),
  setTaskOverride: (taskId, data) => set({ taskOverrides: { ...get().taskOverrides, [taskId]: data } }),
}));
