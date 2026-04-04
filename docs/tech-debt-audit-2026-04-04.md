# Tech Debt Audit - 2026-04-04

This file tracks live technical-debt findings observed while navigating the app in local development.

## Current status

- Scope: live navigation audit on localhost while the app is running in dev mode.
- Goal: collect actionable debt items without overloading chat context.
- Last updated: 2026-04-04 after correcting the actionable issues listed below.

## High priority

No open high-priority issues remain from the items already corrected in this audit pass.

## Medium priority

### Redundant server data loading on boat routes

Observed in dev-server timings while loading boat workspace routes.

Repeated calls during a single navigation:

- `boatData.getBoatLayoutSnapshot`
- `boatData.getBoatWorkspace`
- `boatData.getAccessibleBoats`

Primary files involved:

- `src/app/boats/[boatId]/layout.tsx`
- `src/app/boats/[boatId]/page.tsx`
- `src/lib/boat-data-boats.ts`

Risk:

- Unnecessary latency and duplicated Supabase work.
- More loading churn than needed during navigation.

Recommended direction:

- Re-check how much duplicated work is still happening between layout/page loaders.
- Consider consolidating or narrowing the data required by layout vs page.

### Aborted POST requests during boat interactions

Observed in browser events on:

- `/boats/e1a050cf-ffc6-4dd1-9e36-eda75e69701e?view=trip`

Symptoms:

- Multiple `POST ... net::ERR_ABORTED` events.
- UI currently survives, but this suggests overlapping refresh/revalidation cycles.

Current assessment:

- Not currently crashing the route after the transition fix.
- Still worth investigating for wasted work and possible race conditions.

## Low priority

### Google Maps marker deprecation

Observed browser warning:

- `google.maps.Marker is deprecated`

Primary file:

- `src/components/planning/map-panel.tsx`

Recommended direction:

- Migrate to `google.maps.marker.AdvancedMarkerElement` when practical.

## Recently resolved during this audit

### Repeated route/loading overlays

Resolved by removing nested loading fallbacks that duplicated route-level loaders.

Affected areas adjusted:

- `src/app/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/boats/[boatId]/layout.tsx`

### Async transitions normalized across remaining UI surfaces

Resolved by replacing the remaining `startTransition(async () => ...)` usages with synchronous transition wrappers that attach promise handling explicitly.

Affected areas adjusted:

- `src/components/i18n/language-switcher.tsx`
- `src/components/shared/timeline-visibility-panel.tsx`
- `src/components/admin/boats-admin.tsx`
- `src/components/admin/users-admin.tsx`
- `src/components/admin/season-access-panel.tsx`

### Boat workspace runtime crash

Observed error:

- `Runtime TypeError: frame.join is not a function`

Current status:

- No longer reproduced on the audited boat route after normalizing action transitions in:
  - `src/components/planning/trip-segments-manager.tsx`
  - `src/components/planning/visits-manager.tsx`
  - `src/components/planning/season-bar.tsx`
  - `src/components/boats/boat-settings-dialog.tsx`

### Loading notice centered in route states

Resolved by aligning the section notice container to the center instead of the start.

Affected area adjusted:

- `src/app/globals.css`

### Users admin selection consistency under search

Resolved by clearing the active user selection when search returns no matches, avoiding a stale detail panel unrelated to the current filter.

Affected area adjusted:

- `src/components/admin/users-admin.tsx`

### Admin server actions now throw normalized Error instances

Resolved by replacing raw `throw error` statements with explicit `throw new Error(...)` in critical admin user actions.

Affected area adjusted:

- `src/app/admin/actions.ts`

## Notes for continuing the audit

- Keep app navigation broad: dashboard, admin, shared, boat plan, visits, guest/share flows.
- Prefer logging only durable findings here, not transient dev-server noise unless it repeats.
- If a new runtime error appears, record:
  - route
  - exact error text
  - browser event pattern
  - likely triggering interaction

## Audit checkpoints

### 2026-04-04 - Restart + smoke audit

- Server restart in clean mode: done (`.next` removed, `next dev` relaunched).
- Base route `/`: rendered login normally, no runtime overlay.
- Protected route `/dashboard` without session: redirected to `/login` as expected.
- Dev-only events observed: some `hot-update.js net::ERR_ABORTED` requests during navigation after restart.
- Current assessment: no blocking runtime regression detected in this smoke pass.

### 2026-04-04 - Full CRUD traversal (admin + boat workspace)

- Scope covered: admin boats, admin users, seasons, trip segments, visits, and cleanup flows.
- Data lifecycle validation: create/update/delete actions completed and test records were removed.
- Runtime status: no blocking crash observed during this pass.
- Repeated pattern: multiple `POST ... net::ERR_ABORTED` events after successful mutations.
- UX inconsistency observed: in users admin, search with no matches can coexist with an unrelated detail panel selection.

### 2026-04-04 - M-004 low-risk pilot step 1

- Scope: `admin/users` client handlers only.
- Change: removed redundant `router.refresh()` calls after successful server actions, relying on existing server-side `revalidatePath` invalidation.
- Goal: reduce overlapping POST/refresh cycles without changing business logic.
- Risk control: single-module rollout, no schema/API changes, diagnostics clean after edit.

### 2026-04-04 - M-004 pilot measurement (admin/users)

- Controlled action: one `Guardar perfil` execution in `admin/users`.
- Network result: 1 POST total, 0 aborted POST, 0 POST with 500 status.
- Unexpected behavior: after the action, route ended in `/login` and UI showed `NEXT_REDIRECT`.
- Decision: pause broader M-004 rollout until this redirect behavior is clarified.

### 2026-04-04 - Mitigation for redirect error noise (admin/users)

- Scope: `src/components/admin/users-admin.tsx` only.
- Change: action handlers now ignore redirect sentinel errors (`NEXT_REDIRECT`) instead of showing them as generic toast failures.
- Goal: avoid false/noisy error messaging when Next performs a redirect during an action flow.
- Remaining work: root cause of the redirect to `/login` is still pending verification.

### 2026-04-04 - M-004 step 2 rollout (admin/boats)

- Scope: `src/components/admin/boats-admin.tsx` only.
- Change: removed client-side `router.refresh()` calls after successful save/upload/remove/delete handlers.
- Rationale: mirror low-risk dedupe pattern already used in `admin/users`, relying on server-side `revalidatePath` invalidation.
- Validation: file diagnostics clean; runtime measurement pending because active browser session is currently at `/login`.

### 2026-04-04 - Recheck after re-login (Maria BH)

- `admin/users` controlled action (`Guardar perfil`): 1 POST, 0 aborted POST, 0 POST with 500 status.
- Route outcome for the action: stayed on `/admin/users` with success toast (`Usuario actualizado`), no `NEXT_REDIRECT` visible.
- `admin/boats` runtime measurement remains pending in this pass: current role cannot access that route and is redirected back to `/boats/{id}`.