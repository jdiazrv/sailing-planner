import { AppLoading } from "@/components/ui/app-loading";

export function RouteLoading({
  title = "Cargando panel",
  subtitle,
  fullScreen = false,
}: {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}) {
  return (
    <div className={fullScreen ? "route-loading route-loading--fullscreen" : "route-loading"}>
      <AppLoading subtitle={subtitle} title={title} />
    </div>
  );
}