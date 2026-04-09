"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function ManualPageActions({
  backLabel,
  appLabel,
}: {
  backLabel: string;
  appLabel: string;
}) {
  const router = useRouter();

  return (
    <div className="manual-hero__actions">
      <button
        className="secondary-button manual-hero__action"
        onClick={() => {
          if (window.history.length > 1) {
            router.back();
            return;
          }

          router.push("/dashboard");
        }}
        type="button"
      >
        {backLabel}
      </button>

      <Link className="link-button manual-hero__action-link" href="/dashboard">
        {appLabel}
      </Link>
    </div>
  );
}