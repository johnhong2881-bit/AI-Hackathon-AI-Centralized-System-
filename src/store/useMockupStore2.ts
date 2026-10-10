import { create } from 'zustand';

export type ScreenId =
  | 'project' | 'create' | 'team' | 'review' | 'analysis'
  | 'overview' | 'tasks' | 'timeline' | 'defender';

export type OverlayId =
  | null | 'drMember' | 'drTask'
  | 'mdReject' | 'mdOverride' | 'mdEdit' | 'mdSave';

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
  go: (s) => {
    set({ screen: s, overlay: null, taskEditMode: false });
    window.scrollTo(0, 0);
    if (s === 'defender') set({ defenderPhase: 'risk' });
  },
  setRole: (r) => set({ role: r }),
  openOverlay: (o) => set({ overlay: o }),
  closeOverlay: () => set({ overlay: null, taskEditMode: false }),
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
}));
