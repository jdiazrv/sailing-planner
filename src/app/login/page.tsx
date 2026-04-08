import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { resolveAuthenticatedDestination } from "@/lib/auth-destination";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, supabase, cookieStore] = await Promise.all([
    searchParams,
    createClient(),
    cookies(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const destination = await resolveAuthenticatedDestination({
      supabase,
      user,
      next,
      lastBoatId: cookieStore.get("lastBoatId")?.value,
    });

    redirect(destination);
  }

  return (
    <main className="auth-layout">
      <AuthForm />
    </main>
  );
}
