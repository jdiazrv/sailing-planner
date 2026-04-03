import { AppLoading } from "@/components/ui/app-loading";

export default function Loading() {
  return (
    <main className="shell shell--loading">
      <AppLoading
        eyebrow="Administracion"
        subtitle="Cargando usuarios, barcos y permisos para que puedas gestionarlos con contexto."
        title="Abriendo la administracion"
      />
    </main>
  );
}
