import React from "react";
import EngineerAppointmentClient from "./EngineerAppointmentClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Appointment Settings | Mapandan Portal",
    description: "Official administrative configuration for Engineering appointment slot limits and active schedule days.",
};

export default async function EngineerAppointmentSettingsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    // Restricted to Engineer and Admin
    if (role !== "ENGINEER" && role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    const themeColor = "#e11d48"; // using a standard red/primary color for engineering

    let appointmentConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "ENGINEERING" }
    });

    if (!appointmentConfig) {
        appointmentConfig = await prisma.appointmentConfig.create({
            data: {
                department: "ENGINEERING",
                maxSlots: 50,
                maxSlotsAM: 25,
                maxSlotsPM: 25,
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
                    Appointment <span className="tracking-normal italic">Settings</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px] opacity-70">
                    Manage booking slot limits, active weekdays, and blocked dates for Engineering appointments.
                </p>
            </div>

            <div className="w-full">
                <EngineerAppointmentClient 
                    themeColor={themeColor}
                    appointmentConfig={appointmentConfig as any}
                />
            </div>
        </div>
    );
}
