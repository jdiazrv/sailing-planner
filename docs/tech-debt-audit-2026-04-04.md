# Tech Debt Audit - 2026-04-04

This file tracks live technical-debt findings observed while navigating the app in local development.

## Current status

- Scope: live navigation audit on localhost while the app is running in dev mode.
- Goal: collect actionable debt items without overloading chat context.
- Last updated: 2026-04-04 after correcting the actionable issues listed below.

## High priority

No open high-priority issues remain from the items already corrected in this audit pass.

### 2026-04-05 - Post-fix validation findings (iPad)

Observed during the latest manual validation pass after the UX fixes were deployed.

Remaining issues:

- Sidebar labels in iPad render with a gray tone that makes them look disabled even though the menu is interactive.
- Google login still fails during OAuth start with:
  - `Invalid URL: base="sailing-planner.netlify.app" path="/auth/callback"`

Current assessment:

- The sidebar issue appears visual/contrast-related rather than functional.
- The Google OAuth issue indicates that some runtime configuration still points to the old Netlify domain or lacks the updated public origin in the hosted environment.

### 2026-04-05 - Timeline, invite and boat-settings regressions (iPad + desktop)

Observed from user walkthrough in iPad and desktop contexts.

Timeline rendering and controls:

- Visit rows show an incorrect leading `?` before the visit name.
- Trip and visit rows overflow their visual container and invade the map area.
- The trip/visit visibility selector is positioned too high in both views.
- Review copy and placement of the trip/visit toggle controls:
  - In visits context, consider `Mostrar tramos`.
  - In trips context, consider `Mostrar visitas`.
  - Consider moving this control between timeline and the trip/visit card.

Navigation and invite flow:

- Remove duplicated `guest links` button where the sidebar icon already provides access.
- In invite screen, clicking a boat should select that boat for invite creation and must not navigate back to dashboard/panel.

Season links management completeness:

- Under the season links card, list existing links for the selected boat.
- Provide actions to revoke and delete generated links.
- Show invite usage metadata per link:
  - whether invitee has accessed,
  - latest access timestamp,
  - recipient/display name for whom the link was issued.

Boat settings consistency and usability:

- `Save changes` and `Upload image` buttons are still too short in height in one boat-settings surface.
- `Save changes` vertical alignment is inconsistent relative to `Upload image`; both should align at the bottom consistently.
- `Upload image` must remain disabled while no image file is selected.
- Behavior mismatch suggests duplicated boat-settings forms/components:
  - opening from boats table pencil action shows correct button sizing,
  - other boat-settings entry point does not.

Performance and data presentation:

- Boats view loading time is still excessively slow and requires profiling.
- Boat data summary menu/card quality is visually weak and needs redesign.
- Expand boat summary with richer operational metadata (for example users/managers counts and other relevant context).

Shared timelines feature gap:

- Shared timelines should render both maps, one below the other, instead of a single map context.

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

### Boats admin editing UX signals and action placement

Resolved after user feedback in admin boats panel.

Changes applied:

- Save action now stays disabled while the form has no changes.
- Add boat trigger moved out of the search card into a separate action block.
- Boat editor card now gets a full-card active highlight when inner controls are focused.

Primary files adjusted:

- `src/components/admin/boats-admin.tsx`
- `src/app/globals.css`

### Sidebar palette selector does not apply theme on touch/tablet

Observed after recent sidebar behavior adjustments.

Symptoms:

- Sidebar open interaction works as expected.
- Tapping a color swatch in the palette does not apply the selected theme.

Current assessment:

- Regression affects touch/tablet usage of the theme switcher.
- Navigation/open behavior should remain as before; only palette application is failing.

Primary files to investigate:

- `src/components/ui/theme-switcher.tsx`
- `src/app/globals.css`

### Google OAuth redirect builder fails with invalid base URL

Observed in login flow when entering email and then choosing Google sign-in.

Error text:

- `Invalid URL: base="sailing-planner.netlify.app" path="/auth/callback"`

Current assessment:

- Base URL is missing protocol (`https://`), causing URL construction to fail.
- This blocks Google OAuth sign-in until env/URL normalization is corrected.

Primary files to investigate:

- `src/components/auth/auth-form.tsx`
- `src/lib/env.ts`

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