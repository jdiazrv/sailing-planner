"use client";

import { useEffect, useId } from "react";
import { usePathname } from "next/navigation";

type LoadingDebugBeaconProps = {
  title: string;
  subtitle?: string;
};

export function LoadingDebugBeacon({
  title,
  subtitle,
}: LoadingDebugBeaconProps) {
  const pathname = usePathname();
  const instanceId = useId();
  const message = subtitle ?? title;

  useEffect(() => {
    const payload = {
      instanceId,
      pathname,
      title,
      subtitle: subtitle ?? null,
      message,
      at: new Date().toISOString(),
    };

    console.log("[loading-debug] mount", payload);

    return () => {
      console.log("[loading-debug] unmount", payload);
    };
  }, [instanceId, message, pathname, subtitle, title]);

  return null;
}