import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";
import UserLayoutClient from "./UserLayoutClient";
import * as React from "react";
import prisma from "@/lib/db/prisma";
import { headers, cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "";

    const isPublicPath = 
        pathname.startsWith("/user/dining") ||
        pathname.startsWith("/user/accommodation") ||
        pathname.startsWith("/user/tourism") ||
        pathname.startsWith("/user/news") ||
        pathname.startsWith("/user/events") ||
        pathname.startsWith("/user/projects") ||
        pathname.startsWith("/user/officials") ||
        pathname.startsWith("/user/hotlines");

    const session = await getServerSession(authOptions);

    if (!isPublicPath) {
        if (!session || !session.user) {
            redirect("/auth/login");
        }

        // Force REAL-TIME Database Check for Spam/Deactivation Protocol
        const dbUser = await (prisma.user.findUnique({
            where: { id: (session.user as any).id },
            select: { isEmailVerified: true, rejectionCount: true, role: true } as any
        }) as any);

        // If account is marked as inactive or spam threshold reached, trigger immediate logout/redirect
        if (dbUser?.role === "USER" && (!dbUser.isEmailVerified || dbUser.rejectionCount >= 3)) {
            redirect("/auth/login?error=Your account has been deactivated due to multiple rejected requests. Please visit the Municipal Treasury Office for restoration.");
        }
    }

    const settings = await getMultipleSystemSettings([
        "site_logo", 
        "brand_word_1", 
        "brand_word_2", 
        "theme_color",
        "maintenance_mode",
        "maintenance_mode_updated_at"
    ]);

    const cookieStore = await cookies();
    const bypassMaintenanceCookieValue = cookieStore.get("bypass_maintenance")?.value;

    const isMaintenance = settings.get("maintenance_mode") === "true";
    const maintenanceUpdatedAt = settings.get("maintenance_mode_updated_at") || "0";
    const bypassMaintenance = bypassMaintenanceCookieValue === maintenanceUpdatedAt;

    if (isMaintenance && !bypassMaintenance) {
        redirect("/maintenance");
    }

    return (
        <UserLayoutClient 
            logoUrl={settings.get("site_logo") || ""}
            brandWord1={settings.get("brand_word_1") || "E"}
            brandWord2={settings.get("brand_word_2") || ""}
            themeColor={settings.get("theme_color") || "#2563eb"}
        >
            {children}
        </UserLayoutClient>
    );
}
