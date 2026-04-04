import { RouteLoading } from "@/components/ui/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      fullScreen
      subtitle="Preparando la actualizacion segura de credenciales."
      title="Cargando acceso"
    />
  );
}
