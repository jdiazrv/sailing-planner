const DEFAULT_LOCAL_APP_URL = "http://localhost:3000";
const LOOPBACK_HOSTS = new Set(["localhost", "localhost.local", "127.0.0.1", "0.0.0.0"]);

const missingEnvError = (name: string) =>
  new Error(
    `Missing required environment variable ${name}. Check your .env.local or Netlify environment settings.`,
  );

const getRequiredEnv = (name: string, value: string | undefined) => {
  if (!value) {
    throw missingEnvError(name);
  }

  return value;
};

export const getEnv = () => ({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_LOCAL_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: getRequiredEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: getRequiredEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
  SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
});

const normalizeOrigin = (value: string) => value.replace(/\/+$/, "");

const asUrl = (value: string | undefined | null) => {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
};

export const isLoopbackOrigin = (value: string | undefined | null) => {
  const url = asUrl(value);
  if (!url) {
    return false;
  }

  return LOOPBACK_HOSTS.has(url.hostname) || url.hostname.startsWith("127.");
};

export const resolveAppOrigin = ({
  requestOrigin,
}: {
  requestOrigin?: string | null;
} = {}) => {
  const normalizedRequestOrigin = requestOrigin ? normalizeOrigin(requestOrigin) : null;
  const configuredOrigin = normalizeOrigin(getEnv().NEXT_PUBLIC_APP_URL);

  if (normalizedRequestOrigin && !isLoopbackOrigin(normalizedRequestOrigin)) {
    return normalizedRequestOrigin;
  }

  if (configuredOrigin && !isLoopbackOrigin(configuredOrigin)) {
    return configuredOrigin;
  }

  if (normalizedRequestOrigin) {
    return normalizedRequestOrigin;
  }

  return configuredOrigin || DEFAULT_LOCAL_APP_URL;
};

export const isSecureOrigin = (value: string | undefined | null) => {
  const url = asUrl(value);
  return url?.protocol === "https:";
};

export const buildAuthRedirectUrl = (
  path = "/auth/callback",
  options?: { requestOrigin?: string | null },
) => {
  const base = resolveAppOrigin(options);
  try {
    return new URL(path, base).toString();
  } catch {
    throw new Error(`Invalid URL: base="${base}" path="${path}"`);
  }
};
