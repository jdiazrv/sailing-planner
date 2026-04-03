import { AppLoading } from "@/components/ui/app-loading";

export default function Loading() {
  return (
    <main className="shell shell--loading">
      <AppLoading
        eyebrow="Acceso"
        subtitle="Preparando las opciones de entrada y la configuracion de autenticacion."
        title="Cargando acceso"
      />
    </main>
  );
}
