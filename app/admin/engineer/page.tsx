import React from "react";
import EngineerDashboard from "./EngineerDashboard";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Engineer Hub | Mapandan Portal",
    description: "Official administrative dashboard for building permit evaluation and processing.",
};

export default async function EngineerPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to Engineer and Admin
    if (role !== "ENGINEER" && role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            Engineer <span className="text-primary tracking-normal italic">Hub</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Review and evaluate building permit applications submitted by Residents.
                    </p>
                </div>

                <div>
                    <Link
                        href="/admin/engineer/archive"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                        <span>📂 Open Permit Archives Vault</span>
                    </Link>
                </div>
            </div>

            <EngineerDashboard />
        </div>
    );
}
