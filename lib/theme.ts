import { readStore, writeStore, deleteStore } from './storage';

export type Colors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  danger: string;
};

export type GradientBackground = {
  type: 'gradient';
  angle: number;
  stops: { color: string; position: number }[];
  animate: boolean;
  animationDuration: number;
};

export type SolidBackground = {
  type: 'solid';
  color: string;
};

export type Background = GradientBackground | SolidBackground;

export type Particle = {
  shape: 'circle' | 'bubble' | 'star' | 'sparkle' | 'leaf' | 'snowflake' | 'petal' | 'dot' | 'diamond';
  count: number;
  sizeMin: number;
  sizeMax: number;
  color: string;
  colorAlt?: string;
  opacityMin: number;
  opacityMax: number;
  direction: 'up' | 'down' | 'drift' | 'twinkle';
  speedMin: number;
  speedMax: number;
  wobble: boolean;
  glow: boolean;
};

export type Overlay = {
  type: 'radial-glow' | 'vignette' | 'wave-band';
  position: 'top' | 'bottom' | 'center';
  color: string;
  opacity: number;
  size?: number;
};

export type Decoration = {
  type: 'silhouette';
  position: 'top' | 'bottom';
  shape: 'mountains' | 'coral' | 'treeline' | 'cityscape' | 'hills' | 'waves' | 'clouds';
  color: string;
  height: number;
  opacity: number;
};

export type Theme = {
  name: string;
  mode: 'light' | 'dark';
  colors: Colors;
  background: Background;
  particles: Particle[];
  overlays: Overlay[];
  decorations: Decoration[];
};

export const DEFAULT_THEME: Theme = {
  name: 'Slate',
  mode: 'dark',
  colors: {
    background: '#020617',
    surface: '#0f172a',
    surfaceElevated: '#1e293b',
    border: '#1e293b',
    text: '#f1f5f9',
    textMuted: '#94a3b8',
    textSubtle: '#64748b',
    accent: '#3b82f6',
    accentHover: '#60a5fa',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  },
  background: { type: 'solid', color: '#020617' },
  particles: [],
  overlays: [],
  decorations: [],
};

export async function getTheme(): Promise<Theme> {
  const parsed = await readStore<Theme | null>('theme', null);
  if (!parsed || !parsed.colors) return DEFAULT_THEME;
  // Themes saved before the warning color existed
  if (!parsed.colors.warning) parsed.colors.warning = DEFAULT_THEME.colors.warning;
  return parsed;
}

export async function saveTheme(theme: Theme) {
  await writeStore('theme', theme);
}

export async function clearTheme() {
  await deleteStore('theme');
}
