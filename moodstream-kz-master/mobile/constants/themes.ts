export type ThemeId = 'steppe_night' | 'dawn' | 'steppe_day' | 'mountain_ice';

export const THEME_META: Record<ThemeId, { label: string; bg: string; accent: string; surface: string; mode: 'dark' | 'light' }> = {
  steppe_night: { label: 'Степная ночь', bg: '#0F1419', accent: '#C87B4E', surface: '#151B35', mode: 'dark' },
  dawn:         { label: 'Рассвет',      bg: '#0F1419', accent: '#D4A848', surface: '#2A1A0E', mode: 'dark' },
  steppe_day:   { label: 'Степной день', bg: '#FAFAF8', accent: '#C87B4E', surface: '#FFFFFF', mode: 'light' },
  mountain_ice: { label: 'Горный лёд',   bg: '#F0F2F5', accent: '#0A9FA3', surface: '#FFFFFF', mode: 'light' },
};

export type ColorPalette = {
  bg: string; bgDeep: string; surface: string; surfaceGlass: string;
  surfaceElevated: string; border: string; borderSubtle: string;
  accent: string; accentLight: string; accentDim: string; accentGlow: string;
  turquoise: string; coral: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  gold: string; danger: string;
  mode: 'dark' | 'light';
};

export const THEMES: Record<ThemeId, ColorPalette> = {
  steppe_night: {
    mode: 'dark',
    bg: '#0F1419',         bgDeep: '#0B1020',
    surface: '#151B35',    surfaceElevated: '#1B2240',
    surfaceGlass: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.10)',
    borderSubtle: 'rgba(255,255,255,0.06)',
    accent: '#C87B4E',     accentLight: '#D4B896',
    accentDim: 'rgba(200,123,78,0.15)', accentGlow: 'rgba(200,123,78,0.30)',
    turquoise: '#4FC5C7',  coral: '#E57B6E',
    textPrimary: '#F5F5F7', textSecondary: '#A39B8B', textMuted: '#5A5248',
    gold: '#D4B896',       danger: '#E57B6E',
  },
  dawn: {
    mode: 'dark',
    bg: '#0F1419',         bgDeep: '#1A0F0F',
    surface: '#2A1A0E',    surfaceElevated: '#33210F',
    surfaceGlass: 'rgba(255,220,180,0.06)',
    border: 'rgba(255,220,180,0.12)',
    borderSubtle: 'rgba(255,220,180,0.06)',
    accent: '#D4A848',     accentLight: '#E8784A',
    accentDim: 'rgba(212,168,72,0.15)', accentGlow: 'rgba(212,168,72,0.30)',
    turquoise: '#F5A87A',  coral: '#E05C5C',
    textPrimary: '#FFF5EB', textSecondary: '#B8977A', textMuted: '#5A4838',
    gold: '#E8784A',       danger: '#E05C5C',
  },
  steppe_day: {
    mode: 'light',
    bg: '#FAFAF8',         bgDeep: '#F2EDE6',
    surface: '#FFFFFF',    surfaceElevated: '#FFFFFF',
    surfaceGlass: 'rgba(0,0,0,0.04)',
    border: 'rgba(26,22,18,0.08)',
    borderSubtle: 'rgba(26,22,18,0.06)',
    accent: '#C87B4E',     accentLight: '#D4A848',
    accentDim: 'rgba(200,123,78,0.12)', accentGlow: 'rgba(200,123,78,0.25)',
    turquoise: '#2A9FA1',  coral: '#D45A50',
    textPrimary: '#1A1612', textSecondary: '#8A7A6A', textMuted: '#B5AC9E',
    gold: '#D4A848',       danger: '#D45A50',
  },
  mountain_ice: {
    mode: 'light',
    bg: '#F0F2F5',         bgDeep: '#EBF0F7',
    surface: '#FFFFFF',    surfaceElevated: '#FFFFFF',
    surfaceGlass: 'rgba(13,27,42,0.04)',
    border: 'rgba(13,27,42,0.08)',
    borderSubtle: 'rgba(13,27,42,0.06)',
    accent: '#0A9FA3',     accentLight: '#2B6CB0',
    accentDim: 'rgba(10,159,163,0.12)', accentGlow: 'rgba(10,159,163,0.25)',
    turquoise: '#0A9FA3',  coral: '#E55E5E',
    textPrimary: '#0D1B2A', textSecondary: '#5A7080', textMuted: '#A6B3C0',
    gold: '#2B6CB0',       danger: '#E55E5E',
  },
};
