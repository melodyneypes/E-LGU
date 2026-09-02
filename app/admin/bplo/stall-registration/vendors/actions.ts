"use server";

import prisma from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

interface SessionUser {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    department?: string;
    accessiblePages?: string[];
}

export async function verifyBploVendorAccess(): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isBplo =
        role === "BPLO" ||
        role === "BPLO_STAFF" ||
        role === "BPLO_OFFICER" ||
        role === "ADMIN_AIDE" ||
        role === "MAYOR" ||
        department === "BPLO";

    const hasPageAccess =
        accessiblePages.includes("/admin/bplo/stall-registration/vendors") ||
        accessiblePages.includes("/admin/bplo/stall-registration") ||
        accessiblePages.includes("/admin/bplo");

    if (!isLguAdmin && !isBplo && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage Market Vendors.");
    }

    return user;
}

export async function createVendor(data: {
    name: string;
    email: string;
    password?: string;
}) {
    try {
        await verifyBploVendorAccess();

        if (!data.name?.trim() || !data.email?.trim()) {
            return { success: false, error: "Name and email are required." };
        }

        const normalizedEmail = data.email.trim().toLowerCase();

        // Check if email is already taken in database
        const existing = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            return { success: false, error: "An account with this email already exists." };
        }

        const plainPassword = data.password && data.password.trim().length >= 6 
            ? data.password.trim() 
            : "Vendor@123";

        // Create user in Supabase auth.users if supabaseAdmin is active
        let authUserId: string | undefined;
        if (supabaseAdmin) {
            const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password: plainPassword,
                email_confirm: true,
                user_metadata: { name: data.name.trim() },
            });

            if (authError || !authUser?.user) {
                console.error("[createVendor] Supabase Auth Error:", authError);
                return {
                    success: false,
                    error: authError?.message || "Failed to create cloud authentication account.",
                };
            }
            authUserId = authUser.user.id;
        }

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const newVendor = await prisma.user.create({
            data: {
                ...(authUserId && { id: authUserId }),
                name: data.name.trim(),
                email: normalizedEmail,
                password: hashedPassword,
                role: "VENDOR" as any,
                isEmailVerified: true,
                emailVerified: new Date(),
                isPasswordChanged: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isEmailVerified: true,
                createdAt: true,
                vendorStalls: {
                    select: {
                        id: true,
                        stallNumber: true,
                        status: true,
                    },
                },
            },
        });

        revalidatePath("/admin/bplo/stall-registration/vendors");
        revalidatePath("/admin/bplo/stall-registration");
        revalidatePath("/admin/treasury/collections");

        return { success: true, data: newVendor };
    } catch (error: any) {
        console.error("Failed to create vendor:", error);
        return { success: false, error: error.message || "Failed to create vendor account." };
    }
}

export async function updateVendor(
    id: string,
    data: {
        name?: string;
        email?: string;
        password?: string;
    }
) {
    try {
        await verifyBploVendorAccess();

        if (!id) {
            return { success: false, error: "Vendor ID is required." };
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

        const isUuid = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

        // Update in Supabase Auth if applicable
        if (supabaseAdmin && isUuid(id)) {
            const authUpdatePayload: any = {};
            if (normalizedEmail) {
                authUpdatePayload.email = normalizedEmail;
                authUpdatePayload.email_confirm = true;
            }
            if (data.password && data.password.trim().length >= 6) {
                authUpdatePayload.password = data.password.trim();
            }
            if (data.name) {
                authUpdatePayload.user_metadata = { name: data.name.trim() };
            }

            if (Object.keys(authUpdatePayload).length > 0) {
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                    id,
                    authUpdatePayload
                );
                if (authError) {
                    console.error("[updateVendor] Supabase Auth Error:", authError);
                    return { success: false, error: "Auth sync error: " + authError.message };
                }
            }
        }

        const updateData: any = {};
        if (data.name) updateData.name = data.name.trim();
        if (normalizedEmail) updateData.email = normalizedEmail;
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
                isEmailVerified: true,
                createdAt: true,
                vendorStalls: {
                    select: {
                        id: true,
                        stallNumber: true,
                        status: true,
                    },
                },
            },
        });

        revalidatePath("/admin/bplo/stall-registration/vendors");
        revalidatePath("/admin/bplo/stall-registration");
        revalidatePath("/admin/treasury/collections");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to update vendor:", error);
        return { success: false, error: error.message || "Failed to update vendor account." };
    }
}

export async function deleteVendor(id: string) {
    try {
        await verifyBploVendorAccess();

        if (!id) {
            return { success: false, error: "Vendor ID is required." };
        }

        // Unlink stalls assigned to this vendor
        await (prisma as any).stall.updateMany({
            where: { vendorId: id },
            data: { vendorId: null, status: "VACANT" },
        });

        // Delete from Supabase Auth if applicable
        const isUuid = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        if (supabaseAdmin && isUuid(id)) {
            try {
                await supabaseAdmin.auth.admin.deleteUser(id);
            } catch (authErr) {
                console.warn("[deleteVendor] Supabase Auth cleanup warning:", authErr);
            }
        }

        await prisma.user.delete({
            where: { id },
        });

        revalidatePath("/admin/bplo/stall-registration/vendors");
        revalidatePath("/admin/bplo/stall-registration");
        revalidatePath("/admin/treasury/collections");

        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete vendor:", error);
        return { success: false, error: error.message || "Failed to delete vendor account." };
    }
}

