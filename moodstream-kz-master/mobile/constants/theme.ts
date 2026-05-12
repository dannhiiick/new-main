/**
 * MoodStream KZ — Design System
 * Theme: "Steppe Resonance" — obsidian night, copper warmth, turquoise signal
 * Source: C:\project\MoodStream Mobile App Design
 */

export const COLORS = {
  // Backgrounds
  bg: '#0D1326',          // Deep Navy (corrected per mockup analysis)
  bgDeep: '#090C1F',      // Deeper Navy (gradient start)
  surface: '#151B35',     // Dark Navy (cards)
  surfaceGlass: 'rgba(255,255,255,0.05)',  // glassmorphism cards

  // Surfaces
  surfaceElevated: '#1E2540',   // slightly lighter than surface

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.05)',

  // Brand — Copper (primary CTA, active state)
  accent: '#C87B4E',
  accentLight: '#D4B896',   // Warm Sand
  accentDim: 'rgba(200,123,78,0.15)',
  accentGlow: 'rgba(200,123,78,0.30)',

  // Signal colors
  turquoise: '#4FC5C7',     // downloads, discovery
  coral: '#E57B6E',         // likes, fresh, warning

  // Text
  textPrimary: '#F5F5F7',   // Soft White
  textSecondary: '#A39B8B', // Warm Gray
  textMuted: '#5A5248',

  // Semantic
  gold: '#D4B896',          // Warm Sand (chart positions, highlights)
  danger: '#E57B6E',
} as const;

export type AppColor = keyof typeof COLORS;
