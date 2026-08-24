"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCaptainHotlines(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
}) {
    try {
        const page = params?.page ?? 1;
        const pageSize = params?.pageSize ?? 10;
        const search = params?.search ?? "";
        const category = params?.category ?? "All";
        const status = params?.status ?? "All";

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const userRole = user?.role;
        if (!session?.user?.id || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

        const where: any = {};

        if (category && category !== "All") {
            where.category = category;
        }

        if (status !== "All") {
            if (status === "Active" || status === "Published") where.isActive = true;
            if (status === "Inactive" || status === "Draft") where.isActive = false;
        }

        if (search.trim()) {
            where.OR = [
                { name: { contains: search.trim(), mode: "insensitive" } },
                { category: { contains: search.trim(), mode: "insensitive" } },
                { mobileNumber: { contains: search.trim(), mode: "insensitive" } },
                { telephone: { contains: search.trim(), mode: "insensitive" } },
                { address: { contains: search.trim(), mode: "insensitive" } },
            ];
        }

        const hotlineDelegate = (prisma as any).hotline;
        if (!hotlineDelegate) {
            return { success: false, error: "Hotline database model not found." };
        }

        const [hotlines, totalCount] = await Promise.all([
            hotlineDelegate.findMany({
                where,
                orderBy: { order: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            hotlineDelegate.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / pageSize) || 1;

        return {
            success: true,
            hotlines,
            totalCount,
            totalPages,
            currentPage: page,
        };
    } catch (error) {
        console.error("Error in getCaptainHotlines:", error);
        return { success: false, error: "Failed to fetch hotlines." };
    }
}
