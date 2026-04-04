"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RoutePrefetcher({
  routes,
}: {
  routes: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const uniqueRoutes = [...new Set(routes.filter(Boolean))];
    if (!uniqueRoutes.length) {
      return;
    }

    let cancelled = false;
    const browserWindow = typeof window === "undefined" ? null : window;
    const prefetch = () => {
      if (cancelled) {
        return;
      }

      uniqueRoutes.forEach((route) => {
        router.prefetch(route);
      });
    };

    if (browserWindow && "requestIdleCallback" in browserWindow) {
      const idleId = browserWindow.requestIdleCallback(prefetch, {
        timeout: 1200,
      });
      return () => {
        cancelled = true;
        browserWindow.cancelIdleCallback(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(prefetch, 250);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(timeoutId);
    };
  }, [router, routes]);

  return null;
}