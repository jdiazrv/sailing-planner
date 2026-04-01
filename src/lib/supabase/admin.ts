import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export const createAdminClient = () => {
  const env = getEnv();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
};
