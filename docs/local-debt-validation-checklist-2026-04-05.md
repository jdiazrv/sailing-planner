# Local Debt Validation Checklist - 2026-04-05

Objective: close remaining manual UX/performance debt items in local environment with reproducible evidence.

## Scope

This checklist covers debt items that cannot be fully proven with static search or build.

Already verified by code/build and considered closed:

- Naming consistency `trip_segments` -> `port_stops` in app code.
- Typing consistency for `get_season_port_stops` and related DB contracts.
- User-facing wording migration `tramo/tramos` -> `escala/escalas` in app sources.

## Environment

- App running in local dev (`npm run dev`).
- Test on desktop and iPad viewport (or real iPad when possible).
- Keep browser console and network tab open during each scenario.

## Evidence format

For each check, record:

- Result: PASS or FAIL
- Route
- Screenshot (or short note if visual issue)
- Console/Network observations (if applicable)

---

## A. iPad/Touch UX

### A1. Sidebar label contrast on iPad

- Route: boat workspace and admin screens
- Steps:
  1. Open sidebar in iPad viewport.
  2. Compare label contrast in idle state vs disabled-looking perception.
- PASS criteria:
  - Labels look active and readable; no disabled appearance for interactive items.
- Result: [ ] PASS [ ] FAIL
- Notes:

### A2. Theme palette swatches on touch

- Route: screen with theme switcher
- Steps:
  1. Open palette in iPad/touch mode.
  2. Tap different swatches.
  3. Confirm theme applies immediately.
- PASS criteria:
  - Each tap changes theme consistently.
- Result: [ ] PASS [ ] FAIL
- Notes:

## B. Timeline and Layout

### B1. Visit row leading `?`

- Route: `/boats/[boatId]?view=visits` with visit data
- Steps:
  1. Open visits timeline rows.
  2. Check labels and lane headers.
- PASS criteria:
  - No unexpected leading `?` before visit names.
- Result: [ ] PASS [ ] FAIL
- Notes:

### B2. Overflow of trip/visit rows into map area

- Route: `/boats/[boatId]?view=trip` and `/boats/[boatId]?view=visits`
- Steps:
  1. Test table+map layout at common widths (desktop and tablet).
  2. Scroll timeline and inspect card boundaries.
- PASS criteria:
  - Rows stay inside their container and do not overlap/invade map panel.
- Result: [ ] PASS [ ] FAIL
- Notes:

### B3. Trip/visit visibility selector vertical position

- Route: trip and visits views
- Steps:
  1. Locate toggle control (Mostrar escalas / Mostrar visitas).
  2. Confirm vertical alignment relative to timeline and detail card.
- PASS criteria:
  - Control is visually aligned and not floating too high.
- Result: [ ] PASS [ ] FAIL
- Notes:

## C. Invite Flow and Season Links

### C1. Duplicated guest links entry

- Route: boat workspace with sidebar
- Steps:
  1. Count entry points to guest links actions.
  2. Confirm sidebar entry exists and no redundant duplicate CTA remains in same context.
- PASS criteria:
  - Single clear primary entry point in the workspace context.
- Result: [ ] PASS [ ] FAIL
- Notes:

### C2. Invite screen boat selection behavior

- Route: invite/season-access screen
- Steps:
  1. Click a boat in invite context.
  2. Verify selected boat changes for invite creation.
  3. Verify no unintended redirect to dashboard.
- PASS criteria:
  - Boat selection updates in place and stays on invite flow.
- Result: [ ] PASS [ ] FAIL
- Notes:

### C3. Season links management completeness

- Route: season links panel
- Steps:
  1. Confirm existing links list under selected boat/season.
  2. Confirm revoke action.
  3. Confirm delete action.
  4. Confirm metadata shown: accessed flag, latest access, invitee/recipient name.
- PASS criteria:
  - All list/actions/metadata are present and functional.
- Result: [ ] PASS [ ] FAIL
- Notes:

## D. Boat Settings Consistency

### D1. Button sizing and alignment across entry points

- Routes:
  - Open settings from boats table edit action.
  - Open settings from alternate entry point.
- Steps:
  1. Compare `Save changes` and `Upload image` height.
  2. Compare vertical alignment in both entry points.
- PASS criteria:
  - Same height style and consistent bottom alignment in both contexts.
- Result: [ ] PASS [ ] FAIL
- Notes:

### D2. Upload button disabled without file

- Route: boat settings dialog
- Steps:
  1. Open dialog with no file selected.
  2. Check `Upload image` button state.
  3. Select file and verify button enables.
- PASS criteria:
  - Disabled without file, enabled after selection.
- Result: [ ] PASS [ ] FAIL
- Notes:

## E. Performance and Network Behavior

### E1. Boats view load latency

- Route: dashboard/boats view
- Steps:
  1. Hard reload 3 times.
  2. Record page interactive time and visual readiness.
- PASS criteria:
  - No noticeably slow multi-second stall beyond expected local dev variability.
- Result: [ ] PASS [ ] FAIL
- Notes:

### E2. Redundant server loading signals

- Route: `/boats/[boatId]`
- Steps:
  1. Navigate into boat workspace and between trip/visits.
  2. Observe dev timing logs for repeated calls in same navigation.
- PASS criteria:
  - No obvious duplicate burst for the same snapshot/workspace load cycle.
- Result: [ ] PASS [ ] FAIL
- Notes:

### E3. Aborted POST requests

- Route: perform create/edit/delete in trips/visits/boats
- Steps:
  1. Execute representative CRUD actions.
  2. Inspect network tab for `net::ERR_ABORTED` on POST.
- PASS criteria:
  - No repeated aborted POST bursts in normal interaction flow.
- Result: [ ] PASS [ ] FAIL
- Notes:

## F. Shared Timelines UX

### F1. Dual map rendering requirement

- Route: shared timeline compare screen
- Steps:
  1. Open shared timeline with two boats selected.
  2. Verify map layout behavior.
- PASS criteria:
  - Two map contexts rendered one below the other, if this requirement is still active.
- Result: [ ] PASS [ ] FAIL
- Notes:

## Closure Criteria

- Mark debt item as closed only when:
  - Checklist item is PASS.
  - Evidence note is recorded.
  - No blocker remains in console/network for that flow.
