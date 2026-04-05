"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { recordCurrentUserAccess } from "@/app/actions";
import { buildAuthRedirectUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/i18n/provider";
import { PasswordInput } from "@/components/ui/password-input";
import { IconLoadingPresentation } from "@/components/ui/app-loading";

type Mode = "password" | "magic-link";
type LoadingIntent = "password" | "magic-link" | "google" | "reset" | null;

type AuthFormProps = {
  showHeader?: boolean;
  className?: string;
};

const getSafeNextPath = (next: string | null) => {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
};

export const AuthForm = ({
  showHeader = true,
  className,
}: AuthFormProps = {}) => {
  const { t, locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState<LoadingIntent>(null);

  const handlePasswordLogin = async () => {
    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      throw signInError;
    }

    if (!data.session) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(t("auth.error"));
      }
    }

    void recordCurrentUserAccess("password").catch(() => {});
    router.replace(next);
    router.refresh();
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
        shouldCreateUser: false,
        data: {
          preferred_language: locale,
          locale,
        },
      },
    });

    if (otpError) {
      throw otpError;
    }

    setMessage(t("auth.magicSent"));
  };

  const handlePasswordReset = async () => {
    const supabase = createClient();
    const requestOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const redirectUrl = new URL(
      buildAuthRedirectUrl("/auth/callback", {
        requestOrigin,
      }),
    );
    redirectUrl.searchParams.set("next", "/auth/set-password");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: redirectUrl.toString(),
      },
    );

    if (resetError) {
      throw resetError;
    }

    setMessage(t("auth.resetSent"));
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const requestOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const redirectUrl = new URL(
      buildAuthRedirectUrl("/auth/callback", { requestOrigin }),
    );
    redirectUrl.searchParams.set("next", next);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl.toString(),
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      throw oauthError;
    }
  };

  const ensureEmail = () => {
    if (!email) {
      throw new Error(t("auth.emailRequired"));
    }
  };

  const handleMagicChoice = async () => {
    setIsLoading(true);
    setLoadingIntent("magic-link");
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
      setLoadingIntent(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setLoadingIntent(null);
    setError(null);
    setMessage(null);

    try {
      ensureEmail();

      if (mode === "password") {
        if (!password) {
          throw new Error(t("auth.passwordRequired"));
        }

        setLoadingIntent("password");
        await handlePasswordLogin();
      } else if (mode === "magic-link") {
        setLoadingIntent("magic-link");
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
      setLoadingIntent(null);
    }
  };

  const handleForgotPassword = async () => {
    setIsLoading(true);
    setLoadingIntent("reset");
    setError(null);
    setMessage(null);

    try {
      ensureEmail();
      await handlePasswordReset();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("auth.error"),
      );
    } finally {
      setIsLoading(false);
      setLoadingIntent(null);
    }
  };

  if (mode === "password" && isLoading && loadingIntent === "password") {
    return (
      <div className={["auth-card", className].filter(Boolean).join(" ")}>
        <IconLoadingPresentation label={t("auth.working")} />
      </div>
    );
  }

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
          <button
            className="secondary-button"
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              setLoadingIntent("google");
              setError(null);
              setMessage(null);
              void handleGoogleLogin()
                .catch((submitError) => {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : t("auth.error"),
                  );
                })
                .finally(() => {
                  setIsLoading(false);
                  setLoadingIntent(null);
                });
            }}
            type="button"
          >
            {t("auth.googleMode")}
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
          <button
            className="link-button"
            disabled={isLoading}
            onClick={() => void handleForgotPassword()}
            type="button"
          >
            {t("auth.forgotPassword")}
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
