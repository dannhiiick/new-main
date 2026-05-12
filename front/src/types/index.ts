export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  plays: number;
  cover?: string;
  genre: string;
  language: string;
  audioFile?: string;
  audioUrl?: string;
}

export interface Artist {
  id: string;
  name: string;
  bio: string;
  genre: string;
  country: string;
  city: string;
  image: string;
  followers: number;
  tracks: Track[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  tracks: Track[];
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: string;
  type: 'editorial' | 'thematic' | 'user';
  tracks: Track[];
  creator?: string;
}

export interface Concert {
  id: string;
  artist: string;
  venue: string;
  date: string;
  time: string;
  city: string;
  ticketPrice: number;
  image: string;
}

export interface UserSettings {
  language: 'ru' | 'kk' | 'en';
  theme: 'system' | 'light' | 'dark';
  audioQuality: 'auto' | 'high' | 'saver';
  autoplay: boolean;
  notificationsEnabled: boolean;
  privateProfile: boolean;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string | null;
  isStaff: boolean;
  displayName: string;
  bio: string;
  city: string;
  settings: UserSettings;
}
