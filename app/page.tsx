import { fetchAllEvents } from '@/lib/events';
import { MonthView } from '@/components/MonthView';

export default async function Home() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const timeMin = new Date(year, month, 1);
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59);

  const events = await fetchAllEvents(timeMin, timeMax);

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl font-bold">The Solution®</h1>
          <p className="text-slate-400 mt-1">Noll & DeMichele family command center</p>
        </div>
        <div className="text-2xl font-semibold text-slate-300">
          {monthName} {year}
        </div>
      </header>
      <MonthView events={events} year={year} month={month} />
    </main>
  );
}
