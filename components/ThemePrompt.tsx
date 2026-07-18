'use client';

import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';

type Usage = {
  remainingUsd: number | null;
  totalSpentUsd: number;
  generationCount: number;
};

export function ThemePrompt() {
  const { theme, generate, reset, generating, error } = useTheme();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');

  function loadUsage() {
    fetch('/api/usage').then((r) => r.json()).then(setUsage).catch(() => {});
  }

  useEffect(() => {
    if (open) loadUsage();
  }, [open]);

  async function handleSubmit() {
    if (!prompt.trim() || generating) return;
    await generate(prompt.trim());
    setPrompt('');
    loadUsage();
  }

  async function handleReset() {
    await reset();
  }

  async function saveBalance() {
    const v = parseFloat(balanceInput);
    if (isNaN(v) || v < 0) return;
    await fetch('/api/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ balanceUsd: v }),
    });
    setEditingBalance(false);
    setBalanceInput('');
    loadUsage();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 min-h-[40px] rounded-lg bg-surface/80 backdrop-blur hover:bg-surface-elevated text-text text-sm border border-border-themed whitespace-nowrap transition"
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
              className="w-full bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-sm"
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

            <div className="mt-4 pt-3 border-t border-border-themed text-xs text-text-muted">
              {usage && (
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {usage.remainingUsd !== null
                      ? '≈ $' + usage.remainingUsd.toFixed(2) + ' credits left'
                      : 'API credits: not set'}
                    {usage.generationCount > 0 && (
                      <span className="text-text-subtle"> · {usage.generationCount} themes, ${usage.totalSpentUsd.toFixed(2)}</span>
                    )}
                  </span>
                  {!editingBalance ? (
                    <button onClick={() => setEditingBalance(true)} className="text-accent hover:brightness-125 flex-shrink-0">
                      {usage.remainingUsd !== null ? 'Re-sync' : 'Set'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 flex-shrink-0">
                      $
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveBalance(); }}
                        placeholder="20.00"
                        autoFocus
                        className="w-16 bg-bg/50 border border-border-themed rounded px-1.5 py-0.5 text-text"
                      />
                      <button onClick={saveBalance} className="text-accent hover:brightness-125">Save</button>
                    </span>
                  )}
                </div>
              )}
              <p className="text-text-subtle mt-1">
                Anthropic doesn&apos;t expose balances, so enter yours from console.anthropic.com and
                theme costs count down from it. Tracks this app only.
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-border-themed flex gap-2">
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