import type { Metadata } from "next";
import { Toaster } from "sonner";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { I18nProvider } from "@/components/i18n/provider";
import { getRequestLocale } from "@/lib/i18n-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sailing Planner",
  description: "Multi-boat planning platform powered by Next.js and Supabase.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <I18nProvider locale={locale}>
          <div className="app-language">
            <LanguageSwitcher />
          </div>
          {children}
          <Toaster position="bottom-right" richColors />
        </I18nProvider>
      </body>
    </html>
  );
}
