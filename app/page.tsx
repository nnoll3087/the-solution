import { Calendar } from '@/components/Calendar';
import { QueuePreview } from '@/components/QueuePreview';
import { ThemePrompt } from '@/components/ThemePrompt';
import { ZenMode } from '@/components/ZenMode';

export default function Home() {
  return (
    <ZenMode>
      <main className="min-h-screen p-3 sm:p-5 relative">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-text">The Solution®</h1>
          <div className="flex items-center gap-2">
            <ThemePrompt />
            <a
              href="/setup"
              title="Settings"
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface/80 backdrop-blur hover:bg-surface-elevated border border-border-themed text-text-muted hover:text-text transition"
            >
              ⚙️
            </a>
          </div>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <Calendar />
          <QueuePreview />
        </div>
      </main>
    </ZenMode>
  );
}