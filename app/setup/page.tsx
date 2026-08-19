import { getAllTokens } from '@/lib/tokens';
import { listAllCalendars } from '@/lib/calendars';
import { getConfig, getMealsVisible } from '@/lib/config';
import { CalendarSelector } from '@/components/CalendarSelector';
import { CustodySettings } from '@/components/CustodySettings';
import { ExclusionSettings } from '@/components/ExclusionSettings';
import { PhotoManager } from '@/components/PhotoManager';
import { MealsVisibilityToggle } from '@/components/MealsVisibilityToggle';
import { ForceRefreshButton } from '@/components/ForceRefreshButton';
import { PageHeader } from '@/components/PageHeader';
import { SettingsTabs } from '@/components/SettingsTabs';

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const params = await searchParams;
  const tokens = await getAllTokens();
  const calendars = tokens.length > 0 ? await listAllCalendars() : [];
  const config = await getConfig();
  const mealsVisible = await getMealsVisible();

  const calendarsTab = (
    <div className="space-y-6">
      <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
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
        <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
          <h2 className="text-lg font-semibold mb-4">Choose Calendars</h2>
          <p className="text-text-muted text-sm mb-4">Check the box to display a calendar. Click the name to rename it.</p>
          <CalendarSelector calendars={calendars} savedConfigs={config.calendars} />
        </div>
      )}
      <a
        href="/api/auth/google/start"
        className="inline-block bg-accent hover:bg-accent-hover text-white font-medium rounded-lg px-6 py-3 transition-colors"
      >
        Connect another Google Account
      </a>
    </div>
  );

  const displayTab = (
    <div className="space-y-6">
      {config.calendars.length > 0 && (
        <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
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
      {config.calendars.length > 0 && (
        <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
          <h2 className="text-lg font-semibold mb-4">Hidden Events</h2>
          <ExclusionSettings initialPhrases={config.excludedTitles ?? []} />
        </div>
      )}
      <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
        <h2 className="text-lg font-semibold mb-4">Meals</h2>
        <MealsVisibilityToggle initialVisible={mealsVisible} />
      </div>
      <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
        <h2 className="text-lg font-semibold mb-2">Kiosk</h2>
        <p className="text-text-muted text-sm mb-4">
          If the display looks stale after an update, force a fresh reload — clears any cached
          files and reloads the calendar. No keyboard needed.
        </p>
        <ForceRefreshButton />
      </div>
    </div>
  );

  const photosTab = (
    <div className="bg-surface/80 backdrop-blur rounded-lg p-6 border border-border-themed">
      <h2 className="text-lg font-semibold mb-4">Photo Frame</h2>
      <PhotoManager />
    </div>
  );

  return (
    <main className="min-h-screen text-text p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          backHref="/"
          title="Setup"
          description="Manage calendars, what shows on the display, and the photo frame."
        />
        {params.connected && (
          <div className="bg-success-themed/20 border border-success-themed/40 rounded-lg p-4 mb-6">
            <p className="text-success-themed">Connected: {params.connected}</p>
          </div>
        )}
        <SettingsTabs calendars={calendarsTab} display={displayTab} photos={photosTab} />
      </div>
    </main>
  );
}
