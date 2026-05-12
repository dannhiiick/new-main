import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  State,
} from 'react-native-track-player';
import { create } from 'zustand';

import { API_URL, apiGet, apiPost } from '../lib/api';
import type { TrackSummary } from '../lib/types';

export { RepeatMode } from 'react-native-track-player';

function logPlayEvent(trackId: string, completionPct?: number): void {
  void apiPost('/api/v1/player/events', {
    trackId,
    ...(completionPct !== undefined ? { completionPct } : {}),
    territory: 'KZ',
    locale: 'ru',
  }).catch(() => {
    // Best-effort — silently ignore
  });
}

function toRNTPTrack(track: TrackSummary, resolvedUrl?: string) {
  return {
    id: track.id,
    url: resolvedUrl ?? `${API_URL}/api/v1/stream/${track.id}`,
    title: track.title,
    artist: track.artists.map((a) => a.name).join(', '),
    ...(track.coverUrl != null ? { artwork: track.coverUrl } : {}),
    duration: track.durationMs / 1000,
  };
}

// Fetch presigned URL so RNTP doesn't need to carry auth headers
async function resolveStreamUrl(trackId: string): Promise<string> {
  try {
    const data = await apiGet<{ url: string }>(`/api/v1/catalog/tracks/${trackId}/stream-url`);
    return data.url;
  } catch {
    // Fallback: direct stream (may fail without auth headers, but keeps shape)
    return `${API_URL}/api/v1/stream/${trackId}`;
  }
}

let playerSetup = false;

export async function setupPlayer(): Promise<void> {
  if (playerSetup) return;
  try {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      progressUpdateEventInterval: 500,
    });
  } catch {
    // Player may already be set up (hot reload / fast refresh)
  }
  playerSetup = true;
}

interface PlayerState {
  queue: TrackSummary[];
  currentIndex: number;
  currentTrack: TrackSummary | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  shuffle: boolean;
  repeatMode: RepeatMode;
  error: string | null;

  playTrack(track: TrackSummary, queue?: TrackSummary[]): Promise<void>;
  addToQueue(track: TrackSummary): Promise<void>;
  pauseResume(): Promise<void>;
  seekTo(positionMs: number): Promise<void>;
  playNext(): Promise<void>;
  playPrev(): Promise<void>;
  toggleShuffle(): Promise<void>;
  toggleRepeat(): Promise<void>;
  clearError(): void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  positionMs: 0,
  durationMs: 0,
  shuffle: false,
  repeatMode: RepeatMode.Off,
  error: null,

  async playTrack(track, queue?) {
    if (track.playbackStatus !== 'PLAYABLE') {
      set({ error: track.playbackStatus });
      return;
    }

    // Track recently played (lazy import avoids circular dep)
    import('./recentlyPlayed').then(({ useRecentlyPlayedStore }) => {
      useRecentlyPlayedStore.getState().add(track);
    }).catch(() => {});

    const newQueue = queue ?? [track];
    const idx = newQueue.findIndex((t) => t.id === track.id);
    const trackIndex = idx >= 0 ? idx : 0;

    set({
      queue: newQueue,
      currentIndex: trackIndex,
      currentTrack: track,
      isLoading: true,
      error: null,
      positionMs: 0,
      durationMs: track.durationMs,
    });

    try {
      // Resolve only current track URL — start playback immediately.
      // Queue navigation (next/prev) resolves URLs on demand in playNext/playPrev.
      const url = await resolveStreamUrl(track.id);
      await TrackPlayer.reset();
      await TrackPlayer.add(toRNTPTrack(track, url));
      await TrackPlayer.play();
      set({ isLoading: false });
      logPlayEvent(track.id, 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Playback error';
      set({ error: message, isLoading: false });
    }
  },

  async addToQueue(track: TrackSummary) {
    if (track.playbackStatus !== 'PLAYABLE') return;
    const { queue, currentIndex } = get();
    const insertAt = currentIndex + 1;
    const newQueue = [...queue];
    newQueue.splice(insertAt, 0, track);
    set({ queue: newQueue });
    try {
      const url = await resolveStreamUrl(track.id);
      await TrackPlayer.add(toRNTPTrack(track, url), insertAt);
    } catch {
      // Best-effort
    }
  },

  async pauseResume() {
    try {
      if (get().isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Playback error' });
    }
  },

  async seekTo(positionMs: number) {
    try {
      await TrackPlayer.seekTo(positionMs / 1000);
      set({ positionMs });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Seek error' });
    }
  },

  async playNext() {
    const { queue, currentIndex, repeatMode } = get();
    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode !== RepeatMode.Queue) {
        await TrackPlayer.pause();
        set({ isPlaying: false });
        return;
      }
      nextIndex = 0;
    }
    const nextTrack = queue[nextIndex];
    if (!nextTrack) return;
    set({ currentIndex: nextIndex, currentTrack: nextTrack, isLoading: true, positionMs: 0, durationMs: nextTrack.durationMs });
    try {
      const url = await resolveStreamUrl(nextTrack.id);
      await TrackPlayer.reset();
      await TrackPlayer.add(toRNTPTrack(nextTrack, url));
      await TrackPlayer.play();
      set({ isLoading: false });
      logPlayEvent(nextTrack.id, 0);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Playback error', isLoading: false });
    }
  },

  async playPrev() {
    const { queue, currentIndex, positionMs } = get();
    if (positionMs > 3000) {
      try { await TrackPlayer.seekTo(0); set({ positionMs: 0 }); } catch { /* ignore */ }
      return;
    }
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    const prevTrack = queue[prevIndex];
    if (!prevTrack) return;
    set({ currentIndex: prevIndex, currentTrack: prevTrack, isLoading: true, positionMs: 0, durationMs: prevTrack.durationMs });
    try {
      const url = await resolveStreamUrl(prevTrack.id);
      await TrackPlayer.reset();
      await TrackPlayer.add(toRNTPTrack(prevTrack, url));
      await TrackPlayer.play();
      set({ isLoading: false });
      logPlayEvent(prevTrack.id, 0);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Playback error', isLoading: false });
    }
  },

  async toggleShuffle() {
    const { shuffle, queue, currentIndex } = get();
    const newShuffle = !shuffle;
    set({ shuffle: newShuffle });

    if (newShuffle && queue.length > 1) {
      const current = queue[currentIndex];
      if (!current) return;
      const rest = queue.filter((_, i) => i !== currentIndex);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j]!, rest[i]!];
      }
      const shuffledQueue = [current, ...rest];
      set({ queue: shuffledQueue, currentIndex: 0 });

      try {
        const position = await TrackPlayer.getPosition();
        const url = await resolveStreamUrl(current.id);
        await TrackPlayer.reset();
        await TrackPlayer.add(toRNTPTrack(current, url));
        await TrackPlayer.play();
        if (position > 0) await TrackPlayer.seekTo(position);
      } catch {
        // Ignore — shuffle best-effort
      }
    }
  },

  async toggleRepeat() {
    const { repeatMode } = get();
    const next =
      repeatMode === RepeatMode.Off
        ? RepeatMode.Queue
        : repeatMode === RepeatMode.Queue
          ? RepeatMode.Track
          : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(next);
    set({ repeatMode: next });
  },

  clearError() {
    set({ error: null });
  },
}));

/**
 * Attach RNTP event listeners that sync playback state back into Zustand.
 * Call once after setupPlayer() resolves.
 * Returns a cleanup function.
 */
export function initPlayerListeners(): () => void {
  const subs = [
    TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
      usePlayerStore.setState({
        isPlaying: state === State.Playing,
        isLoading: state === State.Buffering || state === State.Loading,
      });
    }),

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
      const { currentTrack } = usePlayerStore.getState();
      usePlayerStore.setState({
        positionMs: Math.round(position * 1000),
        durationMs: duration > 0
          ? Math.round(duration * 1000)
          : (currentTrack?.durationMs ?? 0),
      });
    }),

    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ index }) => {
      if (index == null) return;
      const { queue } = usePlayerStore.getState();
      const track = queue[index];
      if (track) {
        usePlayerStore.setState({ currentIndex: index, currentTrack: track, positionMs: 0 });
      }
    }),

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
      const { currentTrack } = usePlayerStore.getState();
      if (currentTrack) logPlayEvent(currentTrack.id, 100);
      usePlayerStore.setState({ isPlaying: false, positionMs: 0 });
    }),

    TrackPlayer.addEventListener(Event.PlaybackError, ({ message }) => {
      usePlayerStore.setState({
        error: message ?? 'Playback error',
        isLoading: false,
        isPlaying: false,
      });
    }),
  ];

  return () => subs.forEach((s) => s.remove());
}

export function calcProgress(positionMs: number, durationMs: number): number {
  return durationMs > 0 ? positionMs / durationMs : 0;
}

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
}
