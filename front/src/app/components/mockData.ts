import type { Track, Artist, Album, Playlist, Concert, CurrentUser } from './api';

export const MOCK_USER: CurrentUser = {
  id: 1,
  username: 'demo',
  email: 'demo@qmusic.kz',
  isStaff: false,
  displayName: 'Demo User',
  bio: 'Люблю казахскую и мировую музыку',
  city: 'Алматы',
  settings: {
    language: 'ru',
    theme: 'system',
    audioQuality: 'auto',
    autoplay: true,
    notificationsEnabled: true,
    privateProfile: false,
  },
};

export const MOCK_TRACKS: Track[] = [
  { id: '1', title: 'Сен Барсаң', artist: 'Dimash Kudaibergen', duration: 274, plays: 1250000, genre: 'Казахская', language: 'kk' },
  { id: '2', title: 'SOS d\'un terrien en détresse', artist: 'Dimash Kudaibergen', duration: 312, plays: 980000, genre: 'Pop', language: 'fr' },
  { id: '3', title: 'Ән Салайық', artist: 'Иманбек', duration: 198, plays: 870000, genre: 'Electronic', language: 'kk' },
  { id: '4', title: 'Roses (Imanbek Remix)', artist: 'Иманбek', duration: 175, plays: 2100000, genre: 'Electronic', language: 'en' },
  { id: '5', title: 'Мәңгілік Ел', artist: 'Дос-Мұқасан', duration: 245, plays: 430000, genre: 'Казахская', language: 'kk' },
  { id: '6', title: 'Дударай', artist: 'Роза Рымбаева', duration: 220, plays: 650000, genre: 'Казахская', language: 'kk' },
  { id: '7', title: 'Бет-Аға', artist: 'Скриптонит', duration: 188, plays: 1450000, genre: 'Hip-Hop', language: 'ru' },
  { id: '8', title: 'Ауыл', artist: 'Jah Khalib', duration: 203, plays: 920000, genre: 'R&B', language: 'ru' },
  { id: '9', title: 'Жүрегім', artist: 'Молданазар', duration: 267, plays: 780000, genre: 'Казахская', language: 'kk' },
  { id: '10', title: 'Қазақстан', artist: 'Нұрлан Өтегенов', duration: 234, plays: 340000, genre: 'Казахская', language: 'kk' },
  { id: '11', title: 'Туған Жер', artist: 'Дос-Мұқасан', duration: 256, plays: 520000, genre: 'Казахская', language: 'kk' },
  { id: '12', title: 'Galaxy', artist: 'Иманбек', duration: 195, plays: 1100000, genre: 'Electronic', language: 'en' },
];

export const MOCK_ARTISTS: Artist[] = [
  { id: '1', name: 'Dimash Kudaibergen', bio: 'Казахстанский певец с феноменальным вокальным диапазоном', genre: 'Pop', country: 'Казахстан', city: 'Актобе', image: '', followers: 12000000, tracks: [] },
  { id: '2', name: 'Иманбек', bio: 'DJ и продюсер, обладатель Grammy за ремикс Roses', genre: 'Electronic', country: 'Казахстан', city: 'Жанаозен', image: '', followers: 5400000, tracks: [] },
  { id: '3', name: 'Скриптонит', bio: 'Рэпер из Алматы, один из пионеров казахского хип-хопа', genre: 'Hip-Hop', country: 'Казахстан', city: 'Алматы', image: '', followers: 3200000, tracks: [] },
  { id: '4', name: 'Jah Khalib', bio: 'Певец в жанре R&B, известен душевными текстами', genre: 'R&B', country: 'Казахстан', city: 'Алматы', image: '', followers: 2800000, tracks: [] },
  { id: '5', name: 'Молданазар', bio: 'Популярный казахский эстрадный певец', genre: 'Казахская', country: 'Казахстан', city: 'Астана', image: '', followers: 1900000, tracks: [] },
  { id: '6', name: 'Роза Рымбаева', bio: 'Легенда казахской эстрады', genre: 'Казахская', country: 'Казахстан', city: 'Алматы', image: '', followers: 980000, tracks: [] },
];

export const MOCK_ALBUMS: Album[] = [
  { id: '1', title: 'Stranger', artist: 'Dimash Kudaibergen', cover: '', year: 2022, tracks: [] },
  { id: '2', title: 'Alash', artist: 'Иманбек', cover: '', year: 2021, tracks: [] },
  { id: '3', title: 'Дом с нормальными явлениями', artist: 'Скриптонит', cover: '', year: 2019, tracks: [] },
  { id: '4', title: 'Мне было 18', artist: 'Jah Khalib', cover: '', year: 2020, tracks: [] },
  { id: '5', title: 'Жарық', artist: 'Молданазар', cover: '', year: 2023, tracks: [] },
  { id: '6', title: 'Алтын Сақа', artist: 'Дос-Мұқасан', cover: '', year: 2018, tracks: [] },
  { id: '7', title: 'Qazaqstan', artist: 'Various Artists', cover: '', year: 2023, tracks: [] },
  { id: '8', title: 'Roza', artist: 'Роза Рымбаева', cover: '', year: 2020, tracks: [] },
];

export const MOCK_PLAYLISTS: Playlist[] = [
  { id: '1', name: 'Казахская классика', description: 'Лучшие казахские песни всех времён', cover: '', type: 'editorial', tracks: [] },
  { id: '2', name: 'Хиты недели', description: 'Самые популярные треки прямо сейчас', cover: '', type: 'editorial', tracks: [] },
  { id: '3', name: 'Electronic vibes', description: 'Электронная музыка для работы и отдыха', cover: '', type: 'thematic', tracks: [] },
  { id: '4', name: 'Казахский хип-хоп', description: 'Лучший рэп на казахском и русском', cover: '', type: 'thematic', tracks: [] },
  { id: '5', name: 'Утренний плейлист', description: 'Позитивные треки для начала дня', cover: '', type: 'editorial', tracks: [] },
  { id: '6', name: 'Ночная волна', description: 'Спокойная музыка для позднего вечера', cover: '', type: 'thematic', tracks: [] },
];

export const MOCK_CONCERTS: Concert[] = [
  { id: '1', artist: 'Dimash Kudaibergen', venue: 'Алматы Арена', date: '2026-07-15', time: '19:00', city: 'Алматы', ticketPrice: 15000, image: '' },
  { id: '2', artist: 'Иманбек', venue: 'Qazaq Concert', date: '2026-07-22', time: '21:00', city: 'Астана', ticketPrice: 8000, image: '' },
  { id: '3', artist: 'Скриптонит', venue: 'Конгресс-холл', date: '2026-08-05', time: '20:00', city: 'Алматы', ticketPrice: 6000, image: '' },
  { id: '4', artist: 'Jah Khalib', venue: 'Sport Palace', date: '2026-08-18', time: '20:30', city: 'Шымкент', ticketPrice: 5000, image: '' },
  { id: '5', artist: 'Молданазар', venue: 'Astana Arena', date: '2026-09-03', time: '19:30', city: 'Астана', ticketPrice: 7500, image: '' },
];
