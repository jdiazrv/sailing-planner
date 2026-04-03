import { AppLoading } from "@/components/ui/app-loading";

export default function Loading() {
  return (
    <main className="shell shell--loading">
      <AppLoading
        eyebrow="Primer acceso"
        subtitle="Preparando el alta segura para que puedas definir tu contraseña inicial."
        title="Cargando configuracion de acceso"
      />
    </main>
  );
}
