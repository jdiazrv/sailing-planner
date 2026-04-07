import { AppLoading } from "@/components/ui/app-loading";
import { SailingBrand } from "@/components/ui/brand";

export function RouteLoading({
  title = "Cargando panel",
  subtitle,
  fullScreen = false,
  preserveSidebar = false,
}: {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  preserveSidebar?: boolean;
}) {
  if (preserveSidebar) {
    return (
      <div className="route-loading-shell">
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
    <div className={fullScreen ? "route-loading route-loading--fullscreen" : "route-loading"}>
      <AppLoading subtitle={subtitle} title={title} />
    </div>
  );
}