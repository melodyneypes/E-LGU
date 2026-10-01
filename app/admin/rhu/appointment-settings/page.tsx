import React from "react";
import RHUAppointmentSettingsClient from "./RHUAppointmentSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRHUHealthCenters } from "@/app/admin/rhu/centers/actions";
import { getCenterAppointmentConfig } from "@/app/user/services/rural-health-unit/actions";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

export const metadata: Metadata = {
    title: "RHU Appointment Settings | Mapandan Portal",
    description: "Official administrative configuration for Rural Health Unit (RHU) appointment slot limits and active schedule days.",
};

export default async function RHUAppointmentSettingsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const role = (session.user as any)?.role;
    const department = ((session.user as any)?.department || "").toUpperCase();

    const allowedRoles = ["ADMIN", "RHU_ADMIN", "ADMIN_AIDE", "BARANGAY_ADMIN", "RHU_CENTER_ADMIN", "RHU_DOCTOR", "RHU_STAFF", "ASST_SEC"];
    const allowedDepts = ["RHU", "HEALTH", "RURAL_HEALTH_UNIT", "MEDICAL", "LGU"];

    const isAuthorized = allowedRoles.includes(role) || allowedDepts.some(d => department.includes(d)) || (role && role.startsWith("RHU_"));

    if (!isAuthorized) {
        redirect("/admin/rhu/centers");
    }

    const themeColor = "#f43f5e";

    // Fetch all health centers and user matched center concurrently
    const [centersRes, matchedCenter] = await Promise.all([
        getRHUHealthCenters(),
        session.user ? getMatchedCenterForUser(session.user) : Promise.resolve(null)
    ]);
    const healthCenters = centersRes.success && centersRes.data ? centersRes.data : [];

    const userRole = (role || "").toUpperCase();
    const canManageSchedule = userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole === "RHU_CENTER_ADMIN" || userRole === "ASST_SEC";
    const isCenterAdmin = !!matchedCenter || role === "RHU_CENTER_ADMIN" || role === "RHU_DOCTOR" || role === "RHU_STAFF" || role === "ASST_SEC";

    // Load initial configuration
    const initialCenterId = matchedCenter?.id || healthCenters[0]?.id || "NONE";
    const configRes = await getCenterAppointmentConfig(initialCenterId);
    const appointmentConfig = configRes.success && configRes.data ? configRes.data : {
        id: "",
        department: initialCenterId === "NONE" ? "RHU" : `RHU_CENTER_${initialCenterId}`,
        maxSlots: 50,
        maxSlotsAM: 25,
        maxSlotsPM: 25,
        amTimeLabel: "08:00 AM - 11:00 AM",
        pmTimeLabel: "01:00 PM - 04:00 PM",
        blockedDates: [],
        activeDays: [1, 2, 3, 4, 5]
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-20">
            <RHUAppointmentSettingsClient 
                themeColor={themeColor}
                appointmentConfig={appointmentConfig as any}
                isCenterAdmin={isCenterAdmin}
                healthCenters={healthCenters}
                assignedCenterId={matchedCenter?.id || null}
                canManageSchedule={canManageSchedule}
            />
        </div>
    );
}
