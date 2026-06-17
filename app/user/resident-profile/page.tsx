import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import ResidentProfileClient from "./ResidentProfileClient";
import * as React from "react";

export const dynamic = "force-dynamic";

export default async function ResidentProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }

    // Query database for the Resident profile associated with the authenticated User
    const resident = await prisma.resident.findUnique({
        where: { userId: (session.user as any).id },
    });

    const settings = await getMultipleSystemSettings(["theme_color"]);
    const themeColor = settings.get("theme_color") || "#2563eb";

    return (
        <div className="py-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight italic text-slate-900 dark:text-white leading-none">
                        Resident Profile
                    </h1>
                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">
                        Manage and review your verified citizen details
                    </p>
                </div>
            </div>

            <ResidentProfileClient 
                resident={resident} 
                themeColor={themeColor} 
            />
        </div>
    );
}
