import React from "react";
import BFPDashboard from "./BFPDashboard";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "BFP Hub | {{LGU_NAME}} Portal",
    description: "Official administrative dashboard for BFP evaluation and processing.",
};

export default async function BFPPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to BFP and Admin
    if (role !== "BFP" && role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-red-600 rounded-full" />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        BFP <span className="text-red-600 tracking-normal italic">Hub</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Review and evaluate building permit applications submitted by Residents.
                </p>
            </div>

            <BFPDashboard />
        </div>
    );
}
