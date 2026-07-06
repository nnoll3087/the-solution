import { Calendar } from '@/components/Calendar';
import { QueuePreview } from '@/components/QueuePreview';
import { ThemePrompt } from '@/components/ThemePrompt';

export default function Home() {
  return (
    <main className="min-h-screen p-8 relative">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-text">The Solution®</h1>
          <p className="text-text-muted mt-1">Noll & DeMichele family command center</p>
        </div>
        <ThemePrompt />
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Calendar />
        <QueuePreview />
      </div>
    </main>
  );
}