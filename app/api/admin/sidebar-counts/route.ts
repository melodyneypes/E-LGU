import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRHUEquipmentNotificationCount } from "@/app/admin/rhu/equipment/actions";

interface CacheEntry {
    data: {
        pendingReportsCount: number;
        pendingResidentsCount: number;
        pendingTransactionsCount: number;
        pendingAnnouncementsCount?: number;
        unviewedLcrCounts: Record<string, number>;
        rhuEquipmentNotificationCount?: number;
    };
    timestamp: number;
}

const cacheStore: Record<string, CacheEntry> = {};
const CACHE_TTL = 10000; // 10 seconds TTL

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        const isBarangayAdmin = user.role === "BARANGAY_ADMIN";
        const managedBarangay = user.managedBarangay;

        const cacheKey = isBarangayAdmin && managedBarangay 
            ? managedBarangay 
            : (user.email || user.id || "GLOBAL_ADMIN").toLowerCase();
        const now = Date.now();

        if (cacheStore[cacheKey] && (now - cacheStore[cacheKey].timestamp < CACHE_TTL)) {
            return NextResponse.json(cacheStore[cacheKey].data);
        }

        const reportsWhere: any = { status: "PENDING" };
        const residentsWhere: any = { registrationStatus: "PENDING" };

        if (isBarangayAdmin && managedBarangay) {
            reportsWhere.barangay = {
                name: managedBarangay
            };
            residentsWhere.barangay = managedBarangay;
        }

        const [pendingReportsCount, pendingResidentsCount, pendingTransactionsCount, lcrTransactions] = await Promise.all([
            prisma.report.count({ where: reportsWhere }),
            prisma.resident.count({ where: residentsWhere }),
            prisma.transaction.count({ where: { status: { in: ["FOR_REQUESTING", "PAID"] } } }),
            prisma.transaction.findMany({
                where: {
                    status: "FOR_INSPECTION",
                    isCancelled: false,
                    type: {
                        OR: [
                            { category: "Civil Registry" },
                            { code: { startsWith: "LCR_" } },
                            { code: { startsWith: "CIVIL_REGISTRY" } }
                        ]
                    }
                },
                select: {
                    id: true,
                    type: { select: { code: true } }
                }
            })
        ]);

        const codeToCategory: Record<string, string> = {
            LCR_BIRTH_REG: "Birth Registration",
            LCR_BIRTH: "Birth Certificate",
            LCR_PSA_ENDORSEMENT: "PSA Endorsement",
            LCR_DEATH_PSA_ENDORSEMENT: "PSA Endorsement",
            LCR_MARRIAGE_PSA_ENDORSEMENT: "PSA Endorsement",
            LCR_DEATH_REG: "Death Registration",
            LCR_DEATH: "Death Certificate",
            LCR_MARRIAGE_LICENSE: "Marriage License",
            LCR_MARRIAGE_REG: "Marriage Registration",
            LCR_MARRIAGE: "Marriage Certificate",
        };

        const unviewedLcrCounts: Record<string, number> = {};
        if (lcrTransactions) {
            for (const tx of lcrTransactions) {
                const code = tx.type?.code || "";
                const category = codeToCategory[code];
                if (category) {
                    unviewedLcrCounts[category] = (unviewedLcrCounts[category] || 0) + 1;
                }
            }
        }

        let pendingAnnouncementsCount = 0;
        try {
            const rawPending: any[] = await (prisma as any).$queryRawUnsafe(
                `SELECT COUNT(*)::int as count FROM "Announcement" WHERE "approvalStatus" = 'PENDING_APPROVAL'`
            );
            pendingAnnouncementsCount = Number(rawPending?.[0]?.count || 0);
        } catch {
            pendingAnnouncementsCount = 0;
        }

        let rhuEquipmentNotificationCount = 0;
        try {
            const rhuRes = await getRHUEquipmentNotificationCount();
            if (rhuRes?.success) {
                rhuEquipmentNotificationCount = rhuRes.count;
            }
        } catch {
            rhuEquipmentNotificationCount = 0;
        }

        const responseData = {
            pendingReportsCount,
            pendingResidentsCount,
            pendingTransactionsCount,
            pendingAnnouncementsCount,
            unviewedLcrCounts,
            rhuEquipmentNotificationCount
        };

        cacheStore[cacheKey] = {
            data: responseData,
            timestamp: now
        };

        return NextResponse.json(responseData);
    } catch (err: any) {
        console.error("Failed to load admin counts API:", err);
        return NextResponse.json({ error: err?.message || "Failed to load counts" }, { status: 500 });
    }
}
