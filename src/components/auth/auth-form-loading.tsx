import { RouteLoading } from "@/components/ui/route-loading";

export function AuthFormLoading() {
  return (
    <RouteLoading
      subtitle="Restaurando la sesion y preparando el acceso seguro."
      title="Cargando acceso"
    />
  );
}