import { getAllTokens } from '@/lib/tokens';
import { listAllCalendars } from '@/lib/calendars';
import { getConfig } from '@/lib/config';
import { CalendarSelector } from '@/components/CalendarSelector';
import { CustodySettings } from '@/components/CustodySettings';

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const params = await searchParams;
  const tokens = await getAllTokens();
  const calendars = tokens.length > 0 ? await listAllCalendars() : [];
  const config = await getConfig();

  return (
    <main className="min-h-screen bg-bg text-text p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Setup</h1>
        <p className="text-text-muted mb-8">Choose which calendars to display and give them names.</p>
        {params.connected && (
          <div className="bg-success-themed/20 border border-success-themed/40 rounded-lg p-4 mb-6">
            <p className="text-success-themed">Connected: {params.connected}</p>
          </div>
        )}
        <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed mb-6">
          <h2 className="text-lg font-semibold mb-4">Connected Accounts</h2>
          {tokens.length === 0 ? (
            <p className="text-text-muted text-sm">No accounts connected yet.</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li key={t.accountEmail} className="text-text text-sm">{t.accountEmail}</li>
              ))}
            </ul>
          )}
        </div>
        {calendars.length > 0 && (
          <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed mb-6">
            <h2 className="text-lg font-semibold mb-4">Choose Calendars</h2>
            <p className="text-text-muted text-sm mb-4">Check the box to display a calendar. Click the name to rename it.</p>
            <CalendarSelector calendars={calendars} savedConfigs={config.calendars} />
          </div>
        )}
        {config.calendars.length > 0 && (
          <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed mb-6">
            <h2 className="text-lg font-semibold mb-4">Custody Day Coloring</h2>
            <CustodySettings
              calendars={config.calendars.filter((c) => c.enabled).map((c) => ({
                accountEmail: c.accountEmail,
                calendarId: c.calendarId,
                displayName: c.displayName,
              }))}
              initialCalendarKey={config.custody?.calendarKey || ''}
              initialRules={config.custody?.rules || []}
            />
          </div>
        )}
        <a href="/api/auth/google/start" className="inline-block bg-accent hover:bg-accent-hover text-white font-medium rounded-lg px-6 py-3 transition-colors">Connect another Google Account</a>
      </div>
    </main>
  );
}
