"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { recordCurrentUserAccess } from "@/app/actions";
import { buildAuthRedirectUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/i18n/provider";
import { PasswordInput } from "@/components/ui/password-input";

type Mode = "password" | "magic-link";

export const AuthForm = () => {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordLogin = async () => {
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    await recordCurrentUserAccess();
    router.replace(next);
    router.refresh();
  };

  const handleMagicLink = async () => {
    const supabase = createClient();
    const redirectUrl = new URL(buildAuthRedirectUrl());
    redirectUrl.searchParams.set("next", next);

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl.toString(),
      },
    });

    if (otpError) {
      throw otpError;
    }

    setMessage(t("auth.magicSent"));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email) {
        throw new Error(t("auth.emailRequired"));
      }

      if (mode === "password") {
        if (!password) {
          throw new Error(t("auth.passwordRequired"));
        }

        await handlePasswordLogin();
      } else {
        await handleMagicLink();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("auth.error"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card__header">
        <p className="eyebrow">Sailing Planner</p>
        <h1>{t("auth.title")}</h1>
        <p className="muted">{t("auth.subtitle")}</p>
      </div>

      <label className="field">
        <span>{t("auth.email")}</span>
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="owner@example.com"
          type="email"
          value={email}
        />
      </label>

      <label className="field">
        <span>{t("auth.password")}</span>
        <PasswordInput
          autoComplete="current-password"
          disabled={mode === "magic-link"}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          value={password}
        />
      </label>

      <div className="segmented-control" role="tablist" aria-label={t("auth.loginMode")}>
        <button
          aria-pressed={mode === "password"}
          className={mode === "password" ? "is-active" : undefined}
          onClick={() => setMode("password")}
          type="button"
        >
          {t("auth.passwordMode")}
        </button>
        <button
          aria-pressed={mode === "magic-link"}
          className={mode === "magic-link" ? "is-active" : undefined}
          onClick={() => setMode("magic-link")}
          type="button"
        >
          {t("auth.magicMode")}
        </button>
      </div>

      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading
          ? t("auth.working")
          : mode === "password"
            ? t("auth.signInPassword")
            : t("auth.sendMagic")}
      </button>
    </form>
  );
};
