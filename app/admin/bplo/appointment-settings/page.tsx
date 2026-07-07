import React from "react";
import AppointmentSettingsClient from "./AppointmentSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "BPLO Appointment Settings | Mapandan Portal",
    description: "Official administrative configuration for BPLO appointment slot limits and active schedule days.",
};

export default async function BploAppointmentSettingsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to BPLO staff (ADMIN_AIDE) and Admin
    if (role !== "ADMIN" && role !== "ADMIN_AIDE") {
        redirect("/admin/dashboard");
    }

    // Fetch Settings for the configuration form (theme color)
    const settingsList = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: ["theme_color"]
            }
        }
    });

    const bploSettings = settingsList.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    const themeColor = bploSettings["theme_color"] || "#2563eb";

    let appointmentConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "BPLO" }
    });

    if (!appointmentConfig) {
        appointmentConfig = await prisma.appointmentConfig.create({
            data: {
                department: "BPLO",
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

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* Elegant Header Banner */}
            <div className="px-6 py-8 rounded-[1.5rem] border" style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}25` }}>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter drop-shadow-sm" style={{ color: themeColor }}>
                    BPLO Appointment <span className="tracking-normal italic">Settings</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px] opacity-70">
                    Manage booking slot limits, active weekdays, and blocked dates for BPLO Business Permit appointments.
                </p>
            </div>

            <div className="w-full">
                <AppointmentSettingsClient 
                    themeColor={themeColor}
                    appointmentConfig={appointmentConfig as any}
                />
            </div>
        </div>
    );
}
