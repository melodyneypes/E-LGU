import React from "react";
import prisma from "@/lib/db/prisma";
import { BploAnnouncementPage } from "./components/BploAnnouncementPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
    title: "BPLO Announcements | Mapandan Admin",
    description: "Official Business Permits and Licensing Office public advisories and permit schedules.",
};

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        search?: string;
        status?: string;
        priority?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || (user.role !== "ADMIN" && user.role !== "ADMIN_AIDE" && user.role !== "CONTENT_ADMIN")) {
        redirect("/auth/login");
    }

    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "20", 10)));
    const search = params.search || "";
    const status = params.status || "All";
    const priority = params.priority || "All";

    const where: any = {
        category: "Business"
    };

    if (status !== "All") {
        where.approvalStatus = status;
    }

    if (priority !== "All") {
        where.priority = priority;
    }

    if (search.trim()) {
        where.AND = [
            {
                OR: [
                    { title: { contains: search.trim(), mode: "insensitive" } },
                    { content: { contains: search.trim(), mode: "insensitive" } },
                ]
            }
        ];
    }

    const safeSelect = {
        id: true,
        title: true,
        content: true,
        priority: true,
        category: true,
        isPinned: true,
        isActive: true,
        barangay: true,
        imageUrl: true,
        authorEmail: true,
        authorId: true,
        healthCenterId: true,
        eventDate: true,
        eventSchedule: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
    };

    let announcements: any[] = [];
    let totalCount = 0;

    try {
        const results = await Promise.all([
            (prisma as any).announcement.findMany({
                where,
                select: safeSelect,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            (prisma as any).announcement.count({ where }),
        ]);
        announcements = results[0];
        totalCount = results[1];
    } catch {
        // Fallback without new approvalStatus filter if client not yet regenerated
        const fallbackWhere: any = { category: "Business" };
        const results = await Promise.all([
            (prisma as any).announcement.findMany({
                where: fallbackWhere,
                select: safeSelect,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            (prisma as any).announcement.count({ where: fallbackWhere }),
        ]);
        announcements = results[0];
        totalCount = results[1];
    }

    // Enrich with database approval status and department safely
    try {
        const ids = announcements.map((a: any) => a.id).filter(Boolean);
        if (ids.length > 0) {
            const rawDetails: any[] = await (prisma as any).$queryRawUnsafe(
                `SELECT id, department, "approvalStatus", "submittedBy", "approvedBy" FROM "Announcement" WHERE id = ANY($1::text[])`,
                ids
            );
            const detailMap = new Map(rawDetails.map((r: any) => [r.id, r]));
            announcements = announcements.map((a: any) => {
                const det = detailMap.get(a.id);
                return {
                    ...a,
                    department: det?.department || a.department || "BPLO",
                    approvalStatus: det?.approvalStatus || a.approvalStatus || "PENDING_APPROVAL",
                    submittedBy: det?.submittedBy || a.submittedBy || null,
                    approvedBy: det?.approvedBy || a.approvedBy || null,
                };
            });
        }
    } catch {
        // Safe fallback
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <BploAnnouncementPage 
                initialData={announcements} 
                totalCount={totalCount} 
            />
        </div>
    );
}
