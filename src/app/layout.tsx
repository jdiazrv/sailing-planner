import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Sailing Planner",
  description: "Multi-boat planning platform powered by Next.js and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
