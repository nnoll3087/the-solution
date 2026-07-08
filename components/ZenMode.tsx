'use client';

import { ReactNode, useEffect, useState } from 'react';

// Screensaver mode: fades out all page content so only the themed scene
// (background, particles, decorations) remains. Tap anywhere to return.
export function ZenMode({ children }: { children: ReactNode }) {
  const [zen, setZen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  useEffect(() => {
    if (!zen) return;
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 4000);
    return () => clearTimeout(t);
  }, [zen]);

  useEffect(() => {
    if (!zen) return;
    function onKey() {
      setZen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zen]);

  return (
    <>
      <div
        className={
          'transition-opacity duration-700 ' + (zen ? 'opacity-0 pointer-events-none' : 'opacity-100')
        }
      >
        {children}
      </div>

      {!zen && (
        <button
          onClick={() => setZen(true)}
          title="Hide the calendar and enjoy the scene"
          className="fixed bottom-4 right-4 z-40 w-11 h-11 flex items-center justify-center rounded-full bg-surface/80 backdrop-blur border border-border-themed text-text-muted hover:text-text hover:bg-surface-elevated transition text-lg"
        >
          ✨
        </button>
      )}

      {zen && (
        <div onClick={() => setZen(false)} className="fixed inset-0 z-40 cursor-pointer">
          <span
            className={
              'absolute bottom-8 inset-x-0 text-center text-sm text-text-subtle transition-opacity duration-1000 ' +
              (hintVisible ? 'opacity-70' : 'opacity-0')
            }
          >
            Tap anywhere to return
          </span>
        </div>
      )}
    </>
  );
}
