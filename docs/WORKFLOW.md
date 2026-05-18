# Development workflow

Three long-lived branches. New work flows feature → staging → main.

```
feature branch  ──►  staging  ──►  main
   ephemeral       pfa-staging…    pfa.worldsfair.co
   preview URL     .worldsfair.co  (production)
```

## Branches

| Branch | Vercel role | Where it lives |
|---|---|---|
| `main` | Production | `pfa.worldsfair.co` |
| `staging` | Stable staging (long-lived) | `pfa-share.vercel.app` |
| `feature/*` | Ephemeral preview | `pfa-share-git-<branch>-…vercel.app` |

## Day-to-day flow

1. **Start a feature from `main`**
   ```bash
   git checkout main
   git pull
   git checkout -b feature/short-name
   ```
2. **Work locally, commit, push the branch**
   ```bash
   git push -u origin feature/short-name
   ```
   Vercel auto-creates a preview deploy at a URL like
   `pfa-share-git-feature-short-name-<team>.vercel.app`. Share it for ad-hoc
   review.
3. **Merge to `staging` when the work feels real**
   ```bash
   # Option A: from the GitHub PR UI (recommended for review)
   gh pr create --base staging --head feature/short-name --title "…"

   # Option B: locally
   git checkout staging
   git pull
   git merge --no-ff feature/short-name
   git push
   ```
   Vercel deploys staging to `pfa-share.vercel.app`. **Smoke-test there**
   against the production Supabase project (same env vars).
4. **Promote `staging` → `main`** once staging looks good:
   ```bash
   gh pr create --base main --head staging --title "Promote staging → main"
   # or locally:
   git checkout main
   git pull
   git merge --no-ff staging
   git push
   ```
   Vercel deploys to production.
5. **Delete the feature branch**:
   ```bash
   git push origin --delete feature/short-name
   git branch -d feature/short-name
   ```

## Hotfix flow (rare)

If production is broken and `staging` is mid-feature:

```bash
git checkout main
git pull
git checkout -b hotfix/short-name
# fix, commit, push
gh pr create --base main --head hotfix/short-name
# after merge:
git checkout staging
git merge main           # bring the hotfix into staging
git push
```

## What's the same on staging and prod

- Same Supabase project (`mihxhhmcypuadnzbgpgb`)
- Same Resend domain (`worldsfair.co`)
- Same `RESEND_API_KEY`, `SESSION_SECRET`, `CRON_SECRET`, `GP_EMAIL`

Vercel's env vars panel lets you scope per-environment if you ever want a
separate staging Supabase or a different `NEXT_PUBLIC_APP_URL`. We currently
share everything across both — simpler and shared analytics during the
pre-launch phase.

## Vercel setup for the staging URL (one-time, already done)

Staging uses the free Vercel-provided `pfa-share.vercel.app` subdomain
mapped to the `staging` branch — no DNS needed. If you ever want to
upgrade to a branded URL (e.g. `staging.pfa.worldsfair.co`):

1. **Vercel dashboard** → project `pfa-share` → **Settings → Domains**
2. **Add Domain** → `staging.pfa.worldsfair.co`
3. When Vercel asks which Git branch to map it to, choose **`staging`**
4. Vercel gives you a CNAME target. In `worldsfair.co` DNS, add:
   - Type: `CNAME`
   - Host: `staging.pfa`
   - Value: `cname.vercel-dns.com`
   - TTL: auto (300)
5. Wait for SSL to issue (~5 min).

## Production-branch setting (one-time)

In Vercel: **Settings → Git → Production Branch** should be set to `main`.
That way only commits on `main` deploy to `pfa.worldsfair.co`; everything
else is a preview.

## What about emergency rollback?

In **Vercel → Deployments**, every successful deploy is listed with a
**"Promote to Production"** button. If something breaks, find the last
known-good deployment and promote it — instant rollback without a git
revert. Then fix forward when you can.
