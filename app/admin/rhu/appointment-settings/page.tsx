import React from "react";
import RHUAppointmentSettingsClient from "./RHUAppointmentSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRHUHealthCenters } from "@/app/admin/rhu/centers/actions";
import { getCenterAppointmentConfig } from "@/app/user/services/rural-health-unit/actions";

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

    const allowedRoles = ["ADMIN", "RHU_ADMIN", "ADMIN_AIDE", "BARANGAY_ADMIN", "RHU_CENTER_ADMIN", "RHU_DOCTOR", "RHU_STAFF"];
    const allowedDepts = ["RHU", "HEALTH", "RURAL_HEALTH_UNIT", "MEDICAL"];

    const isAuthorized = allowedRoles.includes(role) || allowedDepts.some(d => department.includes(d)) || (role && role.startsWith("RHU_"));

    if (!isAuthorized) {
        redirect("/admin/rhu/centers");
    }

    const themeColor = "#f43f5e";

    // Fetch all health centers
    const centersRes = await getRHUHealthCenters();
    const healthCenters = centersRes.success && centersRes.data ? centersRes.data : [];

    const isCenterAdmin = role === "RHU_CENTER_ADMIN" || role === "RHU_DOCTOR" || role === "RHU_STAFF";
    
    let matchedCenter = null;
    if (isCenterAdmin && session.user) {
        matchedCenter = healthCenters.find((c: any) =>
            (c.userId && String(c.userId) === String(session.user.id)) ||
            (c.accountEmail && session.user.email && String(c.accountEmail).toLowerCase() === String(session.user.email).toLowerCase()) ||
            (session.user.email && String(session.user.email).toLowerCase().includes("lalas") && String(c.name).toLowerCase().includes("lalas")) ||
            (session.user.email && String(session.user.email).toLowerCase().includes("main") && String(c.name).toLowerCase().includes("main"))
        );
    }

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
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* Elegant Header Banner */}
            <div className="px-6 py-8 rounded-[1.5rem] border bg-rose-500/10 border-rose-500/20">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter drop-shadow-sm text-rose-600 dark:text-rose-400">
                    RHU Schedule <span className="tracking-normal italic">Settings</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px] opacity-70">
                    Manage booking slot limits, session hours, active weekdays, and blocked dates for Rural Health Unit appointments.
                </p>
            </div>

            <div className="w-full">
                <RHUAppointmentSettingsClient 
                    themeColor={themeColor}
                    appointmentConfig={appointmentConfig as any}
                    isCenterAdmin={isCenterAdmin}
                    healthCenters={healthCenters}
                    assignedCenterId={matchedCenter?.id || null}
                />
            </div>
        </div>
    );
}
