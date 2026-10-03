import React from "react";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { AnnouncementApprovalsClient, ApprovalAnnouncementItem } from "./components/AnnouncementApprovalsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
    title: "Announcement Approvals | {{LGU_NAME}} Admin",
    description: "Executive review and approval queue for municipal announcements and department advisories.",
};

export default async function Page() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "CONTENT_ADMIN")) {
        redirect("/auth/login");
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

    let rawAnnouncements: any[] = [];
    try {
        rawAnnouncements = await (prisma as any).announcement.findMany({
            select: safeSelect,
            orderBy: [{ createdAt: "desc" }],
            take: 200,
        });
    } catch {
        rawAnnouncements = [];
    }

    // Enrich with database approval status and department metadata
    let enrichedList: ApprovalAnnouncementItem[] = [];
    try {
        const ids = rawAnnouncements.map((a: any) => a.id).filter(Boolean);
        let detailMap = new Map<string, any>();

        if (ids.length > 0) {
            const rawDetails: any[] = await (prisma as any).$queryRawUnsafe(
                `SELECT id, department, "approvalStatus", "submittedBy", "approvedBy", "rejectionReason" FROM "Announcement" WHERE id = ANY($1::text[])`,
                ids
            );
            detailMap = new Map(rawDetails.map((r: any) => [r.id, r]));
        }

        enrichedList = rawAnnouncements.map((a: any) => {
            const det = detailMap.get(a.id);
            return {
                ...a,
                department: det?.department || (a.category === "Business" ? "BPLO" : "GENERAL"),
                approvalStatus: det?.approvalStatus || (a.category === "Business" ? "PENDING_APPROVAL" : "APPROVED"),
                submittedBy: det?.submittedBy || null,
                approvedBy: det?.approvedBy || null,
                rejectionReason: det?.rejectionReason || null,
            };
        });
    } catch {
        enrichedList = rawAnnouncements.map((a: any) => ({
            ...a,
            department: a.category === "Business" ? "BPLO" : "GENERAL",
            approvalStatus: a.category === "Business" ? "PENDING_APPROVAL" : "APPROVED",
            submittedBy: null,
            approvedBy: null,
            rejectionReason: null,
        }));
    }

    // Filter to only announcements that have gone through or require the approval flow (or departmental submissions)
    const approvalQueueItems = enrichedList.filter(
        (item) => item.department === "BPLO" || item.category === "Business" || item.approvalStatus === "PENDING_APPROVAL" || item.approvalStatus === "REJECTED" || (item.approvalStatus === "APPROVED" && (item.submittedBy || item.department !== "GENERAL"))
    );

    const stats = {
        pending: enrichedList.filter((i) => i.approvalStatus === "PENDING_APPROVAL").length,
        approved: enrichedList.filter((i) => i.approvalStatus === "APPROVED").length,
        rejected: enrichedList.filter((i) => i.approvalStatus === "REJECTED").length,
        total: approvalQueueItems.length,
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <AnnouncementApprovalsClient
                initialData={approvalQueueItems}
                stats={stats}
                currentUserRole={user.role}
            />
        </div>
    );
}
