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

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getMultipleSystemSettings([
      "site_logo",
      "brand_word_1",
      "brand_word_2"
    ]);

    const brand1 = settings.get("brand_word_1") || "E";
    const brand2 = settings.get("brand_word_2") || "Mapandan";
    const logo = settings.get("site_logo") || "";

    return {
      metadataBase: new URL("https://emapandan.com"),
      title: `${brand1}${brand2}`,
      description: `Official digital governance portal for ${brand1}${brand2}. Access public services, news, and community updates.`,
      ...(logo ? {
        icons: {
          icon: [
            {
              url: logo,
              href: logo,
            },
          ],
          shortcut: [logo],
          apple: [logo],
        }
      } : {}),
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "EMapandan",
      description: "Official digital governance portal for EMapandan."
    };
  }
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
