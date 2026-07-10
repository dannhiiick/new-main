import { useEffect, useState, useCallback } from 'react';
import type { Track } from './api';
import { api } from './api';

const LIKES_KEY = 'qm:liked_tracks';
const RECENT_KEY = 'qm:recent_tracks';
const FOLLOWS_KEY = 'qm:followed_artists';
const SAVED_PLAYLISTS_KEY = 'qm:saved_playlists';
const SAVED_ALBUMS_KEY = 'qm:saved_albums';
const MAX_RECENT = 30;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l());

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  emit();
}

export function getLikedTracks(): Track[] {
  return readJSON<Track[]>(LIKES_KEY, []);
}

export function isLiked(id: string): boolean {
  return getLikedTracks().some(t => t.id === id);
}

export function toggleLike(track: Track) {
  const list = getLikedTracks();
  const wasLiked = list.some(t => t.id === track.id);
  const next = wasLiked ? list.filter(t => t.id !== track.id) : [track, ...list];
  writeJSON(LIKES_KEY, next);
  // Fire API call, rollback on error
  const apiCall = wasLiked
    ? api.library.removeLike(String(track.id))
    : api.library.addLike(String(track.id));
  apiCall.catch(() => {
    writeJSON(LIKES_KEY, list); // rollback
  });
}

export function getRecentTracks(): Track[] {
  return readJSON<Track[]>(RECENT_KEY, []);
}

export function pushRecent(track: Track) {
  const list = getRecentTracks().filter(t => t.id !== track.id);
  list.unshift(track);
  writeJSON(RECENT_KEY, list.slice(0, MAX_RECENT));
  // Fire-and-forget API call
  api.library.addRecentlyPlayed(String(track.id)).catch(() => {});
}

export function getFollowedArtists(): string[] {
  return readJSON<string[]>(FOLLOWS_KEY, []);
}

export function toggleFollowArtist(id: string) {
  const list = getFollowedArtists();
  const wasFollowed = list.includes(id);
  const next = wasFollowed ? list.filter(x => x !== id) : [...list, id];
  writeJSON(FOLLOWS_KEY, next);
  // Fire API call, rollback on error
  const apiCall = wasFollowed
    ? api.library.removeFollow(String(id))
    : api.library.addFollow(String(id));
  apiCall.catch(() => {
    writeJSON(FOLLOWS_KEY, list); // rollback
  });
}

export function getSavedPlaylists(): string[] {
  return readJSON<string[]>(SAVED_PLAYLISTS_KEY, []);
}

export function toggleSavedPlaylist(id: string) {
  const list = getSavedPlaylists();
  const wasSaved = list.includes(id);
  const next = wasSaved ? list.filter(x => x !== id) : [...list, id];
  writeJSON(SAVED_PLAYLISTS_KEY, next);
  // Fire API call, rollback on error
  const apiCall = wasSaved
    ? api.library.unsavePlaylist(String(id))
    : api.library.savePlaylist(String(id));
  apiCall.catch(() => {
    writeJSON(SAVED_PLAYLISTS_KEY, list); // rollback
  });
}

export function getSavedAlbums(): string[] {
  return readJSON<string[]>(SAVED_ALBUMS_KEY, []);
}

export function toggleSavedAlbum(id: string) {
  const list = getSavedAlbums();
  const wasSaved = list.includes(id);
  const next = wasSaved ? list.filter(x => x !== id) : [...list, id];
  writeJSON(SAVED_ALBUMS_KEY, next);
  // Fire API call, rollback on error
  const apiCall = wasSaved
    ? api.library.unsaveAlbum(String(id))
    : api.library.saveAlbum(String(id));
  apiCall.catch(() => {
    writeJSON(SAVED_ALBUMS_KEY, list); // rollback
  });
}

export async function syncLibrary() {
  try {
    const [likedTracks, follows, savedPlaylists, savedAlbs, recent] = await Promise.all([
      api.library.likes(),
      api.library.follows(),
      api.library.savedPlaylists(),
      api.library.savedAlbums(),
      api.library.recentlyPlayed(),
    ]);
    writeJSON(LIKES_KEY, likedTracks);
    writeJSON(FOLLOWS_KEY, follows.map((f: any) => String(f.id)));
    writeJSON(SAVED_PLAYLISTS_KEY, savedPlaylists.map((s: any) => String(s.id)));
    writeJSON(SAVED_ALBUMS_KEY, savedAlbs.map((a: any) => String(a.id)));
    writeJSON(RECENT_KEY, recent);
  } catch {
    // Keep local cache on error
  }
}

export function clearLibrary() {
  localStorage.removeItem(LIKES_KEY);
  localStorage.removeItem(RECENT_KEY);
  localStorage.removeItem(FOLLOWS_KEY);
  localStorage.removeItem(SAVED_PLAYLISTS_KEY);
  localStorage.removeItem(SAVED_ALBUMS_KEY);
  emit();
}

export function useLibrary() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force(x => x + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return {
    liked: getLikedTracks(),
    recent: getRecentTracks(),
    followed: getFollowedArtists(),
    saved: getSavedPlaylists(),
    savedAlbums: getSavedAlbums(),
    toggleLike: useCallback(toggleLike, []),
    toggleFollowArtist: useCallback(toggleFollowArtist, []),
    toggleSavedPlaylist: useCallback(toggleSavedPlaylist, []),
    toggleSavedAlbum: useCallback(toggleSavedAlbum, []),
    isLiked: useCallback(isLiked, []),
  };
}
