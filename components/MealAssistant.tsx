'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const STARTERS = ['Something with chicken', 'Kid-friendly dinner', 'Quick weeknight meal', 'Use up leftovers', 'Something new to try'];

export function MealAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/meals/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get a response');
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get a response');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-[700px]">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-text-muted text-sm mb-4">Ask about what to make, or tap a suggestion:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm px-3 py-1.5 rounded-full bg-surface hover:bg-surface-elevated border border-border-themed text-text transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ' +
                (m.role === 'user' ? 'bg-accent text-white' : 'bg-surface text-text border border-border-themed')
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm bg-surface text-text-muted border border-border-themed">
              Thinking...
            </div>
          </div>
        )}
        {error && (
          <div className="bg-danger-themed/20 border border-danger-themed/40 rounded-md px-3 py-2 text-sm text-danger-themed">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          placeholder="I'm thinking about an Asian-inspired dinner..."
          className="flex-1 bg-bg/50 border border-border-themed rounded-md px-3 py-2 text-text text-sm"
          disabled={sending}
        />
        <button
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
