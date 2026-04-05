import { SailingBrand } from "@/components/ui/brand";

export function IconLoadingPresentation({
  label = "Cargando",
}: {
  label?: string;
}) {
  return (
    <div aria-busy="true" aria-label={label} aria-live="polite" className="icon-loader" role="status">
      <div className="icon-loader__box" aria-hidden="true">
        <div className="icon-loader__ring" />
        <SailingBrand className="icon-loader__brand" showWordmark={false} size={64} />
      </div>
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
  return <IconLoadingPresentation label={label} />;
}
