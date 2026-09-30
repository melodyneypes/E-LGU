"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getAppointmentDetailsAction(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const [transaction, themeSetting, followUpAppointment] = await Promise.all([
            prisma.transaction.findUnique({
                where: { id },
                include: {
                    type: true,
                    cedula: true,
                    businessPermit: true,
                    birthCertificateRequest: true,
                    birthCertificateRegistry: true,
                    deathRegistration: true,
                    deathCertificateRequest: true,
                    marriageRegistration: true,
                    marriageLicenseApplication: true,
                    marriageCertificateRequest: true,
                    feedback: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            residentProfile: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    middleName: true,
                                    suffix: true,
                                    contactNumber: true,
                                    barangay: true,
                                    street: true,
                                    houseNumber: true,
                                    purok: true,
                                    isSenior: true,
                                    isPWD: true,
                                    isSoloParent: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.systemSetting.findUnique({
                where: { key: "theme_color" },
                select: { value: true }
            }),
            prisma.followUpAppointment.findFirst({
                where: { sourceTransactionId: id }
            }).catch(() => null)
        ]);

        if (!transaction) {
            return { success: false, error: "Appointment not found." };
        }

        if (transaction.userId !== session.user.id) {
            return { success: false, error: "Forbidden: You do not have access to view this appointment." };
        }

        return {
            success: true,
            data: {
                ...transaction,
                followUpAppointment
            },
            themeColor: themeSetting?.value || "#2563eb"
        };
    } catch (error: any) {
        console.error("getAppointmentDetailsAction Error:", error);
        return { success: false, error: error.message || "Failed to fetch appointment details." };
    }
}

export async function cancelAppointmentAction(id: string, reason?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) {
            return { success: false, error: "Appointment not found." };
        }

        if (transaction.userId !== session.user.id && session.user.role !== "ADMIN") {
            return { success: false, error: "Forbidden: You can only cancel your own appointments." };
        }

        if (["RELEASED", "DELIVERED", "CANCELLED", "REJECTED"].includes(transaction.status)) {
            return { success: false, error: `Cannot cancel appointment with status "${transaction.status}".` };
        }

        const updatedAdditionalData = {
            ...((transaction.additionalData as any) || {}),
            cancellationReason: reason || "Cancelled by resident",
            cancelledAt: new Date().toISOString()
        };

        const updated = await (prisma.transaction.update as any)({
            where: { id },
            data: {
                isCancelled: true,
                status: "CANCELLED",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("cancelAppointmentAction Error:", error);
        return { success: false, error: error.message || "Failed to cancel appointment." };
    }
}
