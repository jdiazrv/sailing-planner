export const startServerTiming = (label: string, meta?: Record<string, unknown>) => {
  const start = process.hrtime.bigint();
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[timing:start] ${label}${payload}`);

  return {
    end(extra?: Record<string, unknown>) {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const extraPayload = extra ? ` ${JSON.stringify(extra)}` : "";
      console.log(`[timing:end] ${label} ${durationMs.toFixed(1)}ms${extraPayload}`);
      return durationMs;
    },
  };
};
