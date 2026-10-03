import React from "react";
import AssessorDashboard from "@/app/admin/assessor/AssessorDashboard";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Municipal Assessor Hub | {{LGU_NAME}} Portal",
    description: "Official administrative dashboard for Real Property Tax assessment, property declaration evaluations, and field inspections.",
};

export default async function AssessorPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (role !== "ASSESSOR" && role !== "ADMIN" && role !== "TREASURY_STAFF") {
        redirect("/admin/dashboard");
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Municipal Assessor <span className="text-blue-600 tracking-normal italic">Hub</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Review Real Property Tax (Amilyar) applications, evaluate Building Permits / Deed of Sales, schedule Ocular Field Inspections, and generate new Tax Declarations.
                </p>
            </div>

            <AssessorDashboard />
        </div>
    );
}
