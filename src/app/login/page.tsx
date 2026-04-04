import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthFormLoading } from "@/components/auth/auth-form-loading";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="auth-layout">
      <Suspense fallback={<AuthFormLoading />}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
