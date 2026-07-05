import { Calendar } from '@/components/Calendar';
import { QueuePreview } from '@/components/QueuePreview';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">The Solution®</h1>
        <p className="text-slate-400 mt-1">Noll & DeMichele family command center</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Calendar />
        <QueuePreview />
      </div>
    </main>
  );
}