import { AppLoading } from "@/components/ui/app-loading";
import { SectionLoading } from "@/components/ui/section-loading";

export default function Loading() {
  return (
    <SectionLoading
      notice={
        <AppLoading
          subtitle="Preparando timeline, tramos y mapa."
          title="Cargando panel"
        />
      }
    />
  );
}
