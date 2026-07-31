import React from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { MayorDashboardHeader } from "@/app/mayor-dashboard/MayorDashboardHeader";

export const dynamic = "force-dynamic";

interface MayorDashboardProps {
    searchParams?: Promise<{
        barangay?: string;
    }>;
}

export default async function MayorDashboardPage({ searchParams }: MayorDashboardProps) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    // Role check guard: Only MAYOR or ADMIN role can access
    if (session.user.role !== "MAYOR" && session.user.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const params = (await searchParams) || {};
    const selectedBarangay = params.barangay || "";

    // Basic queries for clean initial state
    const [settingsList, activeBarangays] = await Promise.all([
        prisma.systemSetting.findMany({
            where: { key: { in: ["theme_color", "brand_word_1", "brand_word_2", "site_logo"] } }
        }),
        prisma.barangayInfo.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    ]);

    const settingsMap = new Map(settingsList.map((s) => [s.key, s.value]));
    const themeColor = settingsMap.get("theme_color") || "#2563eb";

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
            {/* Dedicated Executive Header Navbar */}
            <MayorDashboardHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={activeBarangays.map((b: { name: string }) => b.name)}
                selectedBarangay={selectedBarangay}
            />

            {/* Clean Canvas Main Content Area */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-10 shadow-xl text-center space-y-4">
                    <h2 className="text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                        Executive Oversight Portal
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto font-medium italic">
                        Welcome to the official executive portal of the Office of the Municipal Mayor.
                    </p>
                </div>
            </main>
        </div>
    );
}
