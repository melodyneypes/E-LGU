import React from "react";
import AppointmentSettingsClient from "@/app/admin/treasury/appointment-settings/AppointmentSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Assessor Appointment Settings | Mapandan Portal",
    description: "Official administrative configuration for Assessor and RPT appointment slot limits and schedule days.",
};

export default async function AssessorAppointmentSettingsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (role !== "ASSESSOR" && role !== "ADMIN" && role !== "TREASURY_STAFF") {
        redirect("/admin/dashboard");
    }

    const settingsList = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: ["theme_color"]
            }
        }
    });

    const treasurySettings = settingsList.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    const themeColor = treasurySettings["theme_color"] || "#2563eb";

    let appointmentConfig = null;
    try {
        appointmentConfig = await prisma.appointmentConfig.findUnique({
            where: { department: "ASSESSOR" }
        });

        if (!appointmentConfig) {
            appointmentConfig = await prisma.appointmentConfig.create({
                data: {
                    department: "ASSESSOR",
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
    } catch (e) {
        console.error("Error loading/creating ASSESSOR appointment config:", e);
    }

    const safeConfig = appointmentConfig ? JSON.parse(JSON.stringify(appointmentConfig)) : {
        id: "cfg_assessor",
        department: "ASSESSOR",
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
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Assessor Appointment <span className="text-blue-600 italic">Settings</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm">
                    Configure daily slot capacities, Morning/Afternoon shift limits, blocked holidays, and active days for Real Property Tax appointments.
                </p>
            </div>

            <AppointmentSettingsClient
                appointmentConfig={safeConfig}
                themeColor={themeColor}
                title="Assessor & RPT Appointment Configuration"
                description="Configure daily slot capacities, Morning/Afternoon shift limits, blocked holidays, and active days for Real Property Tax (Amilyar) appointments."
            />
        </div>
    );
}
