# Deploy guide — PFA Share

Walkthrough for getting the app from a fresh clone to a live deployment at
**pfa.worldsfair.co**. Modelled on the Waller Street Ventures deploy doc;
the moving parts are the same — Supabase + Resend + Vercel + DNS.

If you're setting up a *new* environment in the future (staging, replacement
domain, etc.), follow this from the top.

---

## 0. Prerequisites

- Repo pushed to GitHub
- Owner-level access to: Vercel, Supabase, Resend, and the DNS provider for
  `worldsfair.co`
- An admin email you control (`camwiese@gmail.com` for production)

---

## 1. Supabase

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name: `pfa-share` · Region: closest to the GP · Generate a strong
   database password and save it to 1Password (you won't need it often but
   you'll need it once)
3. Wait for the project to finish provisioning (~2 min)

### 1.2 Run the migration

1. Open **SQL Editor** in the dashboard
2. New query → paste the entire contents of
   `supabase-migrations/001_init.sql`
3. Run

This creates the gating tables (`allowed_emails`, `access_requests`,
`otp_attempts`, `partner_admins`) and the deck-specific tables (`links`,
`sessions`, `events`, `settings`), with RLS enabled to deny anon and
authenticated roles. The service-role key bypasses RLS — the app uses it
for every write. Also seeds `camwiese@gmail.com` into `allowed_emails`.

### 1.3 Copy the API keys

**Settings → API**. You need three values:

| Supabase label | Goes in env as |
|---|---|
| Project URL (`https://*.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` | `SUPABASE_SERVICE_ROLE_KEY` *(secret)* |

Save them somewhere safe — you'll need them in Vercel.

### 1.4 Wire Auth SMTP to Resend

Do this **after** you've created a Resend API key in section 2.

**Project Settings → Auth → SMTP Settings → Enable Custom SMTP:**

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | `hello@worldsfair.co` |
| Sender name | `World's Fair Co.` |

### 1.5 Customize the OTP email template

**Authentication → Email Templates**. Update *both* **Magic Link** and
**Confirm signup** templates so the flow looks the same for returning and
first-time visitors. Use this exact HTML in both — it shows only the code,
not the magic-link button (avoids a rate-limit loop when the user opens
the email in a different browser than the tab they started in):

Set the **Subject** to `Your verification code: {{ .Token }}` and paste
the following HTML as the body:

```html
<div style="font-family: 'Inter', -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 0;">
  <div style="font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 400; color: #8e2832; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 32px;">Palace of Fine Arts</div>
  <p style="font-size: 15px; line-height: 1.7; color: #3d3d38; margin: 0 0 20px 0;">Here's your verification code to view the Palace of Fine Arts project:</p>
  <div style="font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #8e2832; background: #f1ece1; border: 1px solid #dedad0; border-radius: 6px; padding: 20px 24px; text-align: center; margin: 0 0 28px 0;">{{ .Token }}</div>
  <p style="font-size: 13px; line-height: 1.6; color: #6b6b63; margin: 0 0 8px 0;">Enter this code on the deck. It expires in 10 minutes.</p>
  <p style="font-size: 13px; line-height: 1.7; color: #6b6b63; margin: 28px 0 0 0;">If you have any trouble, reply to this email or text/call Cameron at 360-318-4480.</p>
</div>
```

### 1.6 URL configuration

**Authentication → URL Configuration**:

- **Site URL**: `https://pfa.worldsfair.co` (use `http://localhost:3000`
  if you're still pre-launch)
- **Redirect URLs** (add each on its own line):
  - `http://localhost:3000/**`
  - `https://pfa.worldsfair.co/**`
  - `https://pfa-share-*.vercel.app/**` *(wildcard for Vercel preview deploys
    — you'll fill in the exact subdomain after step 3)*

---

## 2. Resend

### 2.1 Verify the domain

1. [resend.com](https://resend.com) → Domains → **Add Domain** → `worldsfair.co`
2. Resend gives you three DNS records to add:
   - **SPF** (TXT): `v=spf1 include:_spf.resend.com -all`
     ⚠ If `worldsfair.co` already has an SPF record (e.g. from Gmail/Workspace),
     merge — don't add a second TXT.
   - **DKIM** (CNAME on `resend._domainkey.worldsfair.co`)
   - **DMARC** (TXT, optional but recommended):
     `v=DMARC1; p=none; rua=mailto:dmarc@worldsfair.co`
3. Add the records in your DNS provider, then click **Verify** in Resend.
   Usually takes 5–30 minutes to propagate.

### 2.2 Create the API key

API Keys → **Create API Key** → name it `pfa-share-prod` → permissions:
*Full Access* → copy the value.

This key gets used in two places:
- The `RESEND_API_KEY` env var on Vercel (for admin notification emails)
- Supabase's Auth SMTP password (for OTP emails)

Same key, two places.

---

## 3. Vercel

### 3.1 Import the project

1. Push the `gated-share` (or `main`) branch to GitHub
2. [vercel.com](https://vercel.com) → **Add New** → **Project** → Import the
   `pfa-share-2` repo
3. Framework: **Next.js** (auto-detected). Root directory: leave at `./`
4. **Don't deploy yet** — set env vars first

### 3.2 Environment variables

In the Vercel import wizard (or Project Settings → Environment Variables
after import), add these. Scope each to **Production, Preview, and
Development**.

| Var | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from §1.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from §1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | from §1.3 |
| `GP_EMAIL` | `camwiese@gmail.com` |
| `RESEND_API_KEY` | from §2.2 |
| `AUTH_SENDER_EMAIL` | `hello@worldsfair.co` |
| `NEXT_PUBLIC_APP_URL` | `https://pfa.worldsfair.co` |
| `SESSION_SECRET` | run `openssl rand -hex 32` locally; paste output |
| `CRON_SECRET` | run `openssl rand -hex 32` locally; paste output |

**Do not** set `LOCAL_DEV_ADMIN_BYPASS` here. That flag is for local dev only.

### 3.3 Deploy

Click **Deploy**. First build takes ~2 min. When it's green, click the
preview URL — you should get the static landing page. (`/admin` will work
once you've also added the Vercel domain to Supabase's redirect allowlist —
see §3.5.)

### 3.4 Verify the cron job

**Project Settings → Cron Jobs**: you should see one entry,
`/api/cron/close-idle`, schedule `0 12 * * *` (daily at 12:00 UTC). This
is declared in `vercel.json` and is the most frequent Hobby tier allows.
On Pro you can change it to `* * * * *` for minute-level session close
and near-real-time summary emails.

### 3.5 Add the Vercel preview domain to Supabase

Copy the assigned Vercel domain (e.g. `pfa-share-2-abc123.vercel.app`) and
go back to **Supabase → Authentication → URL Configuration → Redirect
URLs**. Add `https://pfa-share-2-*.vercel.app/**` if it's not already there.

---

## 4. Custom domain — pfa.worldsfair.co

### 4.1 Add the domain in Vercel

**Project Settings → Domains** → Add → `pfa.worldsfair.co`. Vercel shows
you a CNAME target (something like `cname.vercel-dns.com`).

### 4.2 Add the DNS record

In your `worldsfair.co` DNS provider:

| Type | Host | Value | TTL |
|---|---|---|---|
| CNAME | `pfa` | `cname.vercel-dns.com` | auto / 300 |

### 4.3 Wait + verify

Vercel auto-issues a Let's Encrypt SSL cert as soon as DNS resolves
(usually < 5 min). The domain panel will show a green checkmark when
ready.

### 4.4 Update Supabase

**Supabase → Authentication → URL Configuration**:
- Change **Site URL** to `https://pfa.worldsfair.co`
- Confirm `https://pfa.worldsfair.co/**` is in **Redirect URLs**

---

## 5. Smoke test

In a fresh incognito window:

1. **Admin login**. `https://pfa.worldsfair.co/admin` → enter
   `camwiese@gmail.com` → check inbox for the 6-digit code from
   `hello@worldsfair.co` → enter code → land on the Activity tab (will be
   empty).
2. **Create a personal link**. Links tab → type "Test viewer" → Enter →
   toast should fire saying `Copied: https://pfa.worldsfair.co/d/xxxxxx`.
3. **Open the link** in a second incognito window. Full 28-slide deck loads,
   no gate. You should also receive a "Test viewer just opened the deck"
   notification email.
4. **Verify tracking**. With DevTools open in that second window, you should
   see `POST /api/d/<token>/track` requests firing every ~10 seconds, plus
   one immediately on each slide change.
5. **Verify the gate modal**. Open `https://pfa.worldsfair.co/` in a third
   incognito window. Advance past slide 4 — the modal should appear with
   "Please confirm your email to continue".
6. **Idle close**. Leave window #2 idle for ~2 minutes. Within a minute
   after the 90-second idle timeout, you should receive a session-summary
   email with the per-slide bar chart.

If any of these fail, the most common causes are:
- Email not arriving → check Supabase Auth logs and Resend logs
- 401 / 403 on `/admin` → `GP_EMAIL` mismatch in Vercel env
- 503 on `/api/track/init` → service-role key wrong or Supabase URL wrong
- Cron not firing → Hobby tier limit; lazy-close fallback covers this

---

## 6. Sending personal links

To share with someone:

1. Sign in to `/admin/links`
2. Type their name (e.g. "Jane @ Sequoia"), optional private note
3. ⌘↵ (or just Enter) creates the link AND copies the URL to your clipboard
4. Paste into email / Slack / wherever

They open the URL → see the full deck immediately, no email required. Their
activity shows up in `/admin/links/<id>` and `/admin`.

To revoke a link: flip the **Active** toggle off in the Links table or in
the link drawer. Visitors who hit the now-disabled URL get redirected to
the public preview deck at `/` (so they still see slides 0–4 and can request
access).

---

## 7. Reset / replay (for staging or a clean prod)

If you want to wipe the database and re-seed dummy data (e.g. for a demo):

```bash
# 1. From SQL Editor or psql, run:
DELETE FROM events;
DELETE FROM sessions;
DELETE FROM links;
DELETE FROM access_requests;
-- (leaves allowed_emails alone so admin can still log in)

# 2. Locally, with .env.local pointing at the target Supabase project:
node scripts/seed-dummy.js
```

Don't run this against the real production database after launch unless you
mean it.

---

## 8. Future maintenance

- **New admin user**: add their email to `allowed_emails` and `partner_admins`
  via SQL editor, or add their email to `GP_EMAIL` env (comma-separated).
- **Rotating Resend / Supabase keys**: update in both Vercel env and
  Supabase Auth SMTP password. Re-deploy.
- **Changing the deck content**: edit `components/DeckPanels.jsx` and
  `lib/panelHtml.js` (the two need to stay in sync — `panelHtml.js` powers
  the gated splice-in, `DeckPanels.jsx` powers SSR). Re-run
  `npm run images` if you add or replace images.
- **Schema changes**: add a new file in `supabase-migrations/` (e.g.
  `002_<feature>.sql`) and run it against the dashboard SQL editor. The
  app reads schema lazily; no special order required.
