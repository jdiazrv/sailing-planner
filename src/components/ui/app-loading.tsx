import { SailingBrand } from "@/components/ui/brand";

export function AppLoading({
  title = "Cargando",
  subtitle = "Preparando la navegacion y sincronizando el plan.",
  eyebrow = "Sailing Planner",
  progressLabel = "Cargando",
}: {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  progressLabel?: string;
}) {
  return (
    <div className="app-loader" aria-busy="true" aria-live="polite">
      <div className="app-loader__brand-wrap">
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
      <div
        aria-label={progressLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        className="app-loader__progress"
        role="progressbar"
      >
        <span className="app-loader__progress-fill" />
      </div>
      <div className="app-loader__timeline" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
