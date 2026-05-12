import type { Album, Artist, Concert, Playlist, Track } from '../types';
import { apiRequest } from './client';

export function fetchTracks(): Promise<Track[]> {
  return apiRequest<Track[]>(`/tracks`, { method: 'GET' });
}

export function fetchArtists(): Promise<Artist[]> {
  return apiRequest<Artist[]>(`/artists`, { method: 'GET' });
}

export function fetchAlbums(): Promise<Album[]> {
  return apiRequest<Album[]>(`/albums`, { method: 'GET' });
}

export function fetchPlaylists(): Promise<Playlist[]> {
  return apiRequest<Playlist[]>(`/playlists`, { method: 'GET' });
}

export function fetchConcerts(): Promise<Concert[]> {
  return apiRequest<Concert[]>(`/concerts`, { method: 'GET' });
}

