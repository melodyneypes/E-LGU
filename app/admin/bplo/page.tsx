import React from "react";
import BploDashboard from "./components/BploDashboard";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";


export const metadata: Metadata = {
    title: "BPLO Permit Portal | {{LGU_NAME}} Portal",
    description: "Official administrative dashboard for Business Permits, Inspections, and Licensing services.",
};

export default async function BploPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || (user.role !== "ADMIN" && user.role !== "ADMIN_AIDE")) {
        redirect("/auth/login");
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            BPLO <span className="text-primary tracking-normal italic">Permits & Inspections</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Evaluate commercial applications, approve sanitary/fire inspections, resolve business disputes, and allocate permits.
                    </p>
                </div>

            </div>

            <BploDashboard />
        </div>
    );
}
