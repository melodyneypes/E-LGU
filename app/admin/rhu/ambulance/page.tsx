import React from "react";
import AmbulanceSettingsClient from "./AmbulanceSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRHUHealthCenters } from "@/app/admin/rhu/centers/actions";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

export const metadata: Metadata = {
    title: "RHU Ambulance Settings | Mapandan Portal",
    description: "Official administrative configuration for Rural Health Unit (RHU) emergency dispatch and ambulance fleet status.",
};

export default async function RHUAmbulanceSettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const role = (session.user as any)?.role;
    const department = ((session.user as any)?.department || "").toUpperCase();

    const allowedRoles = ["ADMIN", "RHU_ADMIN", "ADMIN_AIDE", "BARANGAY_ADMIN", "RHU_CENTER_ADMIN", "RHU_DOCTOR", "RHU_STAFF"];
    const allowedDepts = ["RHU", "HEALTH", "RURAL_HEALTH_UNIT", "MEDICAL", "LGU"];

    const isAuthorized = allowedRoles.includes(role) || allowedDepts.some(d => department.includes(d)) || (role && role.startsWith("RHU_"));

    if (!isAuthorized) {
        redirect("/admin/rhu");
    }

    const userRole = (role || "").toUpperCase();
    const isReadOnly = !(userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole.startsWith("RHU_"));

    const centersRes = await getRHUHealthCenters();
    const healthCenters = centersRes.success && centersRes.data ? centersRes.data : [];

    const matchedCenter = session.user ? await getMatchedCenterForUser(session.user) : null;
    const matchedCenterId = matchedCenter?.id || null;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-20">
            <AmbulanceSettingsClient 
                isReadOnly={isReadOnly}
                healthCenters={healthCenters}
                matchedCenterId={matchedCenterId}
            />
        </div>
    );
}
