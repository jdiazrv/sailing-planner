import { RouteLoading } from "@/components/ui/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      fullScreen
      subtitle="Levantando la aplicacion, restaurando sesion y preparando el plan."
      title="Cargando Sailing Planner"
    />
  );
}
