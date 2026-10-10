import { create } from 'zustand';

export type ScreenId =
  | 'create' | 'team' | 'review' | 'analysis'
  | 'overview' | 'tasks' | 'rubric' | 'timeline'
  | 'defender' | 'activity' | 'states';

export type OverlayId =
  | null | 'drMember' | 'drTask'
  | 'mdReject' | 'mdOverride' | 'mdEdit';

export type RoleMode = 'lead' | 'mem';
export type FileState = 'ok' | 'empty' | 'type' | 'parse';
export type AnalysisMode = 'default' | 'fail' | 'norub';
export type TaskView = 'list' | 'board';
export type DefenderPhase = 'risk' | 'run' | 'result';
export type ProposalState = 'pending' | 'approved' | 'rejected';

interface ToastMsg { id: number; text: string; icon: string; }

interface MockupState {
  screen: ScreenId;
  role: RoleMode;
  overlay: OverlayId;
  fileState: FileState;
  analysisMode: AnalysisMode;
  taskView: TaskView;
  rubricInclude: boolean;
  defenderPhase: DefenderPhase;
  proposal2: ProposalState;
  memberHours: number[];
  taskAccepted: boolean;
  taskLocked: boolean;
  openAccordions: Set<number>;
  toasts: ToastMsg[];
  // actions
  go: (s: ScreenId) => void;
  setRole: (r: RoleMode) => void;
  openOverlay: (o: OverlayId) => void;
  closeOverlay: () => void;
  setFileState: (f: FileState) => void;
  setAnalysisMode: (m: AnalysisMode) => void;
  setTaskView: (v: TaskView) => void;
  setRubricInclude: (v: boolean) => void;
  setDefenderPhase: (p: DefenderPhase) => void;
  setProposal2: (p: ProposalState) => void;
  setMemberHours: (h: number[]) => void;
  setTaskAccepted: (v: boolean) => void;
  setTaskLocked: (v: boolean) => void;
  toggleAccordion: (i: number) => void;
  addToast: (text: string, icon?: string) => void;
  removeToast: (id: number) => void;
}

let toastId = 0;

export const useMockupStore = create<MockupState>((set, get) => ({
  screen: 'create',
  role: 'lead',
  overlay: null,
  fileState: 'ok',
  analysisMode: 'default',
  taskView: 'list',
  rubricInclude: true,
  defenderPhase: 'risk',
  proposal2: 'pending',
  memberHours: [2, 3, 0, 2, 4, 5, 3],
  taskAccepted: false,
  taskLocked: false,
  openAccordions: new Set([1, 4]),
  toasts: [],
  go: (s) => { set({ screen: s, overlay: null }); window.scrollTo(0, 0); if (s === 'defender') set({ defenderPhase: 'risk' }); },
  setRole: (r) => set({ role: r }),
  openOverlay: (o) => set({ overlay: o }),
  closeOverlay: () => set({ overlay: null }),
  setFileState: (f) => set({ fileState: f }),
  setAnalysisMode: (m) => set({ analysisMode: m }),
  setTaskView: (v) => set({ taskView: v }),
  setRubricInclude: (v) => set({ rubricInclude: v }),
  setDefenderPhase: (p) => set({ defenderPhase: p }),
  setProposal2: (p) => set({ proposal2: p }),
  setMemberHours: (h) => set({ memberHours: h }),
  setTaskAccepted: (v) => set({ taskAccepted: v }),
  setTaskLocked: (v) => set({ taskLocked: v }),
  toggleAccordion: (i) => {
    const acc = new Set(get().openAccordions);
    if (acc.has(i)) acc.delete(i); else acc.add(i);
    set({ openAccordions: acc });
  },
  addToast: (text, icon = 'ti-circle-check') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, text, icon }] });
    setTimeout(() => { set({ toasts: get().toasts.filter(t => t.id !== id) }); }, 3200);
  },
  removeToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));
