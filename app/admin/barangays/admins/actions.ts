"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";
import { logActivity } from "@/lib/audit";

/**
 * Helper to verify municipal admin or delegated access privileges
 * Allowed:
 * 1. Role: ADMIN with Department: LGU
 * 2. Role: ADMIN with "/admin/barangays/admins" explicitly in accessiblePages
 */
async function verifyAdminSession() {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentDepartment = (session?.user as any)?.department;
    const accessiblePages = ((session?.user as any)?.accessiblePages || []) as string[];

    const isLguAdmin = currentUserRole === "ADMIN" && currentDepartment === "LGU";
    const isAssignedAdmin = currentUserRole === "ADMIN" && accessiblePages.some(page => 
        page === "/admin/barangays/admins" || 
        page === "/admin/barangays" || 
        page.startsWith("/admin/barangays/admins")
    );

    if (!session?.user?.id || (!isLguAdmin && !isAssignedAdmin)) {
        throw new Error("Unauthorized. Only LGU Administrators or assigned Admin staff have permission to manage Barangay Admin accounts.");
    }
    return session.user;
}

/**
 * Fetch all registered Barangay Admins and Captains
 */
export async function getBarangayAdmins() {
    try {
        await verifyAdminSession();

        const admins = await prisma.user.findMany({
            where: {
                role: {
                    in: ['BARANGAY_ADMIN', 'BARANGAY_CAPTAIN' as any]
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                isEmailVerified: true,
                role: true,
                managedBarangay: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, data: admins };
    } catch (error: any) {
        console.error("[getBarangayAdmins] Error fetching admins:", error);
        return { success: false, error: error?.message || "Failed to fetch barangay administrators." };
    }
}

/**
 * Register a new Barangay Admin or Captain account
 */
export async function createBarangayAdmin(formData: FormData) {
    try {
        await verifyAdminSession();

        const name = (formData.get("name") as string)?.trim();
        const email = (formData.get("email") as string)?.trim().toLowerCase();
        const password = formData.get("password") as string;
        const managedBarangay = (formData.get("managedBarangay") as string)?.trim();
        const requestedRole = (formData.get("role") as string) || "BARANGAY_ADMIN";
        const role = requestedRole === "BARANGAY_CAPTAIN" ? "BARANGAY_CAPTAIN" : "BARANGAY_ADMIN";

        if (!name || !email || !password || !managedBarangay) {
            return { success: false, error: "Please fill in all required fields (Name, Email, Password, and Barangay)." };
        }

        if (password.length < 6) {
            return { success: false, error: "Password must be at least 6 characters long." };
        }

        // Check if email already exists in Database
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { success: false, error: `The email "${email}" is already registered. Please use a different email address.` };
        }

        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name }
        });

        if (authError || !authUser?.user) {
            console.error("[createBarangayAdmin] Supabase Auth Error:", authError);
            return { 
                success: false, 
                error: authError?.message || "Failed to create cloud authentication account. Please check your credentials or try again." 
            };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.user.create({
            data: {
                id: authUser.user.id,
                name,
                email,
                password: hashedPassword,
                role: role as any,
                managedBarangay,
                isEmailVerified: true,
                emailVerified: new Date(),
                isPasswordChanged: true,
            }
        });

        // Log Barangay Admin Creation in Audit Trail
        try {
            const roleLabel = role === "BARANGAY_CAPTAIN" ? "Barangay Captain" : "Barangay Admin";
            await logActivity({
                action: "CREATE",
                entityType: "User",
                entityId: newAdmin.id,
                entityName: `${name} (${email})`,
                description: `Created ${roleLabel} account: "${name}" for Brgy. ${managedBarangay}`,
                metadata: {
                    targetEmail: email,
                    role,
                    barangay: managedBarangay
                }
            });
        } catch (auditError) {
            console.warn("[createBarangayAdmin] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/admins");
        return { success: true, admin: newAdmin };
    } catch (error: any) {
        console.error("[createBarangayAdmin] Unexpected Error:", error);
        return { 
            success: false, 
            error: error?.message || "An unexpected error occurred while creating the account. Please try again." 
        };
    }
}

/**
 * Update an existing Barangay Admin or Captain account
 */
export async function updateBarangayAdmin(userId: string, formData: FormData) {
    try {
        await verifyAdminSession();

        if (!userId) {
            return { success: false, error: "Missing user identifier." };
        }

        const name = (formData.get("name") as string)?.trim();
        const email = (formData.get("email") as string)?.trim().toLowerCase();
        const password = formData.get("password") as string;
        const managedBarangay = (formData.get("managedBarangay") as string)?.trim();
        const requestedRole = (formData.get("role") as string) || "BARANGAY_ADMIN";
        const role = requestedRole === "BARANGAY_CAPTAIN" ? "BARANGAY_CAPTAIN" : "BARANGAY_ADMIN";

        if (!name || !email || !managedBarangay) {
            return { success: false, error: "Name, email, and assigned barangay are required." };
        }

        if (password && password.trim().length > 0 && password.trim().length < 6) {
            return { success: false, error: "New password must be at least 6 characters long." };
        }

        // Query existing user details for audit traceability & state diffing
        const oldUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                managedBarangay: true,
                isEmailVerified: true,
            }
        });

        if (!oldUser) {
            return { success: false, error: "User account could not be found. It may have been deleted." };
        }

        // Check if email is taken by someone else
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail && existingEmail.id !== userId) {
            return { success: false, error: `The email "${email}" is already in use by another account.` };
        }

        // Sync updates to Supabase Auth if email changed and user ID is a valid UUID
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        const isUserUuid = isUuid(userId);

        if (oldUser.email !== email && isUserUuid) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email,
                email_confirm: true
            });
            if (authError) {
                console.error("[updateBarangayAdmin] Supabase Auth Email Error:", authError);
                return { success: false, error: "Failed to update authentication email: " + authError.message };
            }
        }

        const dataToUpdate: any = {
            name,
            email,
            role,
            managedBarangay,
        };

        const isPasswordUpdated = password && password.trim() !== "";
        if (isPasswordUpdated) {
            if (isUserUuid) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: password.trim()
                });
                if (authError) {
                    console.error("[updateBarangayAdmin] Supabase Auth Password Error:", authError);
                    return { success: false, error: "Failed to update authentication password: " + authError.message };
                }
            }
            dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
            dataToUpdate.isPasswordChanged = true;
        }

        // Compute granular diffs for audit trail
        const changes: Record<string, { old: any; new: any }> = {};
        const changedFieldNames: string[] = [];

        if (oldUser.name !== name) {
            changes["name"] = { old: oldUser.name || "None", new: name };
            changedFieldNames.push("Full Name");
        }
        if (oldUser.email !== email) {
            changes["email"] = { old: oldUser.email, new: email };
            changedFieldNames.push("Email Address");
        }
        if (oldUser.role !== role) {
            changes["role"] = { old: oldUser.role, new: role };
            changedFieldNames.push("Position / Role");
        }
        if ((oldUser.managedBarangay || "") !== managedBarangay) {
            changes["managedBarangay"] = { old: oldUser.managedBarangay || "None", new: managedBarangay };
            changedFieldNames.push("Assigned Barangay");
        }
        if (isPasswordUpdated) {
            changes["password"] = { old: "••••••••", new: "•••••••• (Password Reset)" };
            changedFieldNames.push("Account Password");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });

        // Build dynamic description for audit log
        let dynamicDesc = "";
        const roleLabel = role === "BARANGAY_CAPTAIN" ? "Barangay Captain" : "Barangay Admin";
        if (changedFieldNames.length > 0) {
            dynamicDesc = `Updated ${changedFieldNames.join(", ")} for ${roleLabel}: "${name}" (${email})`;
        } else {
            dynamicDesc = `Saved ${roleLabel} profile for "${name}" (no fields modified)`;
        }

        // Log Update Activity in Audit Trail
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "User",
                entityId: userId,
                entityName: `${name} (${email})`,
                description: dynamicDesc,
                metadata: {
                    targetEmail: email,
                    role,
                    barangay: managedBarangay,
                    changedFields: changedFieldNames.length > 0 ? changedFieldNames : undefined,
                    changes: Object.keys(changes).length > 0 ? changes : undefined,
                }
            });
        } catch (auditError) {
            console.warn("[updateBarangayAdmin] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/admins");
        return { success: true, user: updatedUser };
    } catch (error: any) {
        console.error("[updateBarangayAdmin] Unexpected Error:", error);
        return { 
            success: false, 
            error: error?.message || "An error occurred while updating the account. Please try again." 
        };
    }
}

/**
 * Toggle Email Verification status for a Barangay Admin
 */
export async function toggleBarangayAdminVerification(userId: string, isVerified: boolean) {
    try {
        await verifyAdminSession();

        if (!userId) {
            return { success: false, error: "Missing user identifier." };
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                managedBarangay: true,
                isEmailVerified: true,
            }
        });

        if (!targetUser) {
            return { success: false, error: "User account not found." };
        }

        const prevStatusLabel = targetUser.isEmailVerified ? "Verified" : "Unverified";
        const nextStatusLabel = isVerified ? "Verified" : "Unverified";

        await prisma.user.update({
            where: { id: userId },
            data: {
                isEmailVerified: isVerified,
                emailVerified: isVerified ? new Date() : null,
            }
        });

        const roleLabel = targetUser.role === "BARANGAY_CAPTAIN" ? "Barangay Captain" : "Barangay Admin";
        const accountDisplayName = `${targetUser.name || "Administrator"} (${targetUser.email})`;

        try {
            await logActivity({
                action: "STATUS_CHANGE",
                entityType: "User",
                entityId: targetUser.id,
                entityName: accountDisplayName,
                description: `Changed email verification status to ${nextStatusLabel.toUpperCase()} for ${roleLabel}: "${targetUser.name || targetUser.email}"`,
                metadata: {
                    targetEmail: targetUser.email,
                    role: targetUser.role,
                    barangay: targetUser.managedBarangay || null,
                    changedFields: ["Email Verification Status"],
                    changes: {
                        isEmailVerified: {
                            old: prevStatusLabel,
                            new: nextStatusLabel,
                        }
                    }
                }
            });
        } catch (auditError) {
            console.warn("[toggleBarangayAdminVerification] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/admins");
        return { success: true };
    } catch (error: any) {
        console.error("[toggleBarangayAdminVerification] Unexpected Error:", error);
        return { 
            success: false, 
            error: error?.message || "Failed to update email verification status. Please try again." 
        };
    }
}

/**
 * Permanently delete a Barangay Admin or Captain account
 */
export async function deleteBarangayAdmin(userId: string) {
    try {
        const sessionUser = await verifyAdminSession();

        if (!userId) {
            return { success: false, error: "Missing user identifier." };
        }

        // Prevent self-deletion
        if (sessionUser?.id === userId) {
            return { success: false, error: "You cannot delete your own active administrator account." };
        }

        // Query existing user details for audit traceability & snapshot
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                managedBarangay: true,
                createdAt: true,
            }
        });

        if (!targetUser) {
            return { success: false, error: "Barangay admin account not found or already deleted." };
        }

        // Delete from Supabase Auth if it's a valid UUID
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        if (isUuid(userId)) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(userId);
            } catch (authErr) {
                console.warn("[deleteBarangayAdmin] Supabase Auth cleanup warning:", authErr);
            }
        }

        // Delete from Database
        await prisma.user.delete({
            where: { id: userId }
        });

        // Log Deletion Activity in Audit Trail
        try {
            const roleLabel = targetUser.role === "BARANGAY_CAPTAIN" ? "Barangay Captain" : "Barangay Admin";
            await logActivity({
                action: "DELETE",
                entityType: "User",
                entityId: userId,
                entityName: `${targetUser.name || "Administrator"} (${targetUser.email})`,
                description: `Deleted ${roleLabel} account: "${targetUser.name || targetUser.email}" from Brgy. ${targetUser.managedBarangay || "General"}`,
                metadata: {
                    targetEmail: targetUser.email,
                    role: targetUser.role,
                    barangay: targetUser.managedBarangay || null,
                    deletedRecordSnapshot: targetUser
                }
            });
        } catch (auditError) {
            console.warn("[deleteBarangayAdmin] Audit log warning (non-blocking):", auditError);
        }

        revalidatePath("/admin/barangays/admins");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteBarangayAdmin] Unexpected Error:", error);
        return { 
            success: false, 
            error: error?.message || "An unexpected error occurred while deleting the account. Please try again." 
        };
    }
}
