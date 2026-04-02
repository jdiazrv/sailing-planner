"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateLanguagePreference } from "@/app/actions";
import { locales, type Locale } from "@/lib/i18n";

import { useI18n } from "./provider";

export function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { locale, t } = useI18n();

  return (
    <div aria-label={t("language.label")} className="language-switcher" role="group">
      {locales.map((entry) => {
        const isActive = entry === locale;
        const flag = entry === "es" ? "ES" : "EN";

        return (
          <button
            aria-pressed={isActive}
            className={isActive ? "is-active" : undefined}
            disabled={isPending || isActive}
            key={entry}
            onClick={() => {
              const nextLocale = entry as Locale;
              startTransition(async () => {
                await updateLanguagePreference(nextLocale);
                router.refresh();
              });
            }}
            type="button"
          >
            <span aria-hidden="true" className="language-switcher__flag">
              {flag}
            </span>
            <span className="language-switcher__label">{t(`language.${entry}` as const)}</span>
          </button>
        );
      })}
    </div>
  );
}
