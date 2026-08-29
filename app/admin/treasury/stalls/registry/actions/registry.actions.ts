"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/audit";

interface SessionUser {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    department?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), TREASURY_STAFF, TREASURY_OFFICER, ADMIN_AIDE, or custom accessiblePages
 */
export async function verifyMarketRegistryAccess(): Promise<SessionUser> {
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
    const hasPageAccess = accessiblePages.includes("/admin/treasury/stalls/registry") || accessiblePages.includes("/admin/treasury/stalls");

    if (!isLguAdmin && !isTreasury && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage Market Personnel Registry.");
    }

    return user;
}

/**
 * 2. GET ALL MARKET PERSONNEL & VENDORS (LEAN QUERY)
 */
export async function getMarketPersonnel() {
    try {
        await verifyMarketRegistryAccess();

        const personnel = await prisma.user.findMany({
            where: {
                role: { in: ["VENDOR", "COLLECTOR"] as any },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isEmailVerified: true,
                createdAt: true,
                rfid: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return { success: true, data: personnel, personnel };
    } catch (error: any) {
        console.error("[getMarketPersonnel] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch market personnel." };
    }
}

/**
 * 3. CREATE MARKET PERSONNEL + SUPABASE AUTH ROLLBACK SAFETY + AUDIT LOGGING
 */
export async function createMarketPersonnel(data: {
    name: string;
    email: string;
    password: string;
    role: "VENDOR" | "COLLECTOR";
}) {
    let createdAuthUserId: string | null = null;
    try {
        await verifyMarketRegistryAccess();

        const name = data.name.trim();
        const emailClean = data.email.trim().toLowerCase();
        const password = data.password.trim();
        const role = data.role;

        if (!name) {
            return { success: false, error: "Full name is required." };
        }
        if (!emailClean) {
            return { success: false, error: "Valid email address is required." };
        }
        if (!password || password.length < 6) {
            return { success: false, error: "Password must be at least 6 characters." };
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: emailClean },
        });

        if (existingUser) {
            return { success: false, error: "An account with this email address already exists." };
        }

        // 1. Create account in Supabase Auth (auth.users)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailClean,
            password,
            email_confirm: true,
            user_metadata: { name },
        });

        if (authError || !authUser.user) {
            console.error("Failed to create user in Supabase Auth:", authError);
            return { success: false, error: authError?.message || "Failed to create authentication account." };
        }

        createdAuthUserId = authUser.user.id;
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Create corresponding user record in public.User database
        const newUser = await prisma.user.create({
            data: {
                id: authUser.user.id,
                name,
                email: emailClean,
                password: hashedPassword,
                role: role as any,
                department: null,
                isEmailVerified: true,
                emailVerified: new Date(),
                isPasswordChanged: true,
            },
        });

        revalidatePath("/admin/treasury/stalls/registry");
        revalidatePath("/admin/treasury/stalls");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "MarketPersonnel",
                entityId: newUser.id,
                entityName: `${name} (${role})`,
                description: `Created Market Personnel account: "${name}" [${emailClean}] with role ${role}`,
                metadata: {
                    name,
                    email: emailClean,
                    role,
                },
            });
        } catch (auditErr) {
            console.warn("[createMarketPersonnel] Audit log warning:", auditErr);
        }

        return { success: true, user: newUser, data: newUser };
    } catch (error: any) {
        // Rollback Supabase Auth user if Prisma DB save fails
        if (createdAuthUserId) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
            } catch (rollbackErr) {
                console.warn("[createMarketPersonnel] Auth rollback warning:", rollbackErr);
            }
        }
        console.error("[createMarketPersonnel] Error:", error);
        return { success: false, error: error?.message || "Failed to create market personnel." };
    }
}

/**
 * 4. UPDATE MARKET PERSONNEL (ROLE / PASSWORD) + SYNC TO AUTH + PRECISE AUDIT DIFFS
 */
export async function updateMarketPersonnel(
    userId: string,
    data: {
        role?: "VENDOR" | "COLLECTOR";
        password?: string;
    }
) {
    try {
        if (!userId) {
            return { success: false, error: "User ID is required." };
        }

        await verifyMarketRegistryAccess();

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true },
        });

        if (!existing) {
            return { success: false, error: "Personnel account not found." };
        }

        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        const isUserUuid = isUuid(userId);

        const updateData: any = {};
        let passwordReset = false;

        if (data.role && data.role !== existing.role) {
            updateData.role = data.role as any;
        }

        if (data.password && data.password.trim()) {
            if (data.password.trim().length < 6) {
                return { success: false, error: "Password must be at least 6 characters." };
            }

            if (isUserUuid) {
                // Sync password update to Supabase Auth (auth.users)
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: data.password.trim(),
                });
                if (authError) {
                    console.error("Failed to update password in Supabase Auth:", authError);
                    return { success: false, error: "Failed to update authentication password: " + authError.message };
                }
            }
            updateData.password = await bcrypt.hash(data.password.trim(), 10);
            updateData.isPasswordChanged = true;
            passwordReset = true;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        revalidatePath("/admin/treasury/stalls/registry");
        revalidatePath("/admin/treasury/stalls");

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if (data.role && existing.role !== data.role) {
                changes["role"] = { old: existing.role, new: data.role };
            }
            if (passwordReset) {
                changes["password"] = { old: "********", new: "Password Reset Successfully" };
            }

            const modifiedFields = Object.keys(changes);
            const desc = modifiedFields.length > 0
                ? `Updated Personnel Account "${existing.name}" (Modified: ${modifiedFields.join(", ")})`
                : `Updated Personnel Account "${existing.name}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "MarketPersonnel",
                entityId: userId,
                entityName: `${existing.name} (${updatedUser.role})`,
                description: desc,
                metadata: {
                    name: existing.name,
                    email: existing.email,
                    changes,
                },
            });
        } catch (auditErr) {
            console.warn("[updateMarketPersonnel] Audit log warning:", auditErr);
        }

        return { success: true, user: updatedUser, data: updatedUser };
    } catch (error: any) {
        console.error("[updateMarketPersonnel] Error:", error);
        return { success: false, error: error?.message || "Failed to update market personnel." };
    }
}

/**
 * 5. DELETE MARKET PERSONNEL + AUTH CLEANUP + AUDIT SNAPSHOT
 */
export async function deleteMarketPersonnel(userId: string) {
    try {
        if (!userId) {
            return { success: false, error: "User ID is required." };
        }

        await verifyMarketRegistryAccess();

        const existing = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true, role: true, department: true },
        });

        if (!existing) {
            return { success: false, error: "Personnel account not found." };
        }

        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        if (isUuid(userId)) {
            // Delete user from Supabase Auth (auth.users)
            await supabaseAdmin.auth.admin.deleteUser(userId).catch((err: any) => {
                console.error("Supabase auth delete warning:", err);
            });
        }

        // Delete from public.User
        await prisma.user.delete({
            where: { id: userId },
        });

        revalidatePath("/admin/treasury/stalls/registry");
        revalidatePath("/admin/treasury/stalls");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "MarketPersonnel",
                entityId: idClean(userId),
                entityName: `${existing.name} (${existing.role})`,
                description: `Deleted Market Personnel Account: "${existing.name}" [${existing.email}]`,
                metadata: {
                    deletedRecordSnapshot: existing,
                },
            });
        } catch (auditErr) {
            console.warn("[deleteMarketPersonnel] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteMarketPersonnel] Error:", error);
        return { success: false, error: error?.message || "Failed to delete personnel account." };
    }
}

function idClean(id: string): string {
    return id || "unknown";
}
