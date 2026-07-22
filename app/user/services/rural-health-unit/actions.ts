"use server";

import prisma from "@/lib/db/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString, sanitizeObject } from "@/lib/validation";

export async function cleanupPastDueRHUAppointments(userId?: string) {
    try {
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [month, day, year] = manilaDateString.split("/");
        const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

        const whereClause: any = {
            appointmentDate: {
                lt: startOfTodayManila
            },
            status: {
                notIn: ["RELEASED", "DELIVERED", "REJECTED"]
            },
            isCancelled: false,
            type: {
                category: "Rural Health Unit"
            }
        };

        if (userId) {
            whereClause.userId = userId;
        }

        await prisma.transaction.updateMany({
            where: whereClause,
            data: {
                isCancelled: true,
                status: "REJECTED",
                rejectionRemarks: "Appointment slot expired / missed"
            }
        });
    } catch (error) {
        console.error("Error cleaning up past-due RHU appointments:", error);
    }
}

export async function getRHUAppointmentConfig() {
    try {
        let rhuConfig = await prisma.appointmentConfig.findUnique({
            where: { department: "RHU" }
        });

        if (!rhuConfig) {
            rhuConfig = await prisma.appointmentConfig.create({
                data: {
                    department: "RHU",
                    maxSlots: 50,
                    blockedDates: [],
                    activeDays: [1, 2, 3, 4, 5]
                }
            });
        }
        return { success: true, data: rhuConfig };
    } catch (error) {
        console.error("Failed to get RHU appointment config:", error);
        return { success: false, error: "Failed to load config" };
    }
}

export async function getRHUBookedSlots(dateString: string) {
    try {
        const date = new Date(dateString);
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedSlots = await prisma.transaction.findMany({
            where: {
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                isCancelled: false,
                type: { category: "Rural Health Unit" }
            },
            select: {
                appointmentDate: true,
                appointmentSlot: true
            }
        });
        return { success: true, data: bookedSlots };
    } catch (error) {
        console.error("Failed to fetch RHU booked slots:", error);
        return { success: false, error: "Failed to fetch booked slots" };
    }
}

export async function submitRHUAppointment(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        await cleanupPastDueRHUAppointments(session.user.id);

        const typeId = sanitizeString(formData.get("typeId") as string);
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string);
        const appointmentDate = new Date(formData.get("appointmentDate") as string);

        const txType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        if (!txType) {
            return { success: false, error: "Invalid transaction type." };
        }

        const activeTx = await prisma.transaction.findFirst({
            where: {
                userId: session.user.id,
                type: { code: txType.code },
                status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
                isCancelled: false
            }
        });
        if (activeTx) {
            return {
                success: false,
                error: `You currently have an ongoing request for "${txType.name}". Please wait for it to be completed or cancelled.`
            };
        }

        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));

        // 1. Check if slot is available
        const configRes = await getRHUAppointmentConfig();
        const config = configRes.success ? configRes.data : null;
        const maxSlotsAM = config?.maxSlotsAM ?? 25;
        const maxSlotsPM = config?.maxSlotsPM ?? 25;

        const startOfDay = new Date(appointmentDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(appointmentDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedCount = await prisma.transaction.count({
            where: {
                appointmentDate: { gte: startOfDay, lte: endOfDay },
                appointmentSlot: appointmentSlot,
                isCancelled: false,
                type: { category: "Rural Health Unit" }
            }
        });

        const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
        const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

        if (maxLimit > 0 && maxLimit < 99999 && bookedCount >= maxLimit) {
            return { success: false, error: "This appointment slot is already fully booked." };
        }

        const isPriority = additionalData.isPriorityLane === true || additionalData.isPriorityLane === "true";

        const queueNumber = await generateQueueNumber({
            source: "web",
            isPriority,
            appointmentDate: startOfDay,
            appointmentSlot,
            category: "RHU"
        });

        const transaction = await prisma.$transaction(async (tx) => {
            const newTx = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: "FOR_REQUESTING", // RHU request initial status when submitted
                    residentSnapshot,
                    additionalData: {
                        ...additionalData,
                        isPriorityLane: isPriority
                    },
                    totalAmount: txType.baseFee,
                    appointmentDate,
                    appointmentSlot,
                    queueNumber,
                    isPriority,
                    businessName: additionalData.businessName || null,
                } as any
            });

            // Update permanent resident profile if any changes
            await tx.resident.update({
                where: { userId: session.user.id },
                data: {
                    firstName: residentSnapshot.firstName,
                    middleName: residentSnapshot.middleName,
                    lastName: residentSnapshot.lastName,
                    suffix: residentSnapshot.suffix,
                    dateOfBirth: residentSnapshot.dateOfBirth ? new Date(residentSnapshot.dateOfBirth) : undefined,
                    civilStatus: residentSnapshot.civilStatus,
                    citizenship: residentSnapshot.citizenship,
                    houseNumber: residentSnapshot.houseNumber,
                    street: residentSnapshot.street,
                    barangay: residentSnapshot.barangay,
                    municipality: residentSnapshot.municipality,
                    province: residentSnapshot.province,
                    contactNumber: residentSnapshot.contactNumber,
                    email: residentSnapshot.email,
                }
            });

            return newTx;
        });

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        return { success: true, data: transaction as any };
    } catch (error) {
        console.error("Submit RHU appointment error:", error);
        return { success: false, error: "Failed to book appointment" };
    }
}

export async function updateRHUAppointmentConfig(data: { maxSlots?: number; activeDays?: number[]; blockedDates?: string[] }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const updated = await prisma.appointmentConfig.upsert({
            where: { department: "RHU" },
            update: {
                maxSlots: data.maxSlots,
                activeDays: data.activeDays,
                blockedDates: data.blockedDates,
                updatedAt: new Date()
            },
            create: {
                department: "RHU",
                maxSlots: data.maxSlots || 50,
                activeDays: data.activeDays || [1, 2, 3, 4, 5],
                blockedDates: data.blockedDates || []
            }
        });

        revalidatePath("/admin/rhu/appointment-settings");
        revalidatePath("/user/services/rural-health-unit");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("updateRHUAppointmentConfig error:", error);
        return { success: false, error: error.message || "Failed to update config" };
    }
}
