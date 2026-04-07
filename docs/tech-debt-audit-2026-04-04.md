# Tech Debt Audit - 2026-04-04

This file tracks live technical-debt findings observed while navigating the app in local development.

## Current status

- Scope: live navigation audit on localhost while the app is running in dev mode.
- Goal: collect actionable debt items without overloading chat context.
- Last updated: 2026-04-07 after validating the latest cleanup pass against the current codebase and removing resolved debt items.

## High priority

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

## Low priority

### 2026-04-06 - Static production audit (low-risk debt)
