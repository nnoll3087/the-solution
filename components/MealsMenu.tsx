'use client';

import { useState } from 'react';

const LINKS = [
  { href: '/meals', label: 'Meal Planner', icon: '📅' },
  { href: '/meals/recipes', label: 'Recipe Library', icon: '📖' },
  { href: '/meals/shopping-list', label: 'Shopping List', icon: '🛒' },
];

export function MealsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface/80 backdrop-blur hover:bg-surface-elevated border border-border-themed text-text-muted hover:text-text transition"
        title="Meals"
      >
        🍽️
      </button>

      {open && (
        <>
          {/* Dismiss on pointerdown, not click: touch taps on the on-screen keyboard
              fire a trailing click that can land here after the tray hides */}
          <div onPointerDown={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div className="absolute left-0 top-full mt-2 w-56 bg-surface-elevated border border-border-themed rounded-lg shadow-2xl z-50 p-1.5">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-surface text-text text-sm transition"
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
