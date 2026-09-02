import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMDRRMOOverviewStats } from "./actions";
import MDRRMODashboardClient from "./MDRRMODashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "MDRRMO Emergency Hub | Mapandan Admin",
    description: "Command center for Municipal Disaster Risk Reduction & Management Office, ambulance dispatch, driver monitoring, vehicle compliance, and emergency advisories.",
};

export default async function MDRRMODashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const role = ((session.user as any)?.role || "").toUpperCase();
    const department = (((session.user as any)?.department as string) || "").toUpperCase();

    const allowedRoles = ["ADMIN", "MDRRMO_ADMIN", "ADMIN_AIDE", "MAYOR"];
    const isAuthorized = allowedRoles.includes(role) || department.includes("MDRRMO") || department.includes("DISASTER") || department === "LGU";

    if (!isAuthorized) {
        redirect("/admin/dashboard");
    }

    const statsRes = await getMDRRMOOverviewStats();
    const stats = (statsRes.success && statsRes.stats) ? statsRes.stats : {
        totalFleet: 0,
        activeFleet: 0,
        totalDrivers: 0,
        driversOnDuty: 0,
        activeDispatches: 0,
        expiringDocsCount: 0,
        expiredDocsCount: 0,
        hotlinesCount: 0
    };

    const fleet = (statsRes.fleet || []) as any[];
    const drivers = (statsRes.drivers || []) as any[];
    const expiringDocs = (statsRes.expiringDocs || []) as any[];
    const recentSchedules = (statsRes.recentSchedules || []) as any[];
    const recentAnnouncements = (statsRes.recentAnnouncements || []) as any[];
    const hotlines = (statsRes.hotlines || []) as any[];

    const isReadOnly = false;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24">
            <MDRRMODashboardClient
                initialStats={stats}
                initialFleet={fleet}
                initialDrivers={drivers}
                initialExpiringDocs={expiringDocs}
                initialSchedules={recentSchedules}
                initialAnnouncements={recentAnnouncements}
                initialHotlines={hotlines}
                isReadOnly={isReadOnly}
                userRole={role}
                userName={session.user.name || "MDRRMO Officer"}
            />
        </div>
    );
}
