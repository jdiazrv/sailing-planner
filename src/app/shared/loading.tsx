import { AppLoading } from "@/components/ui/app-loading";

export default function Loading() {
  return (
    <main className="shell shell--loading">
      <AppLoading
        eyebrow="Comparativa"
        subtitle="Preparando los timelines y la seleccion del barco con el que vas a comparar."
        title="Cargando timelines compartidos"
      />
    </main>
  );
}
