import { create } from 'zustand';
import type { CapabilityAction, FileFamily, FileInfo } from '@/lib/capability-registry';
import { detectFile, getActionById } from '@/lib/capability-registry';

// ── Типы ──

export type WorkspaceState = 'idle' | 'file-loaded' | 'editing' | 'processing' | 'done' | 'error';

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
  fileFamily: FileFamily;
  _hydrated: boolean;

  loadFile: (file: File) => void;
  selectAction: (action: CapabilityAction) => void;
  setOption: (key: string, value: string) => void;
  setOptions: (opts: Record<string, string>) => void;
  startProcessing: (jobId: string) => void;
  completeProcessing: () => void;
  failProcessing: (message: string) => void;
  backToActions: () => void;
  reset: () => void;
  _hydrate: () => Promise<void>;
}

// ── IndexedDB helpers for File persistence ──
const DB_NAME = 'fw-session';
const STORE_NAME = 'files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveFileToIDB(file: File): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(file, 'current-file');
  return new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(); });
}

async function loadFileFromIDB(): Promise<File | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const req = tx.objectStore(STORE_NAME).get('current-file');
  return new Promise((resolve) => { req.onsuccess = () => resolve(req.result || null); req.onerror = () => resolve(null); });
}

async function clearFileFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('current-file');
  } catch { /* ignore */ }
}

// ── SessionStorage helpers for metadata ──
const SESSION_KEY = 'fw-workspace';

interface SessionData {
  state: WorkspaceState;
  actionId: string | null;
  options: Record<string, string>;
  jobId: string | null;
  errorMessage: string | null;
}

function saveSession(data: SessionData) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function loadSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ── Store ──

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
  _hydrated: false,

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

    // Persist
    saveFileToIDB(file).catch(() => {});
    saveSession({ state: 'file-loaded', actionId: null, options: {}, jobId: null, errorMessage: null });
  },

  selectAction: (action) => {
    const defaults: Record<string, string> = {};
    for (const opt of action.options) {
      defaults[opt.key] = opt.defaultValue;
    }
    set({ state: 'editing', selectedAction: action, options: defaults });
    saveSession({ state: 'editing', actionId: action.id, options: defaults, jobId: get().jobId, errorMessage: null });
  },

  setOption: (key, value) => {
    const newOpts = { ...get().options, [key]: value };
    set({ options: newOpts });
    const s = get();
    saveSession({ state: s.state, actionId: s.selectedAction?.id || null, options: newOpts, jobId: s.jobId, errorMessage: s.errorMessage });
  },

  setOptions: (opts) => {
    set({ options: opts });
    const s = get();
    saveSession({ state: s.state, actionId: s.selectedAction?.id || null, options: opts, jobId: s.jobId, errorMessage: s.errorMessage });
  },

  startProcessing: (jobId) => {
    set({ state: 'processing', jobId });
    const s = get();
    saveSession({ state: 'processing', actionId: s.selectedAction?.id || null, options: s.options, jobId, errorMessage: null });
  },

  completeProcessing: () => {
    set({ state: 'done' });
    const s = get();
    saveSession({ state: 'done', actionId: s.selectedAction?.id || null, options: s.options, jobId: s.jobId, errorMessage: null });
  },

  failProcessing: (message) => {
    set({ state: 'error', errorMessage: message });
    const s = get();
    saveSession({ state: 'error', actionId: s.selectedAction?.id || null, options: s.options, jobId: s.jobId, errorMessage: message });
  },

  backToActions: () => {
    set({ state: 'file-loaded', selectedAction: null, options: {}, jobId: null, errorMessage: null });
    saveSession({ state: 'file-loaded', actionId: null, options: {}, jobId: null, errorMessage: null });
  },

  reset: () => {
    const old = get().imageUrl;
    if (old) URL.revokeObjectURL(old);
    set({
      state: 'idle', file: null, fileInfo: null, fileFamily: 'other' as FileFamily,
      imageUrl: null, selectedAction: null, options: {},
      jobId: null, errorMessage: null,
    });
    clearSession();
    clearFileFromIDB();
  },

  _hydrate: async () => {
    if (get()._hydrated) return;
    try {
      const session = loadSession();
      if (!session || session.state === 'idle') { set({ _hydrated: true }); return; }

      const file = await loadFileFromIDB();
      if (!file) { clearSession(); set({ _hydrated: true }); return; }

      const info = detectFile(file.name, file.type || undefined);
      const url = info.family === 'image' ? URL.createObjectURL(file) : null;

      // Restore action if was editing
      let action: CapabilityAction | null = null;
      if (session.actionId) {
        action = getActionById(session.actionId) || null;
      }

      // Don't restore processing/done/error — go back to editing or file-loaded
      let restoredState = session.state;
      if (restoredState === 'processing' || restoredState === 'done' || restoredState === 'error') {
        restoredState = action ? 'editing' : 'file-loaded';
      }

      set({
        state: restoredState,
        file,
        fileInfo: info,
        fileFamily: info.family,
        imageUrl: url,
        selectedAction: action,
        options: session.options || {},
        jobId: null,
        errorMessage: null,
        _hydrated: true,
      });
    } catch {
      clearSession();
      clearFileFromIDB();
      set({ _hydrated: true });
    }
  },
}));
