import { SailingBrand } from "@/components/ui/brand";

export function IconLoadingPresentation({
  title,
  subtitle,
  label = "Cargando",
}: {
  title?: string;
  subtitle?: string;
  label?: string;
}) {
  const visibleMessage = subtitle ?? title ?? label;

  return (
    <div aria-busy="true" aria-label={label} aria-live="polite" className="icon-loader" role="status">
      <div className="icon-loader__box" aria-hidden="true">
        <div className="icon-loader__ring" />
        <SailingBrand className="icon-loader__brand" showWordmark={false} size={64} />
      </div>
      {visibleMessage ? (
        <div className="icon-loader__copy">
          <p className="icon-loader__message">{visibleMessage}</p>
        </div>
      ) : null}
    </div>
  );
}

export function AppLoading({
  title = "Cargando",
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const label = subtitle ? `${title}. ${subtitle}` : title;
  return <IconLoadingPresentation label={label} subtitle={subtitle} title={title} />;
}
