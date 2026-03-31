"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { buildAuthRedirectUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/browser";

type Mode = "password" | "magic-link";

export const AuthForm = () => {
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

    router.replace(next);
    router.refresh();
  };

  const handleMagicLink = async () => {
    const supabase = createClient();

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthRedirectUrl(),
      },
    });

    if (otpError) {
      throw otpError;
    }

    setMessage("Magic link sent. Check your inbox to finish signing in.");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email) {
        throw new Error("Email is required.");
      }

      if (mode === "password") {
        if (!password) {
          throw new Error("Password is required for password login.");
        }

        await handlePasswordLogin();
      } else {
        await handleMagicLink();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while signing in.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <div className="auth-card__header">
        <p className="eyebrow">Supabase Auth</p>
        <h1>Sign in to Sailing Planner</h1>
        <p className="muted">
          Password login is enabled now and magic link is already wired for the
          same project.
        </p>
      </div>

      <label className="field">
        <span>Email</span>
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
        <span>Password</span>
        <input
          autoComplete="current-password"
          disabled={mode === "magic-link"}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          type="password"
          value={password}
        />
      </label>

      <div className="segmented-control" role="tablist" aria-label="Login mode">
        <button
          aria-pressed={mode === "password"}
          className={mode === "password" ? "is-active" : undefined}
          onClick={() => setMode("password")}
          type="button"
        >
          Password
        </button>
        <button
          aria-pressed={mode === "magic-link"}
          className={mode === "magic-link" ? "is-active" : undefined}
          onClick={() => setMode("magic-link")}
          type="button"
        >
          Magic link
        </button>
      </div>

      {error ? <p className="feedback feedback--error">{error}</p> : null}
      {message ? <p className="feedback feedback--success">{message}</p> : null}

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading
          ? "Working..."
          : mode === "password"
            ? "Sign in with password"
            : "Send magic link"}
      </button>
    </form>
  );
};
