import type { Track, Artist, Album, Playlist, Concert } from '../types';

export const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Қара Орман',
    artist: 'Айбек Дүйсембаев',
    duration: 240,
    plays: 2500000,
    genre: 'Q-pop',
    language: 'Kazakh',
    cover: 'T1'
  },
  {
    id: '2',
    title: 'Күн сәлемі',
    artist: 'Dimash',
    duration: 320,
    plays: 5000000,
    genre: 'Pop',
    language: 'Kazakh',
    cover: 'T2'
  },
  {
    id: '3',
    title: 'Ғана',
    artist: 'Данэлия Тулешова',
    duration: 180,
    plays: 3200000,
    genre: 'Q-pop',
    language: 'Kazakh',
    cover: 'T3'
  },
  {
    id: '4',
    title: 'Almaty Streets',
    artist: 'Scriptonite',
    duration: 210,
    plays: 1800000,
    genre: 'Hip-Hop KZ',
    language: 'Russian',
    cover: 'T4'
  },
  {
    id: '5',
    title: 'Neon Dreams',
    artist: 'Ninety One',
    duration: 260,
    plays: 2100000,
    genre: 'Indie',
    language: 'Kazakh',
    cover: 'T5'
  }
];

export const mockArtists: Artist[] = [
  {
    id: '1',
    name: 'Dimash Qudaibergen',
    bio: 'Kazakhstan\'s singing sensation',
    genre: 'Pop',
    country: 'Kazakhstan',
    city: 'Aktau',
    image: 'D',
    followers: 5000000,
    tracks: mockTracks.slice(0, 2)
  },
  {
    id: '2',
    name: 'Scriptonite',
    bio: 'Hip-hop legend from Kazakhstan',
    genre: 'Hip-Hop',
    country: 'Kazakhstan',
    city: 'Almaty',
    image: 'S',
    followers: 2000000,
    tracks: mockTracks.slice(3, 4)
  },
  {
    id: '3',
    name: 'Ninety One',
    bio: 'Indie pioneers from Almaty',
    genre: 'Indie',
    country: 'Kazakhstan',
    city: 'Almaty',
    image: 'N',
    followers: 1500000,
    tracks: mockTracks.slice(4, 5)
  }
];

export const mockAlbums: Album[] = [
  {
    id: '1',
    title: 'Spiritual State',
    artist: 'Dimash',
    cover: 'A1',
    year: 2023,
    tracks: mockTracks.slice(0, 3)
  },
  {
    id: '2',
    title: 'Kazakh Stories',
    artist: 'Various',
    cover: 'A2',
    year: 2024,
    tracks: mockTracks.slice(0, 5)
  }
];

export const mockPlaylists: Playlist[] = [
  {
    id: '1',
    name: 'Тренды Казахстана',
    description: 'Главные хиты прямо сейчас',
    cover: 'P1',
    type: 'editorial',
    tracks: mockTracks.slice(0, 3)
  },
  {
    id: '2',
    name: 'Волна Q-pop',
    description: 'Лучшие треки жанра Q-pop',
    cover: 'P2',
    type: 'editorial',
    tracks: mockTracks.slice(0, 2)
  },
  {
    id: '3',
    name: 'Дорога',
    description: 'Плейлист для поездок',
    cover: 'P3',
    type: 'thematic',
    tracks: mockTracks
  },
  {
    id: '4',
    name: 'Энергия спорта',
    description: 'Треки для интенсивной тренировки',
    cover: 'P4',
    type: 'thematic',
    tracks: mockTracks.slice(0, 4)
  }
];

export const mockConcerts: Concert[] = [
  {
    id: '1',
    artist: 'Dimash',
    venue: 'Kazakh-Eli Palace',
    date: '2026-06-15',
    time: '19:00',
    city: 'Almaty',
    ticketPrice: 15000,
    image: 'E1'
  },
  {
    id: '2',
    artist: 'Ninety One',
    venue: 'Saryarka Amphitheater',
    date: '2026-07-20',
    time: '20:00',
    city: 'Astana',
    ticketPrice: 8000,
    image: 'E2'
  }
];
