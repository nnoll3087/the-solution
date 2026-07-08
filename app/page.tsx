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
          <ThemePrompt />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <Calendar />
          <QueuePreview />
        </div>
      </main>
    </ZenMode>
  );
}