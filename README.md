# PFA Share

A DocSend-style sharing tool for the Palace of Fine Arts deck. Per-recipient
links, per-slide dwell tracking, an admin dashboard, and a gate for organic
visitors after the free preview.

Live at **pfa.worldsfair.co**.

## What's in the box

- **`/`** — public landing. Renders the first 5 slides of the deck. Advance
  past slide 4 and a gate modal asks for an email; verify with a 6-digit code
  and the rest of the deck splices in.
- **`/d/<token>`** — per-recipient link. Renders the full 28-panel deck, no
  Supabase auth required. Tracks per-slide dwell and per-slide revisits.
- **`/admin`** — analytics dashboard. Recent sessions, per-link drawer with
  aggregated and per-session breakdowns, approvals queue, settings.
- **`/disabled`** — friendly fallback if you visit `/disabled` directly.
  (Stale `/d/<token>` URLs now redirect to `/` so the visitor still sees the
  free preview.)

## Tech

- Next.js 16, App Router, JavaScript
- Supabase (auth + Postgres + RLS)
- Resend (OTP emails + admin notifications)
- Vercel (hosting + 1-min cron for idle-close)
- `nanoid` for 6-char personal-link tokens
- `react-hot-toast` for admin UI feedback
- Vitest for unit tests

No chart library. The Activity line chart, time-per-slide bars, and visitor
breakdowns are hand-rolled SVG / CSS.

## Local development

```bash
# 1. Install
npm install

# 2. Copy the example env and fill it in (see "Environment variables" below)
cp .env.example .env.local

# 3. Run the dev server
npm run dev
```

Open `http://localhost:3000`.

### Demo mode (no Supabase required)

If you set `LOCAL_DEV_ADMIN_BYPASS=true` in `.env.local` *without* configuring
Supabase, the admin pages run against in-memory dummy data so you can click
through the full UI immediately:

```
LOCAL_DEV_ADMIN_BYPASS=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
GP_EMAIL=camwiese@gmail.com
AUTH_SENDER_EMAIL=admin@worldsfair.co
SESSION_SECRET=dev-only-not-secret-replace-before-deploy-1234567890abcdef
```

Demo data: 8 links across the sharing-signal buckets, ~25 sessions over 30
days, 3 pending access requests. State lives in memory, so it resets when
the dev server restarts.

### Real Supabase locally

Once you've provisioned a Supabase project (see `docs/DEPLOY.md`), add the
real keys to `.env.local` and **remove** `LOCAL_DEV_ADMIN_BYPASS`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=re_...
GP_EMAIL=camwiese@gmail.com
AUTH_SENDER_EMAIL=admin@worldsfair.co
SESSION_SECRET=<openssl rand -hex 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then seed dummy data:

```bash
node scripts/seed-dummy.js
```

This wipes `events`, `sessions`, `links`, and `access_requests`, then inserts
the same demo dataset. Preserves `allowed_emails` so the admin can still log
in.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run verify` | Lint + tests |
| `npm run images` | Re-optimize panel images into AVIF/WebP/JPEG variants (uses `sharp`) |
| `node scripts/seed-dummy.js` | Seed dummy data against the configured Supabase project |

## Project layout

```
app/
  page.js                  → public landing (panels 0-4 + gate)
  deck/page.js             → /deck (full deck for authed viewers)
  d/[token]/page.js        → /d/<token> (personal-link deck)
  admin/                   → /admin/*
  api/
    auth/                  → OTP request/verify/check, sign-out
    track[/init]/          → authed viewer tracking
    d/[token]/             → personal-link init + track
    admin/                 → admin CRUD endpoints
    deck/gated/            → server-renders gated panels HTML
    cron/close-idle/       → 1-min cron
  styles/
    deck.css               → deck styling (ported from static site)
    admin.css              → admin styling
components/
  Deck.jsx                 → client deck navigator (was script.js)
  DeckPanels.jsx           → server component, the 28 panel sections
  PublicDeck.jsx           → wraps Deck with gate behaviour
  GateModal.jsx
  TrackerMount.jsx         → mounts useSlideTracker
  admin/                   → ActivityFeed, LinksTable, SessionDrawer, etc.
hooks/
  useSlideTracker.js       → 10s heartbeat, 90s idle, flush-on-change
lib/
  supabase/                → server + client + middleware (copied verbatim from WSV)
  admin.js, adminAuth.js
  email.js, notifications.js
  sharingSignal.js         → green/yellow/grey "shared?" signal
  fingerprint.js           → client-side SHA-256 of canvas + WebGL + UA + screen + tz
  geo.js, ua.js
  format.js
  deckNav.js               → pub/sub for slide-change events
  demoData.js              → in-memory dataset for dev demo mode
  panelHtml.js             → raw HTML strings for the gated splice-in
  requireAdmin.js
  sessionCookie.js         → HMAC-signed cookie for tokenized sessions
constants/
  slides.js                → SLIDE_TITLES + count
  theme.js                 → copied from WSV
supabase-migrations/
  001_init.sql             → run this against a fresh Supabase project
scripts/
  optimize-images.mjs
  seed-dummy.js
```

## How the tracker works

`hooks/useSlideTracker.js`:

- 10-second heartbeat while the tab is visible and the user is active
- 90-second idle timeout — beyond that the accumulator pauses
- 1-second minimum recorded dwell (drops are noisy below that)
- Flush on every slide change (records time on the slide being left)
- Flush on `pagehide` via `navigator.sendBeacon`
- Flush on `visibilitychange` → hidden

Each flush POSTs `{slideIdx, seconds, slideVisits: {N: count}}`. The server
merges this into `sessions.slide_dwells` and `sessions.slide_visits`. The
`slide_visits` map enables the "×N revisited" badges in the per-session
slide bar charts.

## Fingerprinting (the "sharing detected" signal)

`lib/fingerprint.js` builds a SHA-256 of canvas-2D output, WebGL renderer
string, user agent, screen size, timezone, and locale. It runs once on
deck mount and is stored on `sessions.fp_hash`. **It is never used to
block access** — only to color the green/yellow/grey sharing dot in the
admin dashboard.

False positives happen on privacy browsers (Brave, Tor, Safari with
anti-fingerprinting) and after major browser updates. Treat the signal as
"smoke detector," not authentication.

## Deployment

See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the full Supabase + Resend +
Vercel walkthrough.

## License

Internal — not licensed for public use.
