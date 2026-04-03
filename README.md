# Sailing Planner

Sailing Planner is a Next.js + TypeScript app for managing one or more boats, their seasons, trip segments, visits, guest access links and cross-boat timeline visibility. The current codebase is already beyond the original starter stage and includes:

- multi-boat dashboard and boat switching
- boat-scoped trip and visit workspaces
- guest invitation links for a season
- user invitations through Supabase Auth
- onboarding tours for invited guests and authenticated users
- public/shared timeline comparison between boats
- local Supabase CLI setup, migrations, seed data and invite email template

Current app version: `0.3.1`

## Product status

The repository currently implements these major flows:

- `Login`
  Password login and magic-link login from [`src/components/auth/auth-form.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/components/auth/auth-form.tsx)
- `Initial password setup`
  Invited users land on [`src/app/auth/set-password/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/auth/set-password/page.tsx) and create their password there
- `Boat planning`
  Trips in [`src/app/boats/[boatId]/trip/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/boats/[boatId]/trip/page.tsx) and visits in [`src/app/boats/[boatId]/visits/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/boats/[boatId]/visits/page.tsx)
- `Guest access`
  Season guest links and guest-only route handling
- `Shared timelines`
  Compare your own boat with one selected external boat in [`src/app/shared/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/shared/page.tsx)
- `Admin`
  Boat administration and user administration for superusers and boat managers

## Main architecture

The schema is centered around boats:

- one `boat` can have multiple `seasons`
- one `season` can have multiple `trip_segments`
- one `season` can have multiple `visits`
- boat access is granted with `user_boat_permissions`
- platform-wide access is granted with `profiles.is_superuser`
- public cross-boat visibility is controlled with `profiles.is_timeline_public`
- guest season links are stored in `season_access_links`

Private note visibility is enforced with separate tables rather than inline fields:

- `trip_segment_private_notes`
- `visit_private_notes`

This allows Supabase RLS to protect private information cleanly.

## Code map

Important runtime pieces:

- [`src/lib/supabase/browser.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/supabase/browser.ts)
  Browser Supabase client
- [`src/lib/supabase/server.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/supabase/server.ts)
  Server Supabase client
- [`src/lib/supabase/middleware.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/supabase/middleware.ts)
  Session refresh and route protection
- [`src/lib/env.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/env.ts)
  URL resolution, redirect building and environment parsing
- [`src/app/admin/actions.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/admin/actions.ts)
  Admin server actions, invitations and season-access link generation
- [`src/lib/boat-data.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/boat-data.ts)
  Viewer context, boat lists, workspaces and shared timeline data

## Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Required

- `NEXT_PUBLIC_APP_URL`
  Public base URL used as a fallback for auth redirects. In local development use `http://localhost:3000`. In production this must be the real public URL of the deployed app.
- `NEXT_PUBLIC_SUPABASE_URL`
  Hosted Supabase project URL.
  Get it from `Supabase Dashboard -> Project Settings -> API -> Project URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Public browser key from Supabase.
  Get it from `Supabase Dashboard -> Project Settings -> API -> Project API keys -> anon / publishable`.
- `SUPABASE_SERVICE_ROLE_KEY`
  Required for admin flows such as user invitations, guest season links and cross-user updates.
  Get it from `Supabase Dashboard -> Project Settings -> API -> Project API keys -> service_role`.

### Optional but recommended

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  Required if you want both:
  - Google Maps rendering in the planning screens
  - Google Places autocomplete/search in trip and visit location fields
  Get it from `Google Cloud Console -> APIs & Services -> Credentials -> API keys`.
- `SUPABASE_PROJECT_REF`
  Needed for Supabase CLI workflows against the hosted project.
  Get it from the project ref shown in the Supabase dashboard URL or `Project Settings -> General`.
- `SUPABASE_DB_PASSWORD`
  Only needed for some linked CLI/database flows.
  This is the database password configured for the hosted Supabase project.
- `SUPABASE_MANAGEMENT_API_KEY`
  Needed if you want `/admin/metrics` to show Supabase platform usage from the Management API.
  Get it from `Supabase Dashboard -> Account -> Access Tokens`.

See the template in [`.env.example`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/.env.example).

## URL and redirect logic

This project resolves auth URLs with [`src/lib/env.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/env.ts).

Rules that matter in practice:

- if a real request origin is available and is not loopback, it is preferred
- otherwise the app falls back to `NEXT_PUBLIC_APP_URL`
- if that is still local, it falls back to `http://localhost:3000`

This means:

- in local development, `NEXT_PUBLIC_APP_URL=http://localhost:3000` is correct
- in production, `NEXT_PUBLIC_APP_URL` must be your real public URL or emails and auth redirects may point to `localhost`

## Supabase configuration

### Local Supabase CLI config

Local Supabase is configured in [supabase/config.toml](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/config.toml).

Important local values currently in use:

- `site_url = "http://localhost:3000"`
- additional redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`
- local invite email template:
  - subject in Spanish
  - content path `./supabase/templates/invite.html`

The local email inbox is Inbucket on:

- `http://127.0.0.1:54324`

Supabase Studio local is on:

- `http://127.0.0.1:54323`

### Hosted Supabase dashboard checklist

These values must be configured manually in the hosted Supabase project.

#### 1. Authentication > URL Configuration

Set:

- `Site URL`
  Your real public frontend URL
  Example: `https://your-site.netlify.app`

Add these URLs in `Additional Redirect URLs`:

- `http://localhost:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback`
- `http://localhost:3000/auth/set-password`
- `http://127.0.0.1:3000/auth/set-password`
- `https://your-site.netlify.app/auth/callback`
- `https://your-site.netlify.app/auth/set-password`

If you use a custom domain, add that domain too:

- `https://app.yourdomain.com/auth/callback`
- `https://app.yourdomain.com/auth/set-password`

#### 2. Authentication > Providers > Email

Enable the email provider and the flows you want:

- password login
- email OTP / magic link if you want that mode active

Local config disables email confirmations for convenience, but hosted behavior is controlled in the Supabase dashboard.

#### 3. Authentication > Email Templates

The repo includes a local invite template in:

- [supabase/templates/invite.html](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/templates/invite.html)

Important:

- local Supabase can read that file directly from `supabase/config.toml`
- hosted Supabase will not automatically read your repo file
- for production you must copy the HTML into the hosted `Invite` email template in the dashboard

That template expects metadata already sent by the app:

- `preferred_language`
- `inviter_email`
- optional `display_name`

#### 4. Authentication > SMTP Settings

If you keep the default Supabase SMTP, email sending is rate-limited very aggressively and is not suitable for production. For real usage:

- enable custom SMTP
- configure your provider
- then review `Authentication > Rate Limits`

#### 5. Authentication > Rate Limits

If invitations or magic links fail with `email rate exceeded`, check:

- email sending limits
- whether you are still using the default SMTP

#### 6. Account > Access Tokens

If you want the admin metrics page to show Supabase platform usage, create a personal access token in:

- `Supabase Dashboard -> Account -> Access Tokens`

Store it as:

- `SUPABASE_MANAGEMENT_API_KEY`

Important:

- this is not the anon key
- this is not the service role key
- it is an account-level token for the Supabase Management API

### Hosted database and migrations

When you change schema locally, push it to the hosted project with:

```bash
npm run supabase:link
npm run db:push
```

## Hosting configuration

This project currently assumes a hosted frontend such as Netlify.

### Required environment variables in the hosting platform

Set these in Netlify or your chosen platform:

- `NEXT_PUBLIC_APP_URL`
  Example: `https://your-site.netlify.app`
- `NEXT_PUBLIC_SUPABASE_URL`
  Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Your public anon key
- `SUPABASE_SERVICE_ROLE_KEY`
  Needed for invitations and admin server actions
  Source: `Supabase Dashboard -> Project Settings -> API`

Optional:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  Shared key for both the live Google map and the Google place search/autocomplete UI
  Source: `Google Cloud Console -> APIs & Services -> Credentials`
- `SUPABASE_PROJECT_REF`
  Source: `Supabase Dashboard -> Project Settings -> General`
- `SUPABASE_DB_PASSWORD`
  Source: your hosted database password
- `SUPABASE_MANAGEMENT_API_KEY`
  Needed if `/admin/metrics` should show Supabase platform usage from the Management API
  Source: `Supabase Dashboard -> Account -> Access Tokens`

There is currently no separate environment variable for "Google search". The place search/autocomplete feature uses the same `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Hosting notes

- the app label shown in the dashboard uses the package version plus the current commit when available
- after a fresh deploy, reload old open tabs if you see `Server Action was not found on the server`
- if invitation emails point to `localhost`, the problem is almost always `NEXT_PUBLIC_APP_URL` or missing hosted redirect URLs in Supabase

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Frontend:

- [http://localhost:3000](http://localhost:3000)

## Local Supabase workflow

Install Supabase CLI if needed:

```bash
brew install supabase/tap/supabase
```

Useful scripts from [package.json](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/package.json):

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:status`
- `npm run db:reset`
- `npm run db:push`
- `npm run db:diff`
- `npm run db:types`

Suggested local flow:

```bash
npm run supabase:start
npm run db:reset
npm run dev
```

If `npx` complains about cache permissions on your machine, use a temporary cache for that command:

```bash
npm_config_cache=/tmp/npm-cache npm run supabase:start
```

## Auth flows

### Password login

- user enters email and password on `/login`
- browser client signs in
- app records access in the background
- browser navigates directly to the next page or `/dashboard`

### Magic link login

- user enters email on `/login`
- app sends an OTP email with `emailRedirectTo=/auth/callback`
- callback exchanges the code for a session
- user is redirected to `next` or `/dashboard`

### Invited user flow

- admin invites a user from `/admin/users`
- Supabase sends the invitation email
- the invite points to `/auth/set-password`
- invited user creates password there
- app records access in the background and redirects to `/dashboard`

## Guest season links

Guest season links are separate from Supabase Auth invitations.

They are generated from the boat sharing/admin flow and use:

- season access tokens
- guest cookies
- guest-only routes under `/guest/...`

These links depend on `SUPABASE_SERVICE_ROLE_KEY`.

## Current permissions model

Per-boat permissions come from `user_boat_permissions` and global access comes from `profiles.is_superuser`.

- `viewer`
  read-only with fine-grained visit visibility flags
- `editor`
  can create and edit planning data
- `manager`
  can edit planning data and manage boat users
- `superuser`
  can access all boats and all users

Cross-boat timeline visibility is separate:

- `profiles.is_timeline_public`
  makes a boat timeline visible to other boats participating in visibility sharing

Guest season links are also separate:

- they are read-only
- they do not use the same permissions model as authenticated internal users

## Shared timelines

The shared timeline view is in:

- [`src/app/shared/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/shared/page.tsx)

Current behavior:

- compare your own boat with one selected other boat
- synchronized zoom between both timelines
- optional side-by-side maps
- selection cards up to 12 boats on desktop and 6 on mobile
- searchable combo box above that threshold

## Dashboard and performance notes

Recent performance work already done:

- request-level caching for viewer/session reads
- lighter boat list for first dashboard/shared loads
- parallelized loading in dashboard and shared page
- animated global loading screen in [`src/app/loading.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/loading.tsx)

If login still feels slow after deployment, the next bottlenecks are likely:

- heavy workspace queries for trips/visits
- Google Maps loading
- hosted Supabase latency

## How to create the first superuser

1. Create the first user through the app or Supabase Auth.
2. Open the Supabase SQL editor.
3. Run:

```sql
update public.profiles
set is_superuser = true
where id = (
  select id
  from auth.users
  where email = 'you@example.com'
);
```

## How to create the first boat and assign it

```sql
with target_user as (
  select id
  from auth.users
  where email = 'you@example.com'
),
new_boat as (
  insert into public.boats (name, description)
  values ('My First Boat', 'Initial production boat')
  returning id
)
insert into public.user_boat_permissions (
  user_id,
  boat_id,
  permission_level,
  can_edit,
  can_view_all_visits,
  can_view_visit_names,
  can_view_private_notes,
  can_view_only_own_visit,
  can_manage_boat_users,
  can_view_availability
)
select
  target_user.id,
  new_boat.id,
  'manager',
  true,
  true,
  true,
  true,
  false,
  true,
  true
from target_user, new_boat;
```

## Migrations and seed

Schema and behavior live under [supabase/migrations](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/migrations).

Seed data lives in:

- [supabase/seed.sql](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/seed.sql)

## Verification commands

Useful checks:

```bash
npm run typecheck
npm run build
```

## Release workflow

Current release version is `v0.3.1`.

Typical flow:

1. update `package.json` version
2. commit and push to `main`
3. create a GitHub release tag such as `v0.3.1`
4. deploy hosting from the updated `main`

## Notes

- hosted Supabase dashboard settings are part of the real deployment and are not fully represented by repo files alone
- local invite email template configuration does not automatically update hosted Supabase
- stale open tabs after a deploy can produce client/server mismatch errors until the page is reloaded
