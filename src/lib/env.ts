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
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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

export const buildAuthRedirectUrl = (path = "/auth/callback") => {
  const base = getEnv().NEXT_PUBLIC_APP_URL;
  try {
    return new URL(path, base).toString();
  } catch {
    throw new Error(`Invalid URL: base="${base}" path="${path}"`);
  }
};
