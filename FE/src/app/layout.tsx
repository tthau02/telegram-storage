import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { branding } from "@/config/branding";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans-app",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: branding.appNameShort,
    template: `%s — ${branding.appNameShort}`,
  },
  description: branding.metaDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
