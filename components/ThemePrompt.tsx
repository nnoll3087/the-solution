'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';

export function ThemePrompt() {
  const { theme, generate, reset, generating, error } = useTheme();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');

  async function handleSubmit() {
    if (!prompt.trim() || generating) return;
    await generate(prompt.trim());
    setPrompt('');
  }

  async function handleReset() {
    await reset();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-lg bg-surface hover:bg-surface-elevated text-text text-sm border border-border-themed"
        title="Current theme"
      >
        <span className="mr-2">🎨</span>
        {theme.name}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div className="absolute right-0 top-full mt-2 w-80 bg-surface-elevated border border-border-themed rounded-lg shadow-2xl z-50 p-4">
            <label className="block text-xs uppercase tracking-wide text-text-muted mb-2">
              Describe a theme
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="ocean, rainbow, space..."
              className="w-full bg-bg border border-border-themed rounded-md px-3 py-2 text-text text-sm"
              autoFocus
            />
            <p className="text-xs text-text-subtle mt-1">Press Enter to apply. Takes ~10 seconds.</p>

            {error && (
              <div className="mt-3 bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-xs text-danger-themed">
                {error}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-1">
              {['ocean', 'space', 'rainbow', 'autumn', 'forest', 'sunset', 'snowfall', 'dinosaur'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setPrompt(s); }}
                  className="text-xs px-2 py-1 rounded bg-surface hover:bg-bg text-text-muted hover:text-text transition"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border-themed flex gap-2">
              <button
                onClick={handleReset}
                disabled={generating}
                className="flex-1 px-3 py-1.5 rounded-md bg-surface hover:bg-bg text-text-muted text-xs"
              >
                Reset to Slate
              </button>
              <button
                onClick={handleSubmit}
                disabled={generating || !prompt.trim()}
                className="flex-1 px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover text-white text-xs font-medium disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Apply'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}