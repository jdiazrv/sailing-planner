import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl) : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: process.cwd(),
  images: supabaseOrigin
    ? {
        remotePatterns: [
          {
            protocol: supabaseOrigin.protocol.replace(":", "") as "http" | "https",
            hostname: supabaseOrigin.hostname,
            pathname: "/storage/v1/object/**",
          },
        ],
      }
    : undefined,
};

export default nextConfig;
