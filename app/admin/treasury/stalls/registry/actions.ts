"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

export async function createMarketPersonnel(data: {
    name: string;
    email: string;
    password: string;
    role: "VENDOR" | "COLLECTOR";
}) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;

        const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY", "MAYOR"];
        if (!session || !allowedRoles.includes(userRole)) {
            return { success: false, error: "Unauthorized privileges." };
        }

        const emailClean = data.email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({
            where: { email: emailClean },
        });

        if (existingUser) {
            return { success: false, error: "An account with this email address already exists." };
        }

        // 1. Create account in Supabase Auth (auth.users)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: emailClean,
            password: data.password.trim(),
            email_confirm: true,
            user_metadata: { name: data.name.trim() }
        });

        if (authError || !authUser.user) {
            console.error("Failed to create user in Supabase Auth:", authError);
            return { success: false, error: authError?.message || "Failed to create authentication account." };
        }

        const hashedPassword = await bcrypt.hash(data.password.trim(), 10);

        // 2. Create corresponding user record in public.User database
        const newUser = await prisma.user.create({
            data: {
                id: authUser.user.id,
                name: data.name.trim(),
                email: emailClean,
                password: hashedPassword,
                role: data.role as any,
                department: null,
                isEmailVerified: true,
                emailVerified: new Date(),
                isPasswordChanged: true,
            },
        });

        revalidatePath("/admin/treasury/stalls/registry");
        return { success: true, user: newUser };
    } catch (error: any) {
        console.error("Failed to create market personnel:", error);
        return { success: false, error: error.message || "Failed to create market personnel" };
    }
}

export async function updateMarketPersonnel(
    userId: string,
    data: {
        role?: "VENDOR" | "COLLECTOR";
        password?: string;
    }
) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;

        const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY", "MAYOR"];
        if (!session || !allowedRoles.includes(userRole)) {
            return { success: false, error: "Unauthorized privileges." };
        }

        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        const isUserUuid = isUuid(userId);

        const updateData: any = {};
        if (data.role) {
            updateData.role = data.role;
        }

        if (data.password && data.password.trim()) {
            if (isUserUuid) {
                // Sync password update to Supabase Auth (auth.users)
                const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                    password: data.password.trim()
                });
                if (authError) {
                    console.error("Failed to update password in Supabase Auth:", authError);
                    return { success: false, error: "Failed to update authentication password: " + authError.message };
                }
            }
            updateData.password = await bcrypt.hash(data.password.trim(), 10);
            updateData.isPasswordChanged = true;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        revalidatePath("/admin/treasury/stalls/registry");
        return { success: true, user: updatedUser };
    } catch (error: any) {
        console.error("Failed to update market personnel:", error);
        return { success: false, error: error.message || "Failed to update market personnel" };
    }
}

export async function deleteMarketPersonnel(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;

        const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY", "MAYOR"];
        if (!session || !allowedRoles.includes(userRole)) {
            return { success: false, error: "Unauthorized privileges." };
        }

        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
        if (isUuid(userId)) {
            // Delete user from Supabase Auth (auth.users)
            await supabaseAdmin.auth.admin.deleteUser(userId).catch((err: any) => {
                console.error("Supabase auth delete warning:", err);
            });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        revalidatePath("/admin/treasury/stalls/registry");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete market personnel:", error);
        return { success: false, error: error.message || "Failed to delete personnel account" };
    }
}
