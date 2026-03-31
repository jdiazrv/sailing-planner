# Sailing Planner

Sailing Planner is a Next.js + TypeScript starter prepared for a multi-boat, multi-user planning product backed by Supabase. The repository includes:

- Next.js App Router with Supabase browser, server and middleware clients
- Email/password auth plus a magic-link-ready callback flow
- Versioned SQL migrations for boats, seasons, trip segments, visits and per-boat permissions
- RLS policies for boat isolation, per-boat editors/readers and a global superuser
- Local Supabase CLI configuration, a minimal seed and Netlify deployment notes

## Architecture summary

The schema is designed around `boats` as the root entity.

- A `season` belongs to a single boat.
- A `trip_segment` belongs to a single season.
- A `visit` belongs to a single season.
- Boat access is controlled through `user_boat_permissions`.
- Global platform-wide access is controlled with `profiles.is_superuser`.
- Only visits with `status = 'confirmed'` should be treated as blocking availability.

To protect private notes properly with Supabase RLS, private notes are stored in dedicated tables:

- `trip_segment_private_notes`
- `visit_private_notes`

This keeps the business model equivalent to your requested fields while allowing secure policies that do not leak private note columns to users who should not see them.

## App router and auth structure

The project uses the Next.js App Router.

- [`src/lib/supabase/browser.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/supabase/browser.ts) creates the browser client.
- [`src/lib/supabase/server.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/supabase/server.ts) creates the server client.
- [`src/lib/supabase/middleware.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/lib/supabase/middleware.ts) refreshes sessions and protects authenticated routes.
- [`src/app/login/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/login/page.tsx) provides password login and magic-link sending.
- [`src/app/auth/callback/route.ts`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/auth/callback/route.ts) exchanges auth codes for sessions.
- [`src/app/dashboard/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/dashboard/page.tsx) acts as the post-login boat selection screen.
- [`src/app/boats/[boatId]/trip/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/boats/[boatId]/trip/page.tsx) is the main Trip/Season workspace with a timeline and segment editor.
- [`src/app/boats/[boatId]/visits/page.tsx`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/src/app/boats/[boatId]/visits/page.tsx) combines visit editing, filtering, warnings and a synchronized timeline.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required for the app:

- `NEXT_PUBLIC_APP_URL`
  Local base URL for redirects, usually `http://localhost:3000`.
- `NEXT_PUBLIC_SUPABASE_URL`
  Your hosted Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  The public anon key from Supabase.

Recommended for CLI workflows:

- `SUPABASE_PROJECT_REF`
  Your project ref, used by CLI scripts such as linking and type generation.
- `SUPABASE_DB_PASSWORD`
  Only needed for some local or linked database workflows. Do not expose it to client code.

The app throws a clear error at startup if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.

## What you must create manually in Supabase

Create a Supabase project in the dashboard and then do the following:

1. Copy the project URL and anon key into `.env.local`.
2. In `Authentication > URL Configuration`, set:
   - Site URL: your production URL, for example `https://your-site.netlify.app`
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `http://127.0.0.1:3000/auth/callback`
     - `https://your-site.netlify.app/auth/callback`
3. In `Authentication > Providers > Email`, enable:
   - Email signups
   - Magic links or email OTP, depending on your preference
4. Optionally disable email confirmations in local-only workflows. The local CLI config already disables confirmations for local development.
5. If you want CLI commands like `db push` against the hosted project, link the repo with `npm run supabase:link`.

## Local development

Install dependencies and run the Next.js app:

```bash
npm install
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Supabase CLI and local database workflow

This repo includes standard Supabase project files in [`supabase/config.toml`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/config.toml).

Install the Supabase CLI if you do not already have it:

```bash
brew install supabase/tap/supabase
```

Useful scripts:

- `npm run supabase:start`
- `npm run supabase:stop`
- `npm run supabase:status`
- `npm run db:reset`
- `npm run db:push`
- `npm run db:diff`
- `npm run db:types`

Suggested local flow:

1. `npm run supabase:start`
2. `npm run db:reset`
3. `npm run dev`

## Migrations and seed

Main schema migration:

- [`supabase/migrations/20260331132000_initial_schema.sql`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/migrations/20260331132000_initial_schema.sql)
- [`supabase/migrations/20260331170000_master_requirements_alignment.sql`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/migrations/20260331170000_master_requirements_alignment.sql)

Optional seed:

- [`supabase/seed.sql`](/Users/juandiaz/Library/CloudStorage/Dropbox/MOODY/Proyectos/Projects/sailing-planner/supabase/seed.sql)

The seed creates:

- one demo boat
- one demo season
- two demo trip segments
- one tentative visit
- one confirmed visit
- one example permission row for the first auth user if one exists

## Current V1 product scope

The current app already includes the core V1 workflow requested in the master specification:

- login and protected routes
- multi-boat selection after login
- boat-scoped trip/season screen
- boat-scoped visits screen
- synchronized timeline with trip, visits and derived availability layers
- season, trip segment and visit creation/update/delete flows for editors
- read-only experience for non-editors
- undefined periods shown as a first-class availability state
- tentative versus confirmed visit handling
- warning-oriented conflict detection for visits

## How to create the first superuser

1. Sign up once through the app or directly in Supabase Auth.
2. Open the Supabase SQL editor.
3. Run this SQL, replacing the email with your real account:

```sql
update public.profiles
set is_superuser = true
where id = (
  select id
  from auth.users
  where email = 'you@example.com'
);
```

That user will immediately bypass per-boat restrictions and can manage all boats and users.

## How to create the first boat and assign it to a user

After promoting the first superuser, run this SQL in the SQL editor with your user email:

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

## Permission model per boat

The RLS rules are driven by `user_boat_permissions` plus `profiles.is_superuser`.

- `viewer`
  Read-only by default. Fine-grained flags decide whether the user can see full visits, only names, only availability or only their own visits.
- `editor`
  Can create, update and delete seasons, trip segments, visits and private note records for the assigned boat.
- `manager`
  Same as editor, plus can manage `user_boat_permissions` for that boat.
- `is_superuser = true`
  Full access across all boats and users.

Important note about private notes:

- Private notes are not stored inline on `trip_segments` or `visits`.
- They live in dedicated protected tables so RLS can enforce access safely.

Important note about own visits:

- `visits.owner_user_id` was added so `can_view_only_own_visit` has a concrete relation to the authenticated user.

## Availability rules

Only visits with `status = 'confirmed'` block availability.

The SQL helper function `public.get_season_visits(uuid)` returns `blocks_availability` so the frontend can consume the rule directly without reimplementing it in JavaScript.

## Netlify setup

Set these variables in Netlify:

- `NEXT_PUBLIC_APP_URL`
  Your Netlify site URL, for example `https://your-site.netlify.app`
- `NEXT_PUBLIC_SUPABASE_URL`
  Hosted Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  Hosted Supabase anon key
- `SUPABASE_PROJECT_REF`
  Optional, useful for CI or admin workflows
- `SUPABASE_DB_PASSWORD`
  Optional, only if your build or automation needs CLI database access

Do not add the Supabase service role key to frontend-exposed variables.

## Exact manual dashboard checklist to finish setup

1. Create the Supabase project.
2. Fill `.env.local` with your URL and anon key.
3. Start local Supabase and apply the schema:
   `npm run supabase:start`
   `npm run db:reset`
4. Create your first auth user.
5. Promote that user to superuser with the SQL snippet above.
6. Create the first boat and permission row with the SQL snippet above.
7. In Supabase dashboard auth settings, add local and Netlify callback URLs.
8. In Netlify, add the same environment variables shown above.
9. Deploy.

## Notes and assumptions

- The GitHub repository was empty when this setup started, so the Next.js app scaffold was created from scratch.
- Because per-field RLS is not enough to protect private notes safely, protected note tables were introduced as the cleanest equivalent model.
- No remote Supabase dashboard action has been simulated. Anything that must be done in the dashboard is documented explicitly above.
