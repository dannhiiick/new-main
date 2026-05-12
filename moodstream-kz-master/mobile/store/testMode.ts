import { create } from 'zustand';
import { apiPost, apiGet } from '../lib/api';

interface TestSession {
  id: string;
  createdAt: string;
  interactionCount: number;
  _count?: { interactions: number };
}

interface TestModeState {
  active: boolean;
  session: TestSession | null;
  loading: boolean;

  start(): Promise<void>;
  end(keep: boolean): Promise<{ transferredCount: number }>;
  check(): Promise<void>;
  interact(trackId: string, action: 'LIKE' | 'SKIP' | 'PLAY' | 'UNLIKE'): Promise<void>;
  reset(): void;
}

export const useTestMode = create<TestModeState>((set, get) => ({
  active: false,
  session: null,
  loading: false,

  async start() {
    set({ loading: true });
    try {
      const session = await apiPost<TestSession>('/api/v1/test-mode/start', {});
      set({ active: true, session, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async end(keep: boolean) {
    set({ loading: true });
    try {
      const result = await apiPost<{ transferredLikes: number }>(
        '/api/v1/test-mode/end',
        { action: keep ? 'keep' : 'discard' },
      );
      set({ active: false, session: null, loading: false });
      return { transferredCount: result.transferredLikes };
    } catch {
      set({ loading: false });
      return { transferredCount: 0 };
    }
  },

  async check() {
    try {
      const data = await apiGet<TestSession>('/api/v1/test-mode/current');
      set({ active: true, session: data });
    } catch {
      // 404 means no active session — that's fine
      set({ active: false, session: null });
    }
  },

  async interact(trackId: string, action: 'LIKE' | 'SKIP' | 'PLAY' | 'UNLIKE') {
    const { active } = get();
    if (!active) return;
    try {
      await apiPost('/api/v1/test-mode/interact', { trackId, action });
    } catch {
      // silent fire-and-forget
    }
  },

  reset() {
    set({ active: false, session: null, loading: false });
  },
}));
