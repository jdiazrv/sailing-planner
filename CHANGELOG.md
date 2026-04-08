# Changelog

## v0.4.4 - 2026-04-09

- Removed dashboard/login bounce paths by resolving authenticated destinations directly after sign-in and on guarded public entries.
- Consolidated authenticated loading into the app-level loader and refined loader copy and sidebar-preserving layout behavior.
- Reduced redundant post-mutation refreshes across timeline visibility, guest onboarding, season access and guarded season navigation flows.
- Moved onboarding and member welcome copy to a locale-aware canonical layer instead of keeping it inline inside components.
- Moved manual localized content into a dedicated content module and aligned sidebar and boat-settings labels with shared i18n keys.

## v0.4.3 - 2026-04-07

- Unified trip-segment ordering by schedule across workspace, summary, map and export flows.
- Restored synchronized selection between map markers, timeline rows and trip cards.
- Added automatic scrolling for trip lists when selections move outside the visible card area.
- Added scroll limits to workspace and summary trip lists when they exceed ten rows.
- Improved onboarding tours so highlighted cards, controls, visits and modals remain visually clear.
- Added a dedicated account/settings area for personal preferences and password updates.
- Defaulted new and invited users to `both` for visit panel display mode.
- Hardened invite acceptance with a safer confirmation step before password setup.
- Improved shared timeline comparison layout and synchronization.

## v0.4.2 - 2026-04-05

- Hardened invitation flows and reduced failures caused by email scanners.
- Batched visit image signed URL resolution for better planning-loader performance.
- Reduced data drift by reusing shared planning sort and availability helpers.

## v0.4.1 - 2026-04-04

- Fixed boat admin editing and boat-settings layout issues.
- Improved planning workspace controls and logout reliability.

## v0.4.0 - 2026-04-03

- Expanded onboarding checkpoints and blocked-interval support.
- Improved timeline rendering and shared timeline comparison behavior.