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
      <div className="app-loader__boat">
        <span className="app-loader__mast" />
        <span className="app-loader__sail" />
        <span className="app-loader__hull" />
      </div>
      <div className="app-loader__copy">
        <p className="eyebrow">Sailing Planner</p>
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
