"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    department?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), TREASURY_STAFF, TREASURY_OFFICER, ADMIN_AIDE, or custom accessiblePages
 */
export async function verifyTreasuryAppointmentAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isTreasury = role === "TREASURY_STAFF" || role === "TREASURY_OFFICER" || role === "ADMIN_AIDE" || department === "TREASURY";
    const hasPageAccess = accessiblePages.includes("/admin/treasury/appointment-settings");

    if (!isLguAdmin && !isTreasury && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to configure Treasury appointment settings.");
    }

    return user;
}

/**
 * 2. GET APPOINTMENT CONFIGURATION FOR TREASURY
 */
export async function getTreasuryAppointmentConfig() {
    try {
        await verifyTreasuryAppointmentAccess();

        let config = await prisma.appointmentConfig.findUnique({
            where: { department: "TREASURY" },
        });

        if (!config) {
            config = await prisma.appointmentConfig.create({
                data: {
                    department: "TREASURY",
                    maxSlots: 50,
                    maxSlotsAM: 25,
                    maxSlotsPM: 25,
                    amTimeLabel: "08:00 AM - 11:00 AM",
                    pmTimeLabel: "01:00 PM - 04:00 PM",
                    blockedDates: [],
                    activeDays: [1, 2, 3, 4, 5],
                } as any,
            });
        }

        return { success: true, data: config, config };
    } catch (error: any) {
        console.error("[getTreasuryAppointmentConfig] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch Treasury appointment configuration." };
    }
}

/**
 * 3. SAVE APPOINTMENT CONFIGURATION + PRECISE AUDIT DIFFS
 */
export async function saveTreasuryAppointmentConfig(data: {
    maxSlotsAM: number;
    maxSlotsPM: number;
    amTimeLabel?: string;
    pmTimeLabel?: string;
    activeDays: number[];
    blockedDates: string[];
}) {
    try {
        await verifyTreasuryAppointmentAccess();

        const existing = await prisma.appointmentConfig.findUnique({
            where: { department: "TREASURY" },
        });

        const totalSlots = (Number(data.maxSlotsAM) || 0) + (Number(data.maxSlotsPM) || 0);

        const updated = await prisma.appointmentConfig.upsert({
            where: { department: "TREASURY" },
            update: {
                maxSlots: totalSlots,
                maxSlotsAM: Number(data.maxSlotsAM) || 0,
                maxSlotsPM: Number(data.maxSlotsPM) || 0,
                amTimeLabel: data.amTimeLabel || "08:00 AM - 11:00 AM",
                pmTimeLabel: data.pmTimeLabel || "01:00 PM - 04:00 PM",
                activeDays: data.activeDays,
                blockedDates: data.blockedDates,
            } as any,
            create: {
                department: "TREASURY",
                maxSlots: totalSlots,
                maxSlotsAM: Number(data.maxSlotsAM) || 0,
                maxSlotsPM: Number(data.maxSlotsPM) || 0,
                amTimeLabel: data.amTimeLabel || "08:00 AM - 11:00 AM",
                pmTimeLabel: data.pmTimeLabel || "01:00 PM - 04:00 PM",
                activeDays: data.activeDays,
                blockedDates: data.blockedDates,
            } as any,
        });

        revalidatePath("/admin/treasury/appointment-settings");
        revalidatePath("/user/services/cedula-appointment");
        revalidatePath("/user/appointment");

        // Format day names for human-readable audit
        const dayNames: { [key: number]: string } = {
            1: "Mon",
            2: "Tue",
            3: "Wed",
            4: "Thu",
            5: "Fri",
            6: "Sat",
            0: "Sun",
        };

        const formatDays = (days: number[]) => {
            if (!days || !Array.isArray(days) || days.length === 0) return "None";
            return days.map(d => dayNames[d] || `Day ${d}`).join(", ");
        };

        const formatDates = (dates: string[]) => {
            if (!dates || !Array.isArray(dates) || dates.length === 0) return "None";
            return dates.join(", ");
        };

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};

            if (existing) {
                if (existing.maxSlotsAM !== data.maxSlotsAM) {
                    changes["maxSlotsAM"] = { old: existing.maxSlotsAM, new: data.maxSlotsAM };
                }
                if (existing.maxSlotsPM !== data.maxSlotsPM) {
                    changes["maxSlotsPM"] = { old: existing.maxSlotsPM, new: data.maxSlotsPM };
                }
                if ((existing.amTimeLabel || "") !== (data.amTimeLabel || "")) {
                    changes["amTimeLabel"] = { old: existing.amTimeLabel || "Default", new: data.amTimeLabel || "Default" };
                }
                if ((existing.pmTimeLabel || "") !== (data.pmTimeLabel || "")) {
                    changes["pmTimeLabel"] = { old: existing.pmTimeLabel || "Default", new: data.pmTimeLabel || "Default" };
                }
                if (JSON.stringify(existing.activeDays || []) !== JSON.stringify(data.activeDays || [])) {
                    changes["activeDays"] = { old: formatDays(existing.activeDays), new: formatDays(data.activeDays) };
                }
                if (JSON.stringify(existing.blockedDates || []) !== JSON.stringify(data.blockedDates || [])) {
                    changes["blockedDates"] = { old: formatDates(existing.blockedDates), new: formatDates(data.blockedDates) };
                }
            }

            const modifiedFields = Object.keys(changes);
            const desc = modifiedFields.length > 0
                ? `Updated Treasury Appointment Settings (Modified: ${modifiedFields.join(", ")})`
                : `Updated Treasury Appointment Settings`;

            await logActivity({
                action: "UPDATE",
                entityType: "AppointmentConfig",
                entityId: updated.id,
                entityName: "Treasury Appointment Configuration",
                description: desc,
                metadata: {
                    department: "TREASURY",
                    changes,
                },
            });
        } catch (auditErr) {
            console.warn("[saveTreasuryAppointmentConfig] Audit log warning:", auditErr);
        }

        return { success: true, data: updated, config: updated };
    } catch (error: any) {
        console.error("[saveTreasuryAppointmentConfig] Error:", error);
        return { success: false, error: error?.message || "Failed to update Treasury appointment settings." };
    }
}
