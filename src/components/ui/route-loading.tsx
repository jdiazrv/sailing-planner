import { AppLoading } from "@/components/ui/app-loading";
import { SailingBrand } from "@/components/ui/brand";
import { LoadingDebugBeacon } from "@/components/ui/loading-debug-beacon";

export function RouteLoading({
  title = "Cargando panel",
  subtitle,
  fullScreen = false,
  preserveSidebar = false,
  debugKey,
}: {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  preserveSidebar?: boolean;
  debugKey?: string;
}) {
  const debugEnabled = process.env.NODE_ENV !== "production";

  if (debugEnabled) {
    console.log("[loading-render]", {
      debugKey: debugKey ?? "unknown",
      title,
      subtitle: subtitle ?? null,
      fullScreen,
      preserveSidebar,
      at: new Date().toISOString(),
    });
  }

  if (preserveSidebar) {
    return (
      <div
        className="route-loading-shell"
        data-loading-debug={subtitle ?? title}
        data-loading-title={title}
        data-loading-key={debugKey}
      >
        {debugEnabled ? <LoadingDebugBeacon subtitle={subtitle} title={title} /> : null}
        <aside aria-hidden="true" className="route-loading-sidebar">
          <div className="route-loading-sidebar__brand">
            <SailingBrand showWordmark={false} size={28} />
          </div>
          <div className="route-loading-sidebar__nav">
            <span className="route-loading-sidebar__item is-active" />
            <span className="route-loading-sidebar__item" />
            <span className="route-loading-sidebar__item" />
            <span className="route-loading-sidebar__item" />
            <span className="route-loading-sidebar__item" />
            <span className="route-loading-sidebar__item" />
          </div>
        </aside>
        <main className="shell route-loading-shell__main">
          <div className="route-loading route-loading--shell">
            <AppLoading subtitle={subtitle} title={title} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className={fullScreen ? "route-loading route-loading--fullscreen" : "route-loading"}
      data-loading-debug={subtitle ?? title}
      data-loading-title={title}
      data-loading-key={debugKey}
    >
      {debugEnabled ? <LoadingDebugBeacon subtitle={subtitle} title={title} /> : null}
      <AppLoading subtitle={subtitle} title={title} />
    </div>
  );
}