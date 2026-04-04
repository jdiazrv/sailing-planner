"use client";

import { createContext, useContext, useMemo } from "react";

import {
  type Locale,
  type TranslationKey,
  type Dictionary,
} from "@/lib/i18n";

const I18nContext = createContext<{
  locale: Locale;
  dictionary: Dictionary;
} | null>(null);

export function I18nProvider({
  children,
  dictionary,
  locale,
}: {
  children: React.ReactNode;
  dictionary: Dictionary;
  locale: Locale;
}) {
  const value = useMemo(
    () => ({
      locale,
      dictionary,
    }),
    [dictionary, locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }

  return {
    locale: context.locale,
    t: (key: TranslationKey) => context.dictionary[key] ?? key,
  };
};
