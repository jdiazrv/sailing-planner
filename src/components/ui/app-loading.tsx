import { SailingBrand } from "@/components/ui/brand";

export function AppLoading({
  title = "Cargando",
  subtitle = "Preparando la navegacion y sincronizando el plan.",
  eyebrow = "Sailing Planner",
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div className="app-loader" aria-busy="true" aria-live="polite">
      <div className="app-loader__waveband" aria-hidden="true">
        <span className="app-loader__wave app-loader__wave--back" />
        <span className="app-loader__wave app-loader__wave--mid" />
        <span className="app-loader__wave app-loader__wave--front" />
      </div>
      <div className="app-loader__brand-wrap">
        <div className="app-loader__brand-halo" />
        <SailingBrand className="app-loader__brand" size={64} />
      </div>
      <div className="app-loader__copy">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{subtitle}</p>
      </div>
      <div className="app-loader__skeleton" aria-hidden="true">
        <span className="app-loader__skeleton-line app-loader__skeleton-line--long" />
        <span className="app-loader__skeleton-line app-loader__skeleton-line--medium" />
        <span className="app-loader__skeleton-line app-loader__skeleton-line--short" />
      </div>
      <div className="app-loader__timeline" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
