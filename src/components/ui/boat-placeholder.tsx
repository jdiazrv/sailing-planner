type BoatPlaceholderProps = {
  className?: string;
  title: string;
};

export function BoatPlaceholder({
  className = "",
  title,
}: BoatPlaceholderProps) {
  return (
    <div
      aria-label={title}
      className={className ? `boat-placeholder ${className}` : "boat-placeholder"}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="boat-placeholder__art"
        viewBox="0 0 160 100"
      >
        <defs>
          <linearGradient id="boat-placeholder-sea" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#b8dde2" />
            <stop offset="100%" stopColor="#dff1f3" />
          </linearGradient>
          <linearGradient id="boat-placeholder-hull" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#0b5565" />
            <stop offset="100%" stopColor="#0a9396" />
          </linearGradient>
        </defs>
        <rect fill="url(#boat-placeholder-sea)" height="100" rx="18" width="160" />
        <path
          d="M20 72c10-3 25-5 40-5h70c7 0 12 1 14 4-4 8-16 13-31 13H47C34 84 24 79 20 72Z"
          fill="url(#boat-placeholder-hull)"
        />
        <path d="M64 27h6v40h-6Z" fill="#13404a" />
        <path d="M70 28l33 18H70Z" fill="#ffffff" opacity="0.95" />
        <path d="M70 49l24 12H70Z" fill="#ecf8f7" opacity="0.88" />
        <path
          d="M28 80c10 4 22 6 35 6h48c15 0 28-3 37-8"
          fill="none"
          opacity="0.55"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}
