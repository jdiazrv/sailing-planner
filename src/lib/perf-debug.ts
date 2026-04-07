type PerfMeta = Record<string, unknown>;

const CLIENT_STORAGE_KEY = "sp:debug:perf";

const isTruthyFlag = (value: string | undefined | null) =>
  value === "1" || value === "true" || value === "on";

const formatPerfMeta = (meta?: PerfMeta) => {
  if (!meta) {
    return "";
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [unserializable-meta]";
  }
};

const getNow = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
};

const getClientStorageFlag = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return isTruthyFlag(window.localStorage.getItem(CLIENT_STORAGE_KEY));
  } catch {
    return false;
  }
};

const logPerf = (
  channel: "server" | "client",
  phase: "start" | "end",
  label: string,
  durationMs?: number,
  meta?: PerfMeta,
) => {
  const durationLabel =
    phase === "end" && typeof durationMs === "number"
      ? ` ${durationMs.toFixed(1)}ms`
      : "";

  console.log(`[perf:${channel}:${phase}] ${label}${durationLabel}${formatPerfMeta(meta)}`);
};

export const isServerPerfDebugEnabled = () =>
  isTruthyFlag(process.env.DEBUG_PERF) || isTruthyFlag(process.env.NEXT_PUBLIC_DEBUG_PERF);

export const isClientPerfDebugEnabled = () =>
  isTruthyFlag(process.env.NEXT_PUBLIC_DEBUG_PERF) || getClientStorageFlag();

export const startClientPerf = (label: string, meta?: PerfMeta) => {
  const enabled = isClientPerfDebugEnabled();
  const start = getNow();

  if (enabled) {
    logPerf("client", "start", label, undefined, meta);
  }

  return {
    end(extra?: PerfMeta) {
      const durationMs = getNow() - start;

      if (enabled) {
        logPerf("client", "end", label, durationMs, extra);
      }

      return durationMs;
    },
  };
};

export const measureClientSync = <T>(
  label: string,
  callback: () => T,
  meta?: PerfMeta,
) => {
  if (!isClientPerfDebugEnabled()) {
    return callback();
  }

  const timing = startClientPerf(label, meta);

  try {
    return callback();
  } finally {
    timing.end(meta);
  }
};

export const getClientPerfStorageKey = () => CLIENT_STORAGE_KEY;