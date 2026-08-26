import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import AssessorArchiveClient from "./components/AssessorArchiveClient";

export const metadata: Metadata = {
    title: "Document Archives & Tax Declaration Vault | Assessor Hub",
    description: "Unified Real Property Tax declaration archive and physical property digitization.",
};

export const dynamic = "force-dynamic";

export default async function AssessorArchivePage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to Assessor, Treasury, and Admin
    if (role !== "ASSESSOR" && role !== "ADMIN" && role !== "TREASURY_STAFF") {
        redirect("/admin/dashboard");
    }

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Document <span className="text-blue-600 tracking-normal italic">Archives</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Unified Real Property Tax Declaration & PIN master registry with physical document digitization vault.
                </p>
            </div>

            <AssessorArchiveClient themeColor={themeColor} />
        </div>
    );
}
