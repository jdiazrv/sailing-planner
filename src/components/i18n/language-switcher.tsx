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
    <label className="language-switcher">
      <span>{t("language.label")}</span>
      <select
        defaultValue={locale}
        disabled={isPending}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          startTransition(async () => {
            await updateLanguagePreference(nextLocale);
            router.refresh();
          });
        }}
      >
        {locales.map((entry) => (
          <option key={entry} value={entry}>
            {t(`language.${entry}` as const)}
          </option>
        ))}
      </select>
    </label>
  );
}
