'use client';

import { useState, FormEvent } from 'react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = '/';
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Wrong password');
    } catch {
      setError('Something went wrong. Try again.');
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-surface/80 backdrop-blur rounded-xl border border-border-themed p-8 space-y-5"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text">The Solution&reg;</h1>
          <p className="text-text-muted mt-1 text-sm">Enter the family password</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          className="w-full bg-bg border border-border-themed rounded-lg px-4 py-3 text-text text-lg"
        />

        {error && (
          <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full px-4 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-lg font-medium disabled:opacity-50 transition"
        >
          {submitting ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
