import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

import { getMultipleSystemSettings } from "@/lib/settings";
import lguConfig from "@/config/lgu.config.json";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${lguConfig.identity.brandName} | Smart Governance Portal`,
    description: `Official digital governance portal for ${lguConfig.identity.fullName}. Access public services, news, and community updates.`,
    icons: {
      icon: lguConfig.assets.favicon,
      shortcut: lguConfig.assets.favicon,
      apple: lguConfig.assets.favicon,
    },
  };
}

import { Providers } from "@/components/shared/Providers";
import { ThemeProvider } from "@/components/ThemeProvider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getMultipleSystemSettings(["maintenance_mode", "theme_color"]);
  const isMaintenanceActive = settings.get("maintenance_mode") === "true";
  const themeColor = settings.get("theme_color") || "#2563eb";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      style={{ "--primary-theme": themeColor } as React.CSSProperties}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        style={{ "--primary-theme": themeColor } as React.CSSProperties}
      >
        <Providers isMaintenanceActive={isMaintenanceActive}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
