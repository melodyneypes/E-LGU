"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";


export async function approveResident(residentId: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    const adminId = (session.user as { id?: string })?.id || "admin";

    try {
        const resident = await prisma.resident.update({
            where: { id: residentId },
            data: {
                registrationStatus: "APPROVED",
                reviewedAt: new Date(),
                reviewedBy: adminId,
                rejectionRemarks: null,
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                userId: true,
            }
        });

        // 🔄 Sync with the connected User table
        if (resident.userId) {
            await prisma.user.update({
                where: { id: resident.userId },
                data: {
                    isEmailVerified: true,
                    emailVerified: new Date(),
                }
            });
        }

        // Trigger email notification directly from server
        if (resident.email) {
            const emailResult = await sendEmail({
                type: "APPROVED",
                to: resident.email,
                name: `${resident.firstName} ${resident.lastName}`,
                remarks: null,
            });
            
            if (!emailResult.success) {
                console.warn(`Approval recorded, but email failed to send: ${emailResult.error}`);
                // You can choose to throw or return partial success here
            }
        }

        revalidatePath("/admin/residents");
        return { success: true };
    } catch (error) {
        console.error("Approve resident error:", error);
        return { success: false, error: "Failed to approve resident." };
    }
}

export async function rejectResident(residentId: string, remarks: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    if (!remarks || remarks.trim().length < 10) {
        return { success: false, error: "Rejection remarks must be at least 10 characters." };
    }

    const adminId = (session.user as { id?: string })?.id || "admin";

    try {
        const resident = await prisma.resident.update({
            where: { id: residentId },
            data: {
                registrationStatus: "REJECTED",
                reviewedAt: new Date(),
                reviewedBy: adminId,
                rejectionRemarks: remarks.trim(),
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                userId: true,
            }
        });

        // 🔄 Sync with the connected User table
        if (resident.userId) {
            await prisma.user.update({
                where: { id: resident.userId },
                data: {
                    isEmailVerified: false,
                    emailVerified: null,
                }
            });
        }

        // Trigger rejection email directly from server
        if (resident.email) {
            const emailResult = await sendEmail({
                type: "REJECTED",
                to: resident.email,
                name: `${resident.firstName} ${resident.lastName}`,
                remarks: remarks.trim(),
            });

            if (!emailResult.success) {
                console.warn(`Rejection recorded, but email failed to send: ${emailResult.error}`);
            }
        }

        revalidatePath("/admin/residents");
        return { success: true };
    } catch (error) {
        console.error("Reject resident error:", error);
        return { success: false, error: "Failed to reject resident." };
    }
}

export async function getPendingResidentsCount() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
        return 0;
    }

    try {
        const count = await prisma.resident.count({
            where: { registrationStatus: "PENDING" }
        });
        return count;
    } catch {
        return 0;
    }
}

export async function getResidentForReview(residentId: string) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const resident = await prisma.resident.findUnique({
            where: { id: residentId },
            include: {
                category: true,
            }
        });
        return { success: true, resident };
    } catch (error) {
        console.error("Get resident error:", error);
        return { success: false, error: "Failed to fetch resident." };
    }
}

export async function checkDuplicateResident(
    firstName: string,
    lastName: string,
    middleName: string | null
) {
    try {
        const duplicates = await prisma.resident.findMany({
            where: {
                firstName: { equals: firstName.trim(), mode: "insensitive" },
                lastName: { equals: lastName.trim(), mode: "insensitive" },
                middleName: middleName && middleName.trim() !== "" 
                    ? { equals: middleName.trim(), mode: "insensitive" } 
                    : null,
                registrationStatus: "APPROVED"
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                barangay: true,
                email: true,
                createdAt: true
            }
        });
        return { success: true, duplicates };
    } catch (error) {
        console.error("Check duplicate resident error:", error);
        return { success: false, error: "Failed to perform duplicate check." };
    }
}

export async function checkDuplicateResidentName(firstName: string, lastName: string) {
    try {
        const duplicates = await prisma.resident.findMany({
            where: {
                firstName: { equals: firstName.trim(), mode: "insensitive" },
                lastName: { equals: lastName.trim(), mode: "insensitive" }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                barangay: true,
                registrationStatus: true
            }
        });
        return { success: true, duplicates };
    } catch (error) {
        console.error("Check duplicate resident name error:", error);
        return { success: false, error: "Failed to perform duplicate name check." };
    }
}

export async function checkEmailRegistered(email: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() }
        });
        return { success: true, exists: !!user };
    } catch (error) {
        console.error("Check email registered error:", error);
        return { success: false, error: "Failed to perform email check." };
    }
}


