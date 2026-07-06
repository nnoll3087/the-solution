import fs from 'fs';
import path from 'path';

const THEME_FILE = path.join(process.cwd(), '.theme.json');

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
    danger: '#ef4444',
  },
  background: { type: 'solid', color: '#020617' },
  particles: [],
  overlays: [],
  decorations: [],
};

export function getTheme(): Theme {
  if (!fs.existsSync(THEME_FILE)) return DEFAULT_THEME;
  try {
    const parsed = JSON.parse(fs.readFileSync(THEME_FILE, 'utf8'));
    if (!parsed.colors) return DEFAULT_THEME;
    return parsed;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(theme: Theme) {
  fs.writeFileSync(THEME_FILE, JSON.stringify(theme, null, 2));
}

export function clearTheme() {
  if (fs.existsSync(THEME_FILE)) fs.unlinkSync(THEME_FILE);
}