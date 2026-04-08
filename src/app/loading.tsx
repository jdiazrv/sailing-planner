import { RouteLoading } from "@/components/ui/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      debugKey="app"
      preserveSidebar
      subtitle="Abriendo panel"
      title="Cargando"
    />
  );
}
