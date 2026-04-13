import { create } from 'zustand';
import type { CapabilityAction, FileFamily, FileInfo } from '@/lib/capability-registry';
import { detectFile } from '@/lib/capability-registry';

// ── Типы ──

export type WorkspaceState = 'idle' | 'file-loaded' | 'editing' | 'processing' | 'done' | 'error';

// Re-export для удобства
export type { CapabilityAction, FileFamily, FileInfo };
export type { ActionOption, ActionGroup, UiPanel } from '@/lib/capability-registry';

interface WorkspaceStore {
  state: WorkspaceState;
  file: File | null;
  fileInfo: FileInfo | null;
  imageUrl: string | null;
  selectedAction: CapabilityAction | null;
  options: Record<string, string>;
  jobId: string | null;
  errorMessage: string | null;

  // Convenience getters
  fileFamily: FileFamily;

  // Actions
  loadFile: (file: File) => void;
  selectAction: (action: CapabilityAction) => void;
  setOption: (key: string, value: string) => void;
  setOptions: (opts: Record<string, string>) => void;
  startProcessing: (jobId: string) => void;
  completeProcessing: () => void;
  failProcessing: (message: string) => void;
  backToActions: () => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  state: 'idle',
  file: null,
  fileInfo: null,
  imageUrl: null,
  selectedAction: null,
  options: {},
  jobId: null,
  errorMessage: null,
  fileFamily: 'other' as FileFamily,

  loadFile: (file) => {
    const old = get().imageUrl;
    if (old) URL.revokeObjectURL(old);

    const info = detectFile(file.name, file.type || undefined);
    const url = info.family === 'image' ? URL.createObjectURL(file) : null;

    set({
      state: 'file-loaded',
      file,
      fileInfo: info,
      fileFamily: info.family,
      imageUrl: url,
      selectedAction: null,
      options: {},
      jobId: null,
      errorMessage: null,
    });
  },

  selectAction: (action) => {
    const defaults: Record<string, string> = {};
    for (const opt of action.options) {
      defaults[opt.key] = opt.defaultValue;
    }
    set({ state: 'editing', selectedAction: action, options: defaults });
  },

  setOption: (key, value) => set({ options: { ...get().options, [key]: value } }),
  setOptions: (opts) => set({ options: opts }),

  startProcessing: (jobId) => set({ state: 'processing', jobId }),
  completeProcessing: () => set({ state: 'done' }),
  failProcessing: (message) => set({ state: 'error', errorMessage: message }),

  backToActions: () => set({
    state: 'file-loaded', selectedAction: null, options: {},
    jobId: null, errorMessage: null,
  }),

  reset: () => {
    const old = get().imageUrl;
    if (old) URL.revokeObjectURL(old);
    set({
      state: 'idle', file: null, fileInfo: null, fileFamily: 'other' as FileFamily,
      imageUrl: null, selectedAction: null, options: {},
      jobId: null, errorMessage: null,
    });
  },
}));
