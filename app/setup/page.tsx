import { getAllTokens } from '@/lib/tokens';
import { listAllCalendars } from '@/lib/calendars';
import { getConfig } from '@/lib/config';
import { CalendarSelector } from '@/components/CalendarSelector';

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const params = await searchParams;
  const tokens = getAllTokens();
  const calendars = tokens.length > 0 ? await listAllCalendars() : [];
  const config = getConfig();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Setup</h1>
        <p className="text-slate-400 mb-8">Choose which calendars to display and give them names.</p>
        {params.connected && (
          <div className="bg-emerald-950 border border-emerald-800 rounded-lg p-4 mb-6">
            <p className="text-emerald-200">Connected: {params.connected}</p>
          </div>
        )}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mb-6">
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
          {tokens.length === 0 ? (
            <p className="text-slate-400 text-sm">No accounts connected yet.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li key={t.accountEmail} className="text-slate-200 text-sm">{t.accountEmail}</li>
              ))}
            </ul>
          )}
        </div>
        {calendars.length > 0 && (
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mb-6">
            <h2 className="text-lg font-semibold mb-4">Choose Calendars</h2>
            <p className="text-slate-400 text-sm mb-4">Check the box to display a calendar. Click the name to rename it.</p>
            <CalendarSelector calendars={calendars} savedConfigs={config.calendars} />
          </div>
        )}
        <a href="/api/auth/google/start" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-3 transition-colors">Connect another Google Account</a>
      </div>
    </main>
  );
}
