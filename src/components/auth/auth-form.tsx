"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { recordCurrentUserAccess } from "@/app/actions";
import { buildAuthRedirectUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/i18n/provider";
import { PasswordInput } from "@/components/ui/password-input";

type Mode = "password" | "magic-link";

type AuthFormProps = {
  showHeader?: boolean;
  className?: string;
};

export const AuthForm = ({
  showHeader = true,
  className,
}: AuthFormProps = {}) => {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
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

    void recordCurrentUserAccess("password").catch(() => {});
    window.location.assign(next);
  };

  const handleMagicLink = async () => {
    const supabase = createClient();
    const requestOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const redirectUrl = new URL(
      buildAuthRedirectUrl("/auth/callback", { requestOrigin }),
    );
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

  const ensureEmail = () => {
    if (!email) {
      throw new Error(t("auth.emailRequired"));
    }
  };

  const handleMagicChoice = async () => {
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      ensureEmail();
      await handleMagicLink();
      setMode("magic-link");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("auth.error"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      ensureEmail();

      if (mode === "password") {
        if (!password) {
          throw new Error(t("auth.passwordRequired"));
        }

        await handlePasswordLogin();
      } else if (mode === "magic-link") {
        await handleMagicLink();
      } else {
        throw new Error(t("auth.loginMode"));
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
    <form className={["auth-card", className].filter(Boolean).join(" ")} onSubmit={handleSubmit}>
      {showHeader ? (
        <div className="auth-card__header">
          <h1>{t("auth.title")}</h1>
          <p className="muted">{t("auth.subtitle")}</p>
        </div>
      ) : null}

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

      {mode === "password" ? (
        <label className="field">
          <span>{t("auth.password")}</span>
          <PasswordInput
            autoComplete="current-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            value={password}
          />
        </label>
      ) : null}

      {mode === null ? (
        <div className="inline-actions">
          <button
            className="primary-button"
            disabled={isLoading}
            onClick={() => {
              setError(null);
              setMessage(null);
              setMode("password");
            }}
            type="button"
          >
            {t("auth.passwordMode")}
          </button>
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => void handleMagicChoice()}
            type="button"
          >
            {t("auth.magicMode")}
          </button>
        </div>
      ) : null}

      {mode === "password" ? (
        <div className="inline-actions">
          <button
            className="link-button"
            disabled={isLoading}
            onClick={() => {
              setError(null);
              setMessage(null);
              setPassword("");
              setMode(null);
            }}
            type="button"
          >
            {t("auth.magicMode")}
          </button>
        </div>
      ) : null}

      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      {mode === "password" ? (
        <button className="primary-button" disabled={isLoading} type="submit">
          {isLoading ? t("auth.working") : t("auth.signInPassword")}
        </button>
      ) : null}
    </form>
  );
};
