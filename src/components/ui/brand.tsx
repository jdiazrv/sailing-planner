import Link from "next/link";

type SailingBrandProps = {
  href?: string;
  size?: 20 | 28 | 40 | 64 | 96;
  showWordmark?: boolean;
  compact?: boolean;
  className?: string;
};

export function SailingBrand({
  href = "/",
  size = 40,
  showWordmark = true,
  compact = false,
  className,
}: SailingBrandProps) {
  const content = (
    <>
      <svg
        aria-hidden="true"
        className="sp-icon"
        focusable="false"
        height={size}
        viewBox="0 0 80 80"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon fill="var(--accent)" points="38,16 38,64 10,64" />
        <polygon
          fill="var(--accent)"
          fillOpacity="0.28"
          points="42,30 42,64 70,64"
        />
        <line
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeWidth="2"
          x1="40"
          x2="40"
          y1="10"
          y2="66"
        />
        <circle cx="40" cy="9" fill="var(--accent)" r="3.5" />
        <path
          d="M 9 65 Q 40 74 71 65"
          fill="none"
          stroke="var(--accent)"
          strokeLinecap="round"
          strokeOpacity="0.38"
          strokeWidth="1.5"
        />
      </svg>
      {showWordmark ? <span className="sp-wordmark">Sailing-planner</span> : null}
    </>
  );

  return (
    <Link
      aria-label="Sailing-planner — inicio"
      className={[
        "sp-brand",
        compact ? "sp-brand--sm" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      href={href}
    >
      {content}
    </Link>
  );
}
