"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCaptainReports(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    barangay?: string;
}) {
    try {
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 10;
        const search = params?.search ?? "";
        const status = params?.status ?? "All";

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const userRole = user?.role;
        if (!session?.user?.id || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

        const managedBarangay = user?.managedBarangay || params?.barangay || "{{BARANGAY_NAME}}";

        const whereClause: any = {
            barangay: {
                name: { equals: managedBarangay, mode: "insensitive" }
            }
        };

        if (status !== "All") {
            whereClause.status = status;
        }

        if (search) {
            whereClause.AND = [
                {
                    OR: [
                        { category: { contains: search, mode: "insensitive" } },
                        { description: { contains: search, mode: "insensitive" } },
                        { user: { name: { contains: search, mode: "insensitive" } } },
                        { user: { email: { contains: search, mode: "insensitive" } } }
                    ]
                }
            ];
        }

        const [reports, totalCount, statsData] = await Promise.all([
            (prisma as any).report.findMany({
                where: whereClause,
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
                    user: {
                        select: {
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
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit
            }),
            (prisma as any).report.count({ where: whereClause }),
            (prisma as any).report.groupBy({
                by: ["status"],
                where: {
                    barangay: {
                        name: { equals: managedBarangay, mode: "insensitive" }
                    }
                },
                _count: { status: true }
            })
        ]);

        const stats = {
            total: totalCount,
            pending: 0,
            inProgress: 0,
            completed: 0,
            rejected: 0
        };

        statsData.forEach((s: any) => {
            if (s.status === "PENDING") stats.pending = s._count.status;
            if (s.status === "IN_PROGRESS") stats.inProgress = s._count.status;
            if (s.status === "COMPLETED") stats.completed = s._count.status;
            if (s.status === "REJECTED") stats.rejected = s._count.status;
        });

        const totalPages = Math.ceil(totalCount / limit) || 1;

        return {
            success: true,
            reports,
            totalCount,
            totalPages,
            currentPage: page,
            stats
        };
    } catch (error) {
        console.error("Error in getCaptainReports:", error);
        return { success: false, error: "Failed to fetch reports." };
    }
}

export async function getCaptainReportById(id: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const userRole = user?.role;
        if (!session?.user?.id || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
            return { success: false, error: "Unauthorized" };
        }

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
                user: {
                    select: {
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
            return { success: false, error: "Report not found." };
        }

        return { success: true, report };
    } catch (error) {
        console.error("Error in getCaptainReportById:", error);
        return { success: false, error: "Failed to fetch report details." };
    }
}
