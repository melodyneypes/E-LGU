import React from "react";
import { getSystemSetting } from "@/lib/settings";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { CaptainDirectivesClient } from "./components/CaptainDirectivesClient";
import { getCaptainNotifications } from "./actions";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CaptainDirectivesPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "Apaya";
    const notifRes = await getCaptainNotifications();
    const directives = notifRes.success ? notifRes.notifications || [] : [];

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-12">
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
                title="Executive Directives & Memoranda"
                subtitle={`Official Municipal Directives & Policy Circulars for Brgy. ${managedBarangay}`}
                iconName="file-text"
            />

            <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <CaptainDirectivesClient
                    initialData={directives}
                    managedBarangay={managedBarangay}
                />
            </main>
        </div>
    );
}
