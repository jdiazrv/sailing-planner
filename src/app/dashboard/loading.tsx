import { AppLoading } from "@/components/ui/app-loading";

export default function Loading() {
  return (
    <main className="shell shell--loading">
      <AppLoading
        eyebrow="Panel principal"
        subtitle="Recuperando el ultimo barco, la temporada activa y el resumen general."
        title="Preparando tu panel"
      />
    </main>
  );
}
