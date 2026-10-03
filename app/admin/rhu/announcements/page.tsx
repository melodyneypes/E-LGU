import React from "react";
import prisma from "@/lib/db/prisma";
import { RHUAnnouncementPage } from "./components/RHUAnnouncementPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Metadata } from "next";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "RHU Announcements | {{LGU_NAME}} Admin",
    description: "Official Rural Health Unit health advisories and public announcements.",
};

let cachedBarangays: string[] | null = null;
let cachedBarangaysTimestamp = 0;

async function getCachedBarangays(): Promise<string[]> {
    const now = Date.now();
    if (cachedBarangays && now - cachedBarangaysTimestamp < 300000) {
        return cachedBarangays;
    }
    const barangays = await prisma.barangayInfo.findMany({
        orderBy: { name: "asc" },
        select: { name: true },
    });
    cachedBarangays = barangays.map((b) => b.name);
    cachedBarangaysTimestamp = now;
    return cachedBarangays;
}

export default async function RHUAnnouncementsPage({
    searchParams,
}: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        category?: string;
        priority?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const params = await searchParams;

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "Health";
    const priority = params.priority || "All";
    const barangayParam = params.barangay || null;

    const user = session?.user as any;
    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";
    const matchedCenter = user ? await getMatchedCenterForUser(user) : null;

    // Build optimized Prisma filter clause
    const where: any = {};

    // Barangay scoping check
    if (isBarangayAdmin) {
        where.barangay = user.managedBarangay;
    } else if (barangayParam && barangayParam !== "All") {
        where.barangay = barangayParam;
    }

    // Category filter (defaults to Health for RHU)
    if (category && category !== "All") {
        where.category = category;
    }

    // Priority filter
    if (priority && priority !== "All") {
        where.priority = priority;
    }

    // Search filter across title & content
    if (search.trim()) {
        where.OR = [
            { title: { contains: search.trim(), mode: "insensitive" } },
            { content: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const announcementDelegate = (prisma as any).announcement;

    if (!announcementDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;announcement&apos; not found. Please restart the dev server.
                </div>
            </div>
        );
    }

    // Execute paginated findMany and total count concurrently
    const [announcements, totalCount, activeBarangays] = await Promise.all([
        announcementDelegate.findMany({
            where,
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        announcementDelegate.count({ where }),
        getCachedBarangays(),
    ]);

    return (
        <RHUAnnouncementPage
            initialData={announcements}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            priority={priority}
            currentBarangay={isBarangayAdmin ? user.managedBarangay : barangayParam || undefined}
            activeBarangays={activeBarangays}
            hideCategory={true}
            currentUser={{
                id: user?.id,
                email: user?.email,
                role: user?.role,
                matchedCenterId: matchedCenter?.id
            }}
        />
    );
}
