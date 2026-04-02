import type { Metadata } from "next";
import { Toaster } from "sonner";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { I18nProvider } from "@/components/i18n/provider";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { getRequestLocale } from "@/lib/i18n-server";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sailing Planner",
  description: "Multi-boat planning platform powered by Next.js and Supabase.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t&&t!=='madrugada')document.documentElement.dataset.theme=t})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <I18nProvider locale={locale}>
          <div className="app-language">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          {children}
          <Toaster position="bottom-right" richColors />
        </I18nProvider>
      </body>
    </html>
  );
}
