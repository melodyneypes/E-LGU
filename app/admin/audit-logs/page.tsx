import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import AuditLogsClient from "./components/AuditLogsClient";

export const metadata: Metadata = {
    title: "Audit Trail & System Activity Logs | Admin Hub",
    description: "System-wide immutable audit trail of administrative operations, property evaluations, and municipal decisions.",
};

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to Admin
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
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
                        Audit <span className="text-blue-600 tracking-normal italic">Trail & Logs</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Immutable activity log tracking municipal approvals, assessments, document digitization, and administrative modifications.
                </p>
            </div>

            <AuditLogsClient themeColor={themeColor} />
        </div>
    );
}
