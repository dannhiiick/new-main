import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './api';
import type { TrackSummary } from './types';
import { useOfflineStore, OFFLINE_DIR } from '../store/offline';

const SECURE_KEY_ACCESS = 'moodstream_access_token';

/** Ensure the offline directory exists */
async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(OFFLINE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
  }
}

/** Local file path for a given trackId */
function localUri(trackId: string): string {
  return `${OFFLINE_DIR}${trackId}.audio`;
}

/**
 * Download a track for offline playback.
 * Track metadata is stored alongside the file for offline display.
 * Progress is written to the offline store as 0–1.
 * On completion the entry state becomes 'done'.
 * On error the entry state becomes 'error'.
 */
export async function downloadTrack(track: TrackSummary): Promise<void> {
  const trackId = track.id;
  const store = useOfflineStore.getState();

  // Already downloaded or in progress — skip
  const existing = store.entries[trackId];
  if (existing?.state === 'done') return;
  if (existing?.state === 'downloading') return;

  await ensureDir();

  const uri = localUri(trackId);
  const streamUrl = `${API_URL}/api/v1/stream/${trackId}`;

  store._set(trackId, { trackId, localUri: uri, progress: 0, state: 'downloading', track });

  try {
    const token = await SecureStore.getItemAsync(SECURE_KEY_ACCESS);
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      streamUrl,
      uri,
      { headers },
      (progress) => {
        const pct =
          progress.totalBytesExpectedToWrite > 0
            ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
            : 0;
        useOfflineStore.getState()._set(trackId, { progress: pct });
      },
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) throw new Error('Download returned no result');

    const fileInfo = await FileSystem.getInfoAsync(uri);
    const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : undefined;

    useOfflineStore.getState()._set(trackId, {
      state: 'done',
      progress: 1,
      localUri: uri,
      fileSizeBytes,
      downloadedAt: new Date().toISOString(),
      track,
    });
  } catch (err) {
    // Clean up partial file
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore
    }
    useOfflineStore.getState()._set(trackId, { state: 'error', progress: 0 });
    throw err;
  }
}

/**
 * Returns the local URI if the track is downloaded, otherwise null.
 * Use this to feed the player instead of the stream URL.
 */
export function getOfflineUri(trackId: string): string | null {
  const entry = useOfflineStore.getState().entries[trackId];
  return entry?.state === 'done' ? entry.localUri : null;
}

/**
 * Delete a downloaded track and remove it from the store.
 */
export async function removeDownload(trackId: string): Promise<void> {
  await useOfflineStore.getState().remove(trackId);
}
