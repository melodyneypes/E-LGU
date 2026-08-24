import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import EngineerArchiveClient from "./components/EngineerArchiveClient";

export const metadata: Metadata = {
    title: "Permit Archives & Digitization | Engineer Hub",
    description: "Unified building permit document archive and physical record digitization.",
};

export const dynamic = "force-dynamic";

export default async function EngineerArchivePage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to Engineer and Admin
    if (role !== "ENGINEER" && role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-primary rounded-full" />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Permit <span className="text-primary tracking-normal italic">Archives</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Search all building permit transactions and digitize legacy physical paper copies into the repository.
                </p>
            </div>

            <EngineerArchiveClient themeColor={themeColor} />
        </div>
    );
}
