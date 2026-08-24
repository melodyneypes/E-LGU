import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { getMultipleSystemSettings } from "@/lib/settings";

export default async function CaptainLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    // Strict Guard: ONLY BARANGAY_CAPTAIN is permitted
    if (session.user.role !== "BARANGAY_CAPTAIN") {
        redirect("/auth/login");
    }

    const settings = await getMultipleSystemSettings(["theme_color"]);
    const themeColor = settings.get("theme_color") || "#059669"; // Emerald theme for Barangay leadership

    return (
        <ThemeProvider themeColor={themeColor}>
            <div
                className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300"
                style={{ "--primary-theme": themeColor } as React.CSSProperties}
            >
                {children}
            </div>
        </ThemeProvider>
    );
}
