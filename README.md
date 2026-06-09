# radcliffe.run

Website and member platform for Run Together Radcliffe (RTR), a running group of ~600
members in Radcliffe, Greater Manchester. Replaces the old RunTogether/ClubSpark site.

Live at https://radcliffe.run

## What it does

- Member registration with GDPR-compliant emergency contacts and consent capture
- Run schedule (synced from Google Sheets) with interactive GPX route maps (71+ routes)
- Weekly member email (composed and scheduled in the admin area, sent via Brevo)
- Admin area: members, runs, routes, emails, roundup posts, site settings
- Run leader tools: emergency contact lookup, C25K roster
- Couch to 5K module: public programme page, registration, member programme view
- Light/dark theme and font size preference per member
- PWA: installable, offline page, service worker

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database + auth | Supabase (separate dev and production projects) |
| Content email | Brevo transactional API (`lib/brevo.ts`) |
| Auth email (OTP/magic link) | Supabase Auth via Resend SMTP (configured in Supabase dashboard) |
| Maps | Leaflet.js |
| Hosting | Vercel (`main` = production, `staging` = preview) |
| DNS + inbound mail | Cloudflare (Email Routing forwards hello@ to the group Gmail) |

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit   # typecheck
```

`.env.local` points at the DEV Supabase project, not production. Local email sends hit
the dev members table only. See `docs/ARCHITECTURE.md` for the full environment variable
list and the dev/production split.

## Deployment

Staging-first, always:

1. Push changes to the `staging` branch - Vercel builds a preview URL
2. Review and approve on the preview
3. Merge `staging` into `main` - Vercel deploys to radcliffe.run

Never push directly to `main`. Before any deploy, run the pre-deployment checklist in
`docs/ARCHITECTURE.md` (schema check, lint, scope review).

## Documentation

- `AGENTS.md` - critical invariants and rules. Read before changing anything.
- `docs/ARCHITECTURE.md` - full architecture reference: schema, email system, auth,
  theming, cron, deployment, gotchas.
