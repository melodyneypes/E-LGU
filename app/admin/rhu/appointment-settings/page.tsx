import React from "react";
import RHUAppointmentSettingsClient from "./RHUAppointmentSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";

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

    const allowedRoles = ["ADMIN", "ADMIN_AIDE", "BARANGAY_ADMIN", "RHU_CENTER_ADMIN", "RHU_DOCTOR", "RHU_STAFF"];
    const allowedDepts = ["RHU", "HEALTH", "RURAL_HEALTH_UNIT", "MEDICAL"];

    const isAuthorized = allowedRoles.includes(role) || allowedDepts.some(d => department.includes(d)) || (role && role.startsWith("RHU_"));

    if (!isAuthorized) {
        redirect("/admin/rhu/centers");
    }

    const themeColor = "#f43f5e";

    let appointmentConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "RHU" }
    });

    if (!appointmentConfig) {
        appointmentConfig = await prisma.appointmentConfig.create({
            data: {
                department: "RHU",
                maxSlots: 50,
                maxSlotsAM: 25,
                maxSlotsPM: 25,
                amTimeLabel: "08:00 AM - 11:00 AM",
                pmTimeLabel: "01:00 PM - 04:00 PM",
                blockedDates: [],
                activeDays: [1, 2, 3, 4, 5]
            } as any
        });
    }

    const isCenterAdmin = role === "RHU_CENTER_ADMIN" || role === "RHU_DOCTOR" || role === "RHU_STAFF";

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
                />
            </div>
        </div>
    );
}
