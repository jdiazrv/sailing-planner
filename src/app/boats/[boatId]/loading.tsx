import { AppLoading } from "@/components/ui/app-loading";

export default function Loading() {
  return (
    <main className="shell shell--loading">
      <AppLoading
        eyebrow="Barco"
        subtitle="Sincronizando temporada, timeline, visitas y permisos del barco seleccionado."
        title="Abriendo el espacio del barco"
      />
    </main>
  );
}
