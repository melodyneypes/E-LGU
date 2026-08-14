"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getUserReportByIdAction(id: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const sessionUser = session.user as any;
        const userId = sessionUser.id;
        const userEmail = sessionUser.email ? String(sessionUser.email).trim().toLowerCase() : "";

        // Find the report
        const report = await (prisma as any).report.findUnique({
            where: { id },
            select: {
                id: true,
                category: true,
                description: true,
                status: true,
                images: true,
                latitude: true,
                longitude: true,
                address: true,
                adminComment: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                barangay: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!report) {
            return { success: false, error: "Report not found" };
        }

        // Verify ownership (by User ID or User Email) or Admin / Staff role
        const isOwner = Boolean(
            (userId && report.userId === userId) ||
            (userEmail && report.user?.email && report.user.email.trim().toLowerCase() === userEmail)
        );

        const isAuthorizedRole = ["ADMIN", "POSO_OFFICER", "BARANGAY_ADMIN"].includes(sessionUser.role);

        if (!isOwner && !isAuthorizedRole) {
            console.warn(`[UserReportAction] Access denied for User: ${userEmail || userId} on Report: ${id}`);
            return { success: false, error: "Unauthorized" };
        }

        return { success: true, report };
    } catch (error) {
        console.error("[UserReportAction] Detailed fetch error:", error);
        return { success: false, error: "Failed to fetch report details." };
    }
}
