import * as FileSystem from 'expo-file-system/legacy';
import { create } from 'zustand';

import type { TrackSummary } from '../lib/types';

// Local directory where downloaded audio files are stored
export const OFFLINE_DIR = `${FileSystem.documentDirectory ?? ''}moodstream_offline/`;

export type DownloadState = 'idle' | 'downloading' | 'done' | 'error';

export interface OfflineEntry {
  trackId: string;
  /** Absolute local URI of the audio file */
  localUri: string;
  /** Download progress 0–1 */
  progress: number;
  state: DownloadState;
  /** File size in bytes, set when done */
  fileSizeBytes?: number;
  downloadedAt?: string;
  /** Track metadata stored at download time for offline display */
  track?: TrackSummary;
}

interface OfflineStore {
  /** Map of trackId → entry */
  entries: Record<string, OfflineEntry>;

  /** Returns true if the track is fully downloaded */
  isDownloaded(trackId: string): boolean;

  /** Returns download progress 0–1 (0 if not downloading) */
  getProgress(trackId: string): number;

  /** Internal: update an entry */
  _set(trackId: string, patch: Partial<OfflineEntry>): void;

  /** Remove an entry + delete the file */
  remove(trackId: string): Promise<void>;
}

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  entries: {},

  isDownloaded(trackId: string): boolean {
    return get().entries[trackId]?.state === 'done';
  },

  getProgress(trackId: string): number {
    const entry = get().entries[trackId];
    if (!entry) return 0;
    return entry.state === 'done' ? 1 : entry.progress;
  },

  _set(trackId: string, patch: Partial<OfflineEntry>) {
    set(state => ({
      entries: {
        ...state.entries,
        [trackId]: {
          ...(state.entries[trackId] ?? {
            trackId,
            localUri: '',
            progress: 0,
            state: 'idle' as DownloadState,
          }),
          ...patch,
        },
      },
    }));
  },

  async remove(trackId: string) {
    const entry = get().entries[trackId];
    if (entry?.localUri) {
      try {
        const info = await FileSystem.getInfoAsync(entry.localUri);
        if (info.exists) {
          await FileSystem.deleteAsync(entry.localUri, { idempotent: true });
        }
      } catch {
        // Ignore file system errors
      }
    }
    set(state => {
      const next = { ...state.entries };
      delete next[trackId];
      return { entries: next };
    });
  },
}));
