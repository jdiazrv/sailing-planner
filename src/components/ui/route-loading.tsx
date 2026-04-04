import { AppLoading } from "@/components/ui/app-loading";

export function RouteLoading({
  title = "Cargando panel",
  fullScreen = false,
}: {
  title?: string;
  fullScreen?: boolean;
}) {
  return (
    <div className={fullScreen ? "route-loading route-loading--fullscreen" : "route-loading"}>
      <AppLoading title={title} />
    </div>
  );
}