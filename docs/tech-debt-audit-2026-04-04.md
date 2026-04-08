# Tech Debt Audit - 2026-04-04

This file tracks live technical-debt findings observed while navigating the app in local development.

## Current status

- Scope: live navigation audit on localhost while the app is running in dev mode.
- Goal: collect actionable debt items without overloading chat context.
- Last updated: 2026-04-08 after a senior production audit across routes, shared UI, i18n paths and mutation flows.

## High priority

### 2026-04-08 - Production audit (fragmented i18n adoption and terminology drift)

Observed from source inspection across the main routes, admin surfaces, onboarding and the in-app manual.

Remaining issues:

- The project has a solid central dictionary in `src/lib/i18n.ts`, but several critical surfaces still bypass it with inline `locale === "es"` conditionals or large local copy objects.
  - Evidence:
    - `src/components/admin/users-admin.tsx` contains a large amount of user-facing copy inline and repeated locale switches inside the component.
    - `src/components/admin/boats-admin.tsx` keeps its own local bilingual copy object instead of using the shared dictionary.
    - `src/components/guest/member-welcome-modal.tsx` hardcodes the welcome flow copy outside the dictionary.
    - `src/app/manual/page.tsx` stores the entire manual as a route-local bilingual object.
    - `src/app/boats/[boatId]/layout.tsx` still hardcodes `Configurar barco` / `Boat settings` in the main workspace navigation.
- The terminology migration from `tramo` to `escala` is not fully closed despite the earlier backlog item being marked as completed.
  - Evidence:
    - `src/app/manual/page.tsx` still uses `tramos` and `route segments` in multiple user-visible paragraphs.
    - `src/lib/planning.ts` still emits the validation message `cruza un tramo sin cobertura de viaje`.

Risk:

- Spanish/English parity is now partial rather than systemic.
- Terminology can drift again because copy is maintained in several places outside the canonical dictionary.
- Admin, onboarding and manual flows are becoming their own translation system, which undermines consistency with the style guide and raises review cost.

Recommended direction:

- Move all visible copy in admin, onboarding and manual flows to one canonical i18n layer.
- Reopen the `tramo` -> `escala` migration as not fully closed until manual, validation messages and bilingual helper strings are aligned.

### 2026-04-05 - Post-fix validation findings (iPad)

Observed during the latest manual validation pass after the UX fixes were deployed.

Remaining issues:

- Sidebar labels in iPad render with a gray tone that makes them look disabled even though the menu is interactive.

Current assessment:

- The sidebar issue appears visual/contrast-related rather than functional.

### 2026-04-05 - Timeline, invite and boat-settings regressions (iPad + desktop)

Observed from user walkthrough in iPad and desktop contexts.

Timeline rendering and controls:

- Trip and visit rows overflow their visual container and invade the map area.
- The trip/visit visibility selector is positioned too high in both views.
- Review copy and placement of the trip/visit toggle controls:
  - In visits context, consider `Mostrar tramos`.
  - In trips context, consider `Mostrar visitas`.
  - Consider moving this control between timeline and the trip/visit card.

Navigation and invite flow:

- Remove duplicated `guest links` button where the sidebar icon already provides access.
- In invite screen, clicking a boat should select that boat for invite creation and must not navigate back to dashboard/panel.

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

## Medium priority

### 2026-04-08 - Production audit (mutation invalidation and redirect policy drift)

Observed from source inspection across server actions, auth routes and client mutation handlers.

Remaining issues:

- Route invalidation is still broader than the actual mutation scope and is split between server and client defensive refreshes.
  - Evidence:
    - `src/app/actions.ts` revalidates `/dashboard`, `/shared` and even `/` layout together for profile and visibility changes.
    - `src/app/admin/actions.ts` uses `refreshAdminRoutes()` to invalidate dashboard, admin, boats and users on unrelated admin mutations.
    - `src/app/boats/[boatId]/actions.ts` uses `refreshBoatRoutes()` to invalidate dashboard plus both boat workspaces for every boat mutation.
    - Several client components still add `router.refresh()` after server actions, including `boat-settings-dialog`, `season-access-panel`, `season-bar`, `visits-manager`, `member-first-access`, `user-settings-panel` and `timeline-visibility-panel`.
- Redirect policy is still duplicated across auth and guard layers.
  - Evidence:
    - `src/lib/auth-destination.ts` and `src/app/auth/callback/route.ts` both implement their own `getSafeNextPath` variants.
    - `src/lib/boat-data-viewer.ts` and `src/lib/boat-data-boats.ts` repeat hardcoded `redirect("/dashboard")` decisions across several guards.

Risk:

- The current pattern keeps feeding loader churn, aborted POST noise and avoidable route regeneration.
- Redirect behavior is harder to evolve safely because the fallback policy is not centralized.
- The codebase is accumulating local safety patches instead of one explicit navigation/invalidation strategy.

Recommended direction:

- Narrow invalidation by mutation family and reduce client `router.refresh()` calls where server revalidation is already authoritative.
- Centralize safe-next resolution and common guard redirects so auth and boat access flows do not drift.

### 2026-04-06 - Static production audit (data-path drift and maintainability)

Observed from source inspection across server loaders, actions and planning components.

Remaining issues:

- Workspace data contracts are split between RPC-backed loaders and manual table queries.
  - Evidence:
    - `src/lib/boat-data-boats.ts` uses `get_season_port_stops` and `get_season_visits` RPCs in the main workspace path.
    - `src/lib/boat-data-shared.ts` and `src/lib/boat-data-boats.ts` guest/shared loaders rebuild `PortStopView` and `VisitView` manually from direct `port_stops` / `visits` selects.
  - Risk:
    - Changes to ordering, derived fields or visibility rules can land in one path and silently drift in others.
    - Shared and guest views are more likely to fall behind the main boat workspace behavior.
  - Recommended direction:
    - Reduce the number of parallel contracts and prefer one canonical loader shape per entity family.

- Coastal-zone matching logic is materially duplicated across runtime and non-runtime modules.
  - Evidence:
    - `src/lib/coastal-zones.ts`
    - `src/lib/coastal-zones-runtime.ts`
    - Both files define overlapping alias normalization, curated island aliases, macro-zone construction and matching logic.
  - Risk:
    - Fixes in zone matching or alias quality can diverge between call sites.
    - The duplication increases review surface for every coastal-data change.
  - Recommended direction:
    - Collapse the matching logic into one canonical module and keep runtime-specific concerns limited to loading strategy only.

- Path revalidation breadth is wider than the mutation scope in several server actions.
  - Evidence:
    - `src/app/admin/actions.ts` -> `refreshAdminRoutes()` invalidates dashboard, admin, boats and users routes together, and also boat routes when a `boatId` is present.
    - `src/app/boats/[boatId]/actions.ts` -> `refreshBoatRoutes()` invalidates dashboard plus both boat workspaces on every mutation.
  - Risk:
    - Mutations trigger more cache invalidation work than necessary.
    - This can amplify route regeneration churn as the app grows.
  - Recommended direction:
    - Revisit invalidation granularity by mutation family and narrow it to the minimal set of affected paths.

### Redundant server data loading on boat routes

Observed in dev-server timings while loading boat workspace routes.

Repeated calls during a single navigation:

- `boatData.getBoatLayoutSnapshot`
- `boatData.getBoatWorkspaceBase`
- `boatData.getBoatWorkspace`

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

### 2026-04-08 - Production audit (oversized route surfaces and patch accumulation)

Observed from source inspection across admin and documentation routes.

Remaining issues:

- Some high-change surfaces are materially oversized and now combine view state, copy, conditional UX rules and mutation plumbing in single files.
  - Evidence:
    - `src/components/admin/users-admin.tsx` is about 1700 lines long and mixes table UI, creation flows, invitation flows, permission editing, password changes, selection logic and bilingual copy.
    - `src/components/admin/boats-admin.tsx` is over 500 lines and embeds its own bilingual text map plus CRUD orchestration.
    - `src/app/manual/page.tsx` is nearly 400 lines and stores the complete bilingual manual in-route.
- Loader investigation residue is still present in the shared loading component.
  - Evidence:
    - `src/components/ui/route-loading.tsx` still carries `debugKey`, `data-loading-*` debug attributes and dev-only render logging.
    - `src/components/ui/loading-debug-beacon.tsx` remains in the runtime tree as a dedicated debugging component.

Risk:

- These files are becoming difficult to test, refactor and review without regressions.
- UI polish changes, translation work and behavior fixes all compete inside the same monoliths, which is a typical sign of patch accumulation.
- The loader debugging residue is low-risk in production today, but it increases conceptual noise in a component that should stay minimal.

Recommended direction:

- Split admin surfaces by concern: listing, editor, invitation, permissions and security.
- Move the manual content to a dedicated content module or dictionary-backed content structure.
- Retire loader-debug artifacts once the current loading audit is considered closed.

## Low priority

### 2026-04-06 - Static production audit (low-risk debt)

### 2026-04-08 - Production audit (minor coherence gaps)

Observed from source inspection of top-level app shell metadata and route copy.

Remaining issues:

- Root metadata in `src/app/layout.tsx` is still fixed in English even though the app itself exposes Spanish and English.
- Some route-level labels still use ad hoc bilingual conditionals instead of shared dictionary keys, even when the dictionary already contains adjacent concepts.

Current assessment:

- This is not the main UX bottleneck, but it reinforces the pattern of partial i18n adoption.
