'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Colors = {
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
  
  type Theme = {
    name: string;
    mode: 'light' | 'dark';
    colors: Colors;
    background: unknown;
    particles: unknown[];
    overlays: unknown[];
    decorations: unknown[];
  };

  const DEFAULT_THEME: Theme = {
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

type ThemeContextValue = {
  theme: Theme;
  applyTheme: (theme: Theme) => void;
  generating: boolean;
  generate: (prompt: string) => Promise<void>;
  reset: () => Promise<void>;
  error: string | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToDocument(theme: Theme) {
    const root = document.documentElement;
    root.style.setProperty('--theme-background', theme.colors.background);
    root.style.setProperty('--theme-surface', theme.colors.surface);
    root.style.setProperty('--theme-surface-elevated', theme.colors.surfaceElevated);
    root.style.setProperty('--theme-border', theme.colors.border);
    root.style.setProperty('--theme-text', theme.colors.text);
    root.style.setProperty('--theme-text-muted', theme.colors.textMuted);
    root.style.setProperty('--theme-text-subtle', theme.colors.textSubtle);
    root.style.setProperty('--theme-accent', theme.colors.accent);
    root.style.setProperty('--theme-accent-hover', theme.colors.accentHover);
    root.style.setProperty('--theme-success', theme.colors.success);
    root.style.setProperty('--theme-danger', theme.colors.danger);
    root.setAttribute('data-theme-mode', theme.mode);
  }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applyToDocument(theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/theme')
      .then((r) => r.json())
      .then((data) => {
        if (data.theme) setTheme(data.theme);
      })
      .catch(() => {});
  }, []);

  function applyTheme(t: Theme) {
    setTheme(t);
  }

  async function generate(prompt: string) {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/theme/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate theme');
      setTheme(data.theme);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  async function reset() {
    setError(null);
    try {
      const res = await fetch('/api/theme', { method: 'DELETE' });
      const data = await res.json();
      if (data.theme) setTheme(data.theme);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, applyTheme, generating, generate, reset, error }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}