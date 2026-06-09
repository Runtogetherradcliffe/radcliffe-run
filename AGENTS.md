<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Critical invariants

These rules exist because breaking them has taken down live functionality before.
Full background in `docs/ARCHITECTURE.md`. Read this whole file before changing code.

## Database and auth

- **`members.id` is NOT the Supabase auth UUID.** It is `gen_random_uuid()` assigned at
  registration. Never write an RLS policy as `auth.uid() = id` - it will never match.
  Member self-access RLS must use `(SELECT auth.email()) = email`.
- **Admin and leader pages must use `supabaseAdmin()`** (service role, bypasses RLS) -
  see `lib/supabase.ts`. The user-JWT client (`utils/supabase/server.ts`) is subject to
  RLS and returns no rows for queries that scan all members. A past security fix that
  narrowed RLS broke every admin/leader page that relied on the wrong client.
- **`app/api/join/route.ts` INSERTs every member column unconditionally** (including
  `c25k_session` for regular signups). Any column referenced there that is missing from
  the production `members` table breaks registration for ALL users. Before deploying any
  change to this file, verify every column in the INSERT exists on production.
- Schema changes go to production Supabase BEFORE the code that uses them is deployed.

## Email

- **Two separate email systems.** Content email (newsletter, welcome, contact form) goes
  via the Brevo transactional API in app code (`lib/brevo.ts`). Login OTP and magic-link
  emails are sent by Supabase Auth via Resend SMTP configured in the Supabase dashboard,
  NOT in this codebase. Do not remove the Resend account or its `resend._domainkey` DNS
  record - sign-in would break for everyone.
- **Route links in emails must be `/routes#<slug>`, never `/routes/<slug>`.** The routes
  page selects routes client-side via the URL hash; there is no per-route page. Path-style
  links 404'd in a sent newsletter. `app/routes/[slug]/page.tsx` exists only to redirect
  old path-style links to the hash form - keep it.
- The newsletter sends one Brevo request per member (bounded concurrency 5), because
  Brevo's batch `messageVersions` cannot vary HTML or headers per recipient and each
  member needs a personalised unsubscribe link. Keep `maxDuration = 60` on the cron and
  send routes, and keep mark-sent-only-on-success behaviour.

## Styling and theming

- **Never hardcode hex colours or px font sizes in TSX.** Use the CSS variables
  (`var(--bg)`, `var(--card)`, `var(--orange)`, `var(--text-sm)` etc.). This includes
  inside template literals, which bulk find/replace misses.
- **Theme variables live in THREE places that must stay in sync:** `LIGHT_VARS` in
  `components/ThemeProvider.tsx`, the `lv` object in the inline anti-flash script in
  `app/layout.tsx`, and the `[data-theme="light"]` block in `app/globals.css`. A new
  colour token goes in all three plus a dark default in `:root`.
- Route map cards use `<ThemeMapImage slug={...} />`, never `<img>` - every route needs
  BOTH a dark webp (`public/route-maps/<slug>.webp`) and a light webp
  (`public/route-maps/light/<slug>.webp`).
- **No em dashes anywhere in source files.** Use a plain hyphen. (The block at the
  top of this file is third-party managed and exempt.)

## Build and deploy

- **Staging-first, mandatory.** Push to `staging` (Vercel preview), get explicit approval,
  then merge `staging` into `main`. Never push directly to `main`.
- **Every change becomes a real git commit on a branch cut from fresh `origin/main`.**
  Past breakage came from branches cut from stale main reverting already-deployed fixes.
- ESLint runs on the Vercel build and unused imports/variables FAIL it. Run
  `npm run lint` and `npx tsc --noEmit` before pushing.
- **Vercel Hobby plan: max one cron schedule per day.** A more frequent schedule fails
  the entire deployment. Current crons: send-emails 8am, gdpr-cleanup 3am.
- Do NOT run `npm audit fix --force` - it downgrades Next.js to an ancient version.
- Tailwind v4: `@import "tailwindcss"` in globals.css, not `@tailwind base/components`.

## Environments

- `.env.local` points at the DEV Supabase project. Production credentials live in
  Vercel env vars and the production Supabase project. Local sends only ever touch dev
  data. `.env.production` in this repo has blank secrets - do not use it.
