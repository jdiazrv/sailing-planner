import type { Metadata } from "next";
import { Toaster } from "sonner";

import { I18nProvider } from "@/components/i18n/provider";
import { getDictionary } from "@/lib/i18n";
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
  const dictionary = getDictionary(locale);

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
        <I18nProvider dictionary={dictionary} locale={locale}>
          {children}
          <Toaster position="bottom-right" richColors />
        </I18nProvider>
      </body>
    </html>
  );
}
