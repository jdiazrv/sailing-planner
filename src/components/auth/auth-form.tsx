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
  const oauthError = searchParams.get("oauth_error");
  const oauthErrorDescription = searchParams.get("oauth_error_description");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingIntent, setLoadingIntent] = useState<LoadingIntent>(null);

  const oauthErrorMessage = oauthError
    ? locale === "es"
      ? `Error de acceso con Google (${oauthError})${oauthErrorDescription ? `: ${oauthErrorDescription}` : ""}`
      : `Google login error (${oauthError})${oauthErrorDescription ? `: ${oauthErrorDescription}` : ""}`
    : null;

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
            className="google-button"
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
            <svg aria-hidden="true" className="google-button__icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
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

      {error || oauthErrorMessage ? (
        <p className="feedback feedback--error">{error ?? oauthErrorMessage}</p>
      ) : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      {mode === "password" ? (
        <button className="primary-button" disabled={isLoading} type="submit">
          {isLoading ? t("auth.working") : t("auth.signInPassword")}
        </button>
      ) : null}
    </form>
  );
};
