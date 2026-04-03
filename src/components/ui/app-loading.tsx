import { SailingBrand } from "@/components/ui/brand";

export function AppLoading({
  title = "Cargando",
  subtitle = "Preparando la navegacion y sincronizando el plan.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="app-loader" aria-busy="true" aria-live="polite">
      <div className="app-loader__wake" />
      <SailingBrand className="app-loader__brand" size={64} />
      <div className="app-loader__copy">
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="app-loader__timeline" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
