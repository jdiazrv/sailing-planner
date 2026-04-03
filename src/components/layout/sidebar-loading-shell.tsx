"use client";

export function SidebarLoadingShell() {
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">
        <div className="app-sidebar__loading-mark shimmer" />
        <div className="app-sidebar__loading-bar shimmer" />
      </div>
      <div className="app-sidebar__nav">
        <div className="app-sidebar__loading-pill shimmer" />
        <div className="app-sidebar__loading-pill shimmer" />
        <div className="app-sidebar__loading-pill shimmer" />
      </div>
      <div className="app-sidebar__footer">
        <div className="app-sidebar__loading-pill shimmer" />
        <div className="app-sidebar__loading-pill shimmer" />
      </div>
    </aside>
  );
}
