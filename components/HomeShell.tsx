'use client';

import { useRef } from 'react';
import { Calendar } from './Calendar';
import { QueuePreview } from './QueuePreview';
import { MealsMenu } from './MealsMenu';
import { ThemePrompt } from './ThemePrompt';
import { ZenMode, ZenModeHandle } from './ZenMode';
import { Slideshow, SlideshowHandle } from './Slideshow';

const iconButtonCls =
  'w-10 h-10 flex items-center justify-center rounded-lg bg-surface/80 backdrop-blur hover:bg-surface-elevated border border-border-themed text-text-muted hover:text-text transition';

export function HomeShell({ mealsVisible }: { mealsVisible: boolean }) {
  const zenRef = useRef<ZenModeHandle>(null);
  const slideshowRef = useRef<SlideshowHandle>(null);

  return (
    <>
      <ZenMode ref={zenRef} hideTrigger>
        <main className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col p-3 sm:p-5 relative">
          <header className="mb-3 shrink-0 flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-text">The Solution®</h1>
            <div className="flex items-center gap-2">
              <MealsMenu />
              <ThemePrompt />
              <button onClick={() => slideshowRef.current?.activate()} title="Start the photo slideshow" className={iconButtonCls}>
                🖼️
              </button>
              <button onClick={() => zenRef.current?.activate()} title="Hide the calendar and enjoy the scene" className={iconButtonCls}>
                ✨
              </button>
              <a href="/setup" title="Settings" className={iconButtonCls}>
                ⚙️
              </a>
            </div>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] lg:grid-rows-[minmax(0,1fr)] gap-4 lg:flex-1 lg:min-h-0">
            <Calendar mealsVisible={mealsVisible} />
            <QueuePreview />
          </div>
        </main>
      </ZenMode>
      {/* Idle photo frame: home page only, per the kiosk requirement */}
      <Slideshow ref={slideshowRef} hideTrigger />
    </>
  );
}
