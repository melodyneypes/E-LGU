"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Admin Boundary] Caught runtime error:", error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center mb-6 shadow-xl shadow-rose-500/5">
                <AlertTriangle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                Something Went <span className="text-rose-600 dark:text-rose-400">Wrong</span>
            </h2>

            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md text-sm font-medium leading-relaxed">
                An unexpected system issue occurred while loading this section. The admin portal remains fully operational.
            </p>

            {error.digest && (
                <div className="mt-3 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-mono text-slate-400">Error Digest: {error.digest}</span>
                </div>
            )}

            <div className="flex items-center gap-3 mt-8">
                <Button
                    onClick={() => reset()}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all flex items-center gap-2 h-11 px-6 shadow-lg"
                >
                    <RefreshCw className="w-4 h-4" />
                    Try Reloading
                </Button>

                <Button
                    asChild
                    variant="outline"
                    className="border-slate-200 dark:border-white/10 font-bold text-xs uppercase tracking-wider rounded-xl h-11 px-6 flex items-center gap-2"
                >
                    <Link href="/admin/dashboard">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </Link>
                </Button>
            </div>
        </div>
    );
}
