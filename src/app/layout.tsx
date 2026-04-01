import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Toaster } from "sonner";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { I18nProvider } from "@/components/i18n/provider";
import { getRequestLocale } from "@/lib/i18n-server";

import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
});

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
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable}`}
      suppressHydrationWarning
    >
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
