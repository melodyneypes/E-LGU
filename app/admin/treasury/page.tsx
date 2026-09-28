import React from "react";
import TreasuryDashboard from "./TreasuryDashboard";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Volume2 } from "lucide-react";

export const metadata: Metadata = {
    title: "Treasury Hub | Mapandan Portal",
    description: "Official administrative dashboard for treasury services and financial processing.",
};

export default async function TreasuryPage() {
    await getServerSession(authOptions);

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            Treasury <span className="text-primary tracking-normal italic">Hub</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Securely manage municipal financial applications, evaluate tax declarations, and issue official community certificates.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/admin/treasury/accountable-forms">
                        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 dark:hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none whitespace-nowrap shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Accountable Forms Log
                        </div>
                    </Link>

                    <Link href="/admin/treasury/queue">
                        <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer select-none whitespace-nowrap">
                            <Volume2 className="w-4 h-4 animate-bounce" />
                            Live Queue
                        </div>
                    </Link>
                </div>
            </div>

            <TreasuryDashboard />
        </div>
    );
}
