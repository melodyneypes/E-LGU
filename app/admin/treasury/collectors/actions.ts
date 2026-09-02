"use server";

import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface SessionUser {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    department?: string;
    accessiblePages?: string[];
}

export async function verifyTreasuryCollectorAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isTreasury =
        role === "TREASURY_STAFF" ||
        role === "TREASURY_OFFICER" ||
        role === "ADMIN_AIDE" ||
        role === "MAYOR" ||
        department === "TREASURY";

    const hasPageAccess =
        accessiblePages.includes("/admin/treasury/collectors") ||
        accessiblePages.includes("/admin/treasury/collections") ||
        accessiblePages.includes("/admin/treasury");

    if (!isLguAdmin && !isTreasury && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage Ticket Collectors.");
    }

    return user;
}

export async function createCollector(data: {
    name: string;
    email: string;
    password?: string;
    rfid?: string;
}) {
    try {
        await verifyTreasuryCollectorAccess();

        if (!data.name?.trim() || !data.email?.trim()) {
            return { success: false, error: "Name and email are required." };
        }

        const normalizedEmail = data.email.trim().toLowerCase();

        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return { success: false, error: "An account with this email already exists." };
        }

        const plainPassword = data.password && data.password.trim().length >= 6 
            ? data.password.trim() 
            : "Collector@123";
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newCollector = await prisma.user.create({
            data: {
                name: data.name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: "COLLECTOR" as any,
                rfid: data.rfid?.trim() || null,
                isEmailVerified: true,
                isPasswordChanged: false,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rfid: true,
                isEmailVerified: true,
                createdAt: true,
                _count: {
                    select: {
                        collectorCollections: true,
                    },
                },
            },
        });

        revalidatePath("/admin/treasury/collectors");
        revalidatePath("/admin/treasury/collections");

        return { success: true, data: newCollector };
    } catch (error: any) {
        console.error("Failed to create collector:", error);
        return { success: false, error: error.message || "Failed to create collector account." };
    }
}

export async function updateCollector(
    id: string,
    data: {
        name?: string;
        email?: string;
        password?: string;
        rfid?: string | null;
    }
) {
    try {
        await verifyTreasuryCollectorAccess();

        if (!id) {
            return { success: false, error: "Collector ID is required." };
        }

        const normalizedEmail = data.email ? data.email.trim().toLowerCase() : undefined;

        if (normalizedEmail) {
            const duplicate = await prisma.user.findFirst({
                where: {
                    email: normalizedEmail,
                    NOT: { id },
                },
            });
            if (duplicate) {
                return { success: false, error: "Email is already taken by another account." };
            }
        }

        const updateData: any = {};
        if (data.name) updateData.name = data.name.trim();
        if (normalizedEmail) updateData.email = normalizedEmail;
        if (data.rfid !== undefined) updateData.rfid = data.rfid?.trim() || null;
        if (data.password && data.password.trim().length >= 6) {
            updateData.password = await bcrypt.hash(data.password.trim(), 10);
            updateData.isPasswordChanged = true;
        }

        const updated = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rfid: true,
                isEmailVerified: true,
                createdAt: true,
                _count: {
                    select: {
                        collectorCollections: true,
                    },
                },
            },
        });

        revalidatePath("/admin/treasury/collectors");
        revalidatePath("/admin/treasury/collections");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update collector:", error);
        return { success: false, error: error.message || "Failed to update collector account." };
    }
}

export async function deleteCollector(id: string) {
    try {
        await verifyTreasuryCollectorAccess();

        if (!id) {
            return { success: false, error: "Collector ID is required." };
        }

        await prisma.user.delete({
            where: { id },
        });

        revalidatePath("/admin/treasury/collectors");
        revalidatePath("/admin/treasury/collections");

        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete collector:", error);
        return { success: false, error: error.message || "Failed to delete collector account." };
    }
}

export async function bindCollectorRFID(id: string, rfid: string | null) {
    try {
        await verifyTreasuryCollectorAccess();

        if (!id) {
            return { success: false, error: "Collector ID is required." };
        }

        const trimmedRfid = rfid?.trim() || null;

        if (trimmedRfid) {
            const existingRfid = await prisma.user.findFirst({
                where: {
                    rfid: trimmedRfid,
                    NOT: { id },
                },
            });

            if (existingRfid) {
                return { success: false, error: "This RFID badge is already bound to another user." };
            }
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { rfid: trimmedRfid },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                rfid: true,
                isEmailVerified: true,
                createdAt: true,
                _count: {
                    select: {
                        collectorCollections: true,
                    },
                },
            },
        });

        revalidatePath("/admin/treasury/collectors");
        revalidatePath("/admin/treasury/collections");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to bind RFID:", error);
        return { success: false, error: error.message || "Failed to update RFID tag." };
    }
}
