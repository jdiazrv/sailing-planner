"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { recordCurrentUserAccess } from "@/app/actions";
import { useI18n } from "@/components/i18n/provider";
import { createClient } from "@/lib/supabase/browser";

export function SetPasswordForm() {
  const router = useRouter();
  const { locale } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(() => setIsReady(true));
  }, []);

  const text =
    locale === "es"
      ? {
          eyebrow: "Invitación",
          title: "Crea tu contraseña",
          subtitle:
            "Define tu contraseña para activar la cuenta y entrar en la plataforma.",
          password: "Nueva contraseña",
          confirmPassword: "Repetir contraseña",
          placeholder: "Al menos 8 caracteres",
          submit: "Guardar contraseña",
          loading: "Guardando...",
          mismatch: "Las contraseñas no coinciden.",
          tooShort: "La contraseña debe tener al menos 8 caracteres.",
          success: "Contraseña guardada. Redirigiendo al panel...",
          failed: "No se pudo guardar la contraseña.",
        }
      : {
          eyebrow: "Invitation",
          title: "Create your password",
          subtitle:
            "Set your password to activate the account and enter the platform.",
          password: "New password",
          confirmPassword: "Confirm password",
          placeholder: "At least 8 characters",
          submit: "Save password",
          loading: "Saving...",
          mismatch: "Passwords do not match.",
          tooShort: "Password must be at least 8 characters.",
          success: "Password saved. Redirecting to the dashboard...",
          failed: "Could not save the password.",
        };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError(text.tooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(text.mismatch);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || text.failed);
      setIsLoading(false);
      return;
    }

    setMessage(text.success);
    await recordCurrentUserAccess();
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card__header">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="muted">{text.subtitle}</p>
      </div>

      <label className="field">
        <span>{text.password}</span>
        <input
          autoComplete="new-password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder={text.placeholder}
          required
          type="password"
          value={password}
        />
      </label>

      <label className="field">
        <span>{text.confirmPassword}</span>
        <input
          autoComplete="new-password"
          name="confirm_password"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={text.placeholder}
          required
          type="password"
          value={confirmPassword}
        />
      </label>

      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      <button className="primary-button" disabled={isLoading || !isReady} type="submit">
        {isLoading ? text.loading : text.submit}
      </button>
    </form>
  );
}
