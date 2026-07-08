@AGENTS.md

# The Solution® — Noll & DeMichele Family Command Center

A kitchen dashboard family calendar. Currently developed on a laptop; the plan is to run it on a
Raspberry Pi 5 + touchscreen as a kiosk, with web/mobile access (password-protected) added last.

## Tech stack

- **Next.js 16.2.9** (App Router), React 19, TypeScript — note: package.json pins `next@16.2.9`, not
  15. `dev`/`build` scripts are plain `next dev`/`next build` (no explicit `--turbopack` flag today).
  Per `AGENTS.md`, this is a bleeding-edge/pinned version with breaking changes vs. training data —
  check `node_modules/next/dist/docs/` before assuming an API/convention still works as remembered.
- **Tailwind CSS v4** — no `tailwind.config.js`; configured via `@theme inline` in `app/globals.css`
- **shadcn/ui** primitives in `components/ui/` (button, card, dialog, input, label, select, tabs)
- **googleapis** — Google Calendar OAuth + API client, multi-account
- **@anthropic-ai/sdk** — server-side, generates full theme specs from a text prompt
- No database, no ORM — all persistence is flat JSON files on disk (see Storage below)
- No test runner configured; `npm run lint` (ESLint) is the only automated check
- Editor: Cursor, with autosave on

## File structure

```
app/
  layout.tsx              # Wraps everything in ThemeProvider + <Scene /> background
  page.tsx                # Home: Calendar + QueuePreview side-by-side
  setup/page.tsx           # Connect Google accounts, choose + name + color calendars
  queue/page.tsx           # Full queue view (change history across calendars)
  api/
    auth/google/start      # Kicks off OAuth (redirects to Google consent screen)
    auth/google/callback   # Exchanges code, saves encrypted tokens per account
    calendars/list         # Enabled calendars for the UI (id, name, color)
    calendars/select       # Enable/disable/rename/recolor a calendar -> .config.json
    events                 # GET events across all enabled calendars for a date range
    events/create          # Create a Google Calendar event
    events/manage           # PATCH (update) / DELETE an event
    queue                   # GET queue entries (also runs change-detection as a side effect)
                             #   POST to dismiss one entry or all entries for a calendar
    queue/preferences        # Per-person + default queue retention settings
    theme                   # GET current theme / DELETE resets to default
    theme/generate           # POST a text prompt -> Claude generates a full theme spec

components/
  Calendar.tsx             # Top-level widget: view switching, nav, event CRUD wiring
  MonthView.tsx / WeekView.tsx / DayView.tsx   # Week/Day do column-based overlap layout for
                                                # concurrent events (cluster + column assignment)
  EventModal.tsx           # Read-only event detail popup, wired to edit + delete-with-confirm
  EventFormPanel.tsx       # Create/edit slide-over panel (right-side drawer, not a centered modal) —
                            # recurrence, reminders, attendees, all-day
  CalendarSelector.tsx     # Setup page: pick calendars, assign display name + per-calendar color
  QueuePreview.tsx         # Home page's compact queue widget
  QueueView.tsx            # Full queue page: per-person filter, dismiss, retention settings
  ThemeProvider.tsx        # React context: loads/applies/generates/resets theme
  ThemePrompt.tsx          # Header widget: theme name button + prompt input + presets
  scene/
    Scene.tsx              # Composes background/decorations/overlays/particles from theme
    SceneBackground.tsx    # Solid color or animated gradient
    SceneDecorations.tsx   # Edge silhouettes (mountains, coral, treeline, etc.)
    SceneOverlays.tsx      # Radial glow / vignette / wave-band atmospheric layers
    SceneParticles.tsx     # Animated particle systems (stars, bubbles, leaves, etc.)
  ui/                      # shadcn primitives — thin wrappers, edit sparingly

lib/
  storage.ts               # KV document store: JSON files locally, Postgres when POSTGRES_URL set
  config.ts                # 'config' key — which calendars are enabled + their display name/color
  tokens.ts                 # 'tokens' key — AES-256-GCM encrypted OAuth tokens per Google account
  calendars.ts               # Lists calendars available per connected Google account
  events.ts                  # Fetches + normalizes events across all enabled calendars
  snapshots.ts                # .snapshots.json — last-seen state of all events (for diffing)
  diff.ts                      # Compares current events vs. last snapshot -> EventChange[]
  queue.ts                      # .queue.json / .queue-prefs.json — the change queue + retention prefs
  theme.ts                      # .theme.json — the active theme spec + defaults
  utils.ts                      # cn() and other small shared helpers
```

`.env.local` exists (not read/logged by this doc or by Claude) with these variables in use:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NEXTAUTH_URL`,
`TOKEN_ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`. Production additionally uses `POSTGRES_URL`
(storage backend switch), `FAMILY_PASSWORD`, and `AUTH_SECRET` (password auth).

## Auth (household password)

- `proxy.ts` at the project root (Next 16 renamed `middleware.ts` to `proxy.ts`) guards every route
  except `/login`, `/api/auth/login`, Next internals, and static assets. Pages redirect to `/login`;
  API routes get a 401.
- `FAMILY_PASSWORD` unset -> auth is completely off. This is the local-dev default.
- `POST /api/auth/login` checks the password and sets an HttpOnly `solution_auth` cookie: hex
  HMAC-SHA256 (Web Crypto, key = `AUTH_SECRET` falling back to the password) over a versioned
  password string. Changing the password invalidates all sessions. Cookie lives 180 days so phones
  stay signed in. Shared helpers in `lib/auth.ts` (Web Crypto only, so they run in both the proxy
  and route handlers).
- One shared password for the household; there are no per-person accounts.

## Calendars in use

Two Google accounts, four calendars, configured in `.config.json`:

- **noll.nathan@gmail.com**
  - primary calendar → **"Nathan"**
  - a co-parenting calendar under this account → **"Edie"** — shared with Cori, who edits events on
    it from her own separate account. Treat this calendar as jointly owned, not Nathan's personal one.
- **britt.demichele@gmail.com**
  - primary calendar → **"Brittany"**
  - a secondary calendar under this account → **"Parker"**

`lib/events.ts` fetches events per-calendar in parallel and normalizes them into one
`NormalizedEvent` shape tagged with `displayName`/`color`, so the UI never needs to know which
Google account or raw calendar ID an event came from. More accounts/calendars can be added anytime
via `/setup` — nothing besides `.config.json`'s current contents is hardcoded to these four.

**Event colors are per-calendar**, chosen on the setup page (`CalendarSelector.tsx`) and stored in
`.config.json`. These are independent of the active theme and must be preserved across theme
changes — never let a theme swap touch event/calendar colors.

## Storage (dual-backend: local JSON files or Postgres)

All persistence goes through `lib/storage.ts`, a key-value document store with two backends:
- **No `POSTGRES_URL` set** (local dev today): each key is a flat JSON file at the project root
- **`POSTGRES_URL` set** (Vercel/Neon, or local testing against a real DB): a single `kv_store`
  table (`key text PRIMARY KEY, value jsonb, updated_at timestamptz`), one row per key, auto-created
  on first use. Uses the `pg` driver with a small pool cached on `globalThis` for dev hot-reload.

The keys and their owning modules:

| Key | File (file backend) | Module | Contents |
|---|---|---|---|
| `config` | `.config.json` | `lib/config.ts` | Enabled calendars: account email, calendar ID, display name, color |
| `tokens` | `.tokens.json` | `lib/tokens.ts` | OAuth tokens per Google account, **encrypted** (AES-256-GCM, key from `TOKEN_ENCRYPTION_KEY`) — encrypted in both backends |
| `snapshots` | `.snapshots.json` | `lib/snapshots.ts` | Last-fetched state of every event, used as the diff baseline |
| `queue` | `.queue.json` | `lib/queue.ts` | Detected change entries (new/changed/deleted events) |
| `queue-prefs` | `.queue-prefs.json` | `lib/queue.ts` | Per-person + default retention settings for queue entries |
| `theme` | `.theme.json` | `lib/theme.ts` | The currently active theme spec |
| `event-tags` | `.event-tags.json` | `lib/tags.ts` | Solution-only "also for" tags: eventId -> calendarKeys or `'family'`. Never written to Google. |

Rules:
- All `lib/*.ts` storage functions are **async** (`await getConfig()`, `await saveTheme(...)`, etc.).
  API routes and Server Components never touch `fs` or `pg` directly — always go through the
  module's get/save functions, which go through `readStore`/`writeStore`/`deleteStore`.
- To move local file data into Postgres: `node --env-file=.env.local scripts/migrate-to-db.mjs`
  (copies the six files verbatim into `kv_store`; tokens stay encrypted; safe to re-run).
- No locking/transactions — writes are whole-document upserts. Fine at single-family scale.
- **Never read, log, or print the contents of `.env.local`, `.tokens.json`, or `.config.json`.**

## Theming architecture (CSS variables via ThemeProvider)

Themes are **data, not code** — one `Theme` object (`lib/theme.ts`) fully describes colors,
background, particles, overlays, and decorations. No component branches on "which theme is active."

1. `.theme.json` holds the active theme server-side (falls back to `DEFAULT_THEME`, "Slate", if
   missing/corrupt).
2. `ThemeProvider` (`components/ThemeProvider.tsx`) fetches it on mount and writes each color onto
   `document.documentElement` as CSS custom properties via `style.setProperty`.
3. `app/globals.css` declares those variables on `:root` as defaults, then re-exposes them through
   Tailwind v4's `@theme inline` block. **Always use the resulting theme utility classes, never
   Tailwind's default slate/gray palette or a hardcoded hex** in themed UI:
   - `bg-bg`, `bg-surface`, `bg-surface-elevated`
   - `border-border-themed`
   - `text-text`, `text-text-muted`, `text-text-subtle`
   - `bg-accent`, `bg-accent-hover`
   - `text-success-themed`, `text-danger-themed`
4. Container surfaces should use the `bg-surface/80 backdrop-blur` pattern (see `MonthView.tsx`,
   `WeekView.tsx`, `DayView.tsx`, `QueuePreview.tsx`) so the animated `Scene` shows through instead
   of being fully occluded by an opaque card.
5. `components/scene/Scene.tsx` renders the non-color parts of the theme (animated gradient
   background, particle systems, silhouette decorations, atmospheric overlays) as an absolutely
   positioned layer behind page content.
6. New themes are generated by `POST /api/theme/generate`, which sends a detailed system prompt to
   Claude Sonnet describing the full JSON schema and expects strict JSON back. The result is saved
   via `saveTheme()` and immediately applied.
7. `ThemePrompt.tsx` is the UI entry point — header button showing the current theme name, expands
   into a prompt input with presets (ocean, space, rainbow, etc.) and a reset-to-Slate button.

When adding themeable UI: add the color to `Colors` in `lib/theme.ts`, wire it through
`globals.css` (`:root` default + `@theme inline` mapping), then use the Tailwind class it produces.

## Feature status

**Done:**
- Google OAuth setup, multi-account calendar selection with per-calendar color picker
- Full event CRUD (create/edit/delete) via the `EventFormPanel` slide-over
- Month/Week/Day views, with column-based overlap layout for concurrent events in Week/Day
- View switching + prev/today/next navigation
- Event detail modal with edit + delete confirmation
- Queue system with per-person clear/retention preferences
- AI theming via `/api/theme/generate` (Claude Sonnet, rich scene spec) + header `ThemePrompt` widget
- Family tagging ("also for"): Solution-only tags on events (`lib/tags.ts`, `/api/tags`). Tag people
  or "Family" via chips in the event form; tagged people get color dots on event pills (`TagDots`),
  an "Also for" row in the detail modal, and the event's changes in their queue filter. Tags resolve
  at read time (events join in `fetchAllEvents`, queue entries in `/api/queue` GET), so tagging an
  event later still propagates everywhere. Nothing is ever written to Google Calendar.

**Not yet done** (priority order):
1. Theme-token polish pass on `QueueView`, `CalendarSelector`, and `app/setup/page.tsx` /
   `app/queue/page.tsx` — these still use hardcoded `bg-slate-*`/`text-slate-*` classes instead of
   the theme tokens above. Confirmed still present as of this writing.
2. Voice input via the Web Speech API + a Claude-based intent parser (create event / change theme /
   query calendar). Not started — no speech/voice code exists in the repo yet.
3. Kiosk polish for the Raspberry Pi target: fullscreen mode, auto-refresh events every ~5 min,
   touch target sizing, a screen-on/wake strategy. Not started.
4. ~~Migrate storage to Postgres~~ — done: dual-backend `lib/storage.ts` (files locally, Postgres
   when `POSTGRES_URL` is set). Remaining: provision the Neon/Vercel database, set env vars in
   Vercel, run `scripts/migrate-to-db.mjs` to copy local data up.
5. ~~Add password auth~~ — done: `proxy.ts` + `/login` + `/api/auth/login` (see Auth section).
   Activates when `FAMILY_PASSWORD` is set.
6. Deploy to Vercel production. Remaining manual steps: Neon Postgres from Vercel Marketplace,
   set env vars in Vercel (`GOOGLE_*`, `TOKEN_ENCRYPTION_KEY`, `ANTHROPIC_API_KEY`,
   `FAMILY_PASSWORD`, `AUTH_SECRET`), add the production callback URL to the Google OAuth client,
   run `scripts/migrate-to-db.mjs` locally with `POSTGRES_URL` set.

**Vercel builds are currently expected to fail on push** — env vars aren't set in Vercel yet and
storage hasn't been migrated off local JSON files. Ignore the red X on deployments until the
web-access pass (items 4-6 above) is actually underway.

## Patterns to follow

- **Multi-account OAuth**: every Google API call needs both `accountEmail` (to look up the right
  token via `lib/tokens.ts`) and `calendarId`. Always build a fresh `google.auth.OAuth2` client from
  the stored per-account token — see `getCalendarClient` in `app/api/events/manage/route.ts` for the
  canonical pattern. Don't assume a single global Google client.
- **Normalize before rendering**: `NormalizedEvent` (`lib/events.ts`) is the single event shape the
  UI works with. Extend this type for new fields rather than leaking raw Google Calendar API shapes
  into components.
- **Change detection is snapshot-diffing, not webhooks**: `GET /api/queue` fetches current events,
  diffs against `.snapshots.json` via `lib/diff.ts`, appends new `EventChange`s to the queue, then
  overwrites the snapshot. Pull-based, driven by client polling (`QueueView` polls every 60s). Follow
  the same snapshot-then-diff shape for any new "detect X changed" feature.
- **Server-only file access**: all `fs` usage lives in `lib/`, called only from Server Components or
  Route Handlers — never from `'use client'` components. Client components talk to `lib/`
  exclusively through the `/api/*` routes.
- **Types colocated with their `lib/` module**: e.g. `CalendarConfig`/`AppConfig` in `lib/config.ts`,
  `Theme`/`Colors`/`Particle`/etc. in `lib/theme.ts`. Client components re-declare narrower local
  copies where they only need a subset (e.g. `ThemeProvider.tsx`'s local `Theme` type) instead of
  importing server-side `lib/*.ts` types directly — follow that split for new client components.

## Working notes (things that have and haven't worked well)

- `printf` writes and Cursor's autosave both work reliably.
- Editing whole files by rewriting is safer than surgical `sed` edits in this repo.
- **Heredocs mangle JSX** — avoid them when writing/editing `.tsx` files.
- **Restart the dev server** after changing env vars or any `lib/` file that Next may have cached.

## Ground rules for working together

- Propose a plan before non-trivial changes; get review before implementing.
- Show diffs rather than silently applying changes.
- Match existing patterns: theme tokens, storage-lib boundaries, API route structure.
- Ask before adding new dependencies.
- Never touch or log the contents of `.env.local`, `.tokens.json`, or `.config.json`.
- After each change, the user tests manually in-browser at `localhost:3000` — don't claim a UI
  change works without that manual check having happened.
- Style for written responses/docs to this user: no em dashes, concise and conversational, prefer
  bullets over prose for reference content.
