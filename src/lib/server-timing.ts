import { isServerPerfDebugEnabled } from "@/lib/perf-debug";

export const startServerTiming = (label: string, meta?: Record<string, unknown>) => {
  const start = process.hrtime.bigint();
  const enabled = isServerPerfDebugEnabled();

  if (enabled) {
    const payload = meta ? ` ${JSON.stringify(meta)}` : "";
    console.log(`[timing:start] ${label}${payload}`);
  }

  return {
    end(extra?: Record<string, unknown>) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;

      if (enabled) {
        const extraPayload = extra ? ` ${JSON.stringify(extra)}` : "";
        console.log(`[timing:end] ${label} ${durationMs.toFixed(1)}ms${extraPayload}`);
      }

      return durationMs;
    },
  };
};

export const measureServerTiming = async <T>(
  label: string,
  callback: () => T,
  meta?: Record<string, unknown>,
  extra?: (result: Awaited<T>) => Record<string, unknown> | undefined,
): Promise<Awaited<T>> => {
  const timing = startServerTiming(label, meta);

  try {
    const result = await callback();
    timing.end(extra?.(result));
    return result;
  } catch (error) {
    timing.end({
      ...(meta ?? {}),
      failed: true,
      message: error instanceof Error ? error.message : "unknown-error",
    });
    throw error;
  }
};
