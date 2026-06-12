import { useEffect, useState, useCallback } from 'react';
import type { Track } from './api';

const LIKES_KEY = 'qm:liked_tracks';
const RECENT_KEY = 'qm:recent_tracks';
const FOLLOWS_KEY = 'qm:followed_artists';
const SAVED_PLAYLISTS_KEY = 'qm:saved_playlists';
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
  const next = list.some(t => t.id === track.id)
    ? list.filter(t => t.id !== track.id)
    : [track, ...list];
  writeJSON(LIKES_KEY, next);
}

export function getRecentTracks(): Track[] {
  return readJSON<Track[]>(RECENT_KEY, []);
}

export function pushRecent(track: Track) {
  const list = getRecentTracks().filter(t => t.id !== track.id);
  list.unshift(track);
  writeJSON(RECENT_KEY, list.slice(0, MAX_RECENT));
}

export function getFollowedArtists(): string[] {
  return readJSON<string[]>(FOLLOWS_KEY, []);
}

export function toggleFollowArtist(id: string) {
  const list = getFollowedArtists();
  const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  writeJSON(FOLLOWS_KEY, next);
}

export function getSavedPlaylists(): string[] {
  return readJSON<string[]>(SAVED_PLAYLISTS_KEY, []);
}

export function toggleSavedPlaylist(id: string) {
  const list = getSavedPlaylists();
  const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id];
  writeJSON(SAVED_PLAYLISTS_KEY, next);
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
    toggleLike: useCallback(toggleLike, []),
    toggleFollowArtist: useCallback(toggleFollowArtist, []),
    toggleSavedPlaylist: useCallback(toggleSavedPlaylist, []),
    isLiked: useCallback(isLiked, []),
  };
}
