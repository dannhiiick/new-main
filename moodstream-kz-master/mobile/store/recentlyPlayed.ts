import { create } from 'zustand';
import type { TrackSummary } from '../lib/types';

const MAX = 20;

interface RecentlyPlayedState {
  tracks: TrackSummary[];
  add(track: TrackSummary): void;
  clear(): void;
}

export const useRecentlyPlayedStore = create<RecentlyPlayedState>((set) => ({
  tracks: [],
  add(track) {
    set(s => {
      const filtered = s.tracks.filter(t => t.id !== track.id);
      return { tracks: [track, ...filtered].slice(0, MAX) };
    });
  },
  clear() {
    set({ tracks: [] });
  },
}));
