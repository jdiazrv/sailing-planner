import { AppLoading } from "@/components/ui/app-loading";
import { SectionLoading } from "@/components/ui/section-loading";

export function RouteLoading({
  title = "Cargando panel",
  subtitle = "Preparando la navegacion y sincronizando el plan.",
  fullScreen = false,
}: {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
}) {
  return (
    <div className={fullScreen ? "route-loading route-loading--fullscreen" : "route-loading"}>
      <SectionLoading
        notice={<AppLoading subtitle={subtitle} title={title} />}
      />
    </div>
  );
}