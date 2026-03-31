import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-layout">
      <Suspense fallback={null}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
