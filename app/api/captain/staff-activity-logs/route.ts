import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function formatTimeAgo(input: Date | string) {
    if (!input) return "Just now";
    const dateObj = new Date(input);
    if (isNaN(dateObj.getTime())) return "Just now";

    let dateMs = dateObj.getTime();
    const nowMs = new Date().getTime();

    if (dateMs > nowMs + 60000) {
        dateMs -= 8 * 60 * 60 * 1000;
    }

    const seconds = Math.floor((nowMs - dateMs) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}

function looksLikeCuid(value: string): boolean {
    return value.length > 20 || /^c[a-z0-9]{20,}$/i.test(value);
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!session?.user || user?.role !== "BARANGAY_CAPTAIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const managedBarangay = user?.managedBarangay || "";
        if (!managedBarangay) {
            return NextResponse.json({ success: true, logs: [] });
        }

        // 1. Fetch Barangay-Scoped Operations in Parallel
        const brgyFilter = { equals: managedBarangay, mode: "insensitive" as const };

        const [
            reviewedResidents,
            barangayTransactions,
            barangayAnnouncements,
        ] = await Promise.all([
            // Stream A: Resident Registration Approvals / Walk-in Encodings
            prisma.resident.findMany({
                where: {
                    barangay: brgyFilter,
                    OR: [
                        { reviewedBy: { not: null } },
                        { receivedBy: { not: null } },
                    ],
                },
                orderBy: { createdAt: "desc" },
                take: 6,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    registrationStatus: true,
                    reviewedBy: true,
                    reviewedAt: true,
                    receivedBy: true,
                    officialPosition: true,
                    dateReceived: true,
                    createdAt: true,
                },
            }),

            // Stream B: Transactions processed for residents of this Barangay
            prisma.transaction.findMany({
                where: {
                    processedBy: { not: null },
                    type: { level: 0 },
                    user: {
                        residentProfile: { barangay: brgyFilter },
                    },
                },
                orderBy: { updatedAt: "desc" },
                take: 6,
                select: {
                    id: true,
                    status: true,
                    processedBy: true,
                    updatedAt: true,
                    type: { select: { name: true, category: true } },
                    user: { select: { name: true } },
                },
            }),

            // Stream C: Barangay Announcements posted for this Barangay
            prisma.announcement.findMany({
                where: {
                    barangay: brgyFilter,
                },
                orderBy: { createdAt: "desc" },
                take: 4,
                select: {
                    id: true,
                    title: true,
                    priority: true,
                    category: true,
                    createdAt: true,
                },
            }),
        ]);

        // 2. Batch-Resolve Staff User IDs into real names & roles
        const rawUserIds = [
            ...reviewedResidents.map((r) => r.reviewedBy).filter((v): v is string => !!v && looksLikeCuid(v)),
            ...reviewedResidents.map((r) => r.receivedBy).filter((v): v is string => !!v && looksLikeCuid(v)),
            ...barangayTransactions.map((t) => t.processedBy).filter((v): v is string => !!v && looksLikeCuid(v)),
        ];
        const uniqueUserIds = [...new Set(rawUserIds)];

        const staffUsers = uniqueUserIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: uniqueUserIds } },
                select: { id: true, name: true, role: true, department: true },
            })
            : [];

        const staffMap = new Map(
            staffUsers.map((u) => [
                u.id,
                {
                    name: u.name || "Barangay Official",
                    role: u.role === "BARANGAY_ADMIN" ? "Barangay Admin" : u.department || "Barangay Staff",
                },
            ])
        );

        // 3. Construct Unified Audit Logs
        const logs: any[] = [];

        // Add Resident Reviews / Walk-in Encodings
        reviewedResidents.forEach((res) => {
            const staffIdentifier = res.reviewedBy || res.receivedBy || "Barangay Admin";
            const staff = staffMap.has(staffIdentifier)
                ? staffMap.get(staffIdentifier)!
                : {
                    name: staffIdentifier,
                    role: res.officialPosition || (res.reviewedBy ? "Barangay Reviewer" : "Barangay Intake Officer"),
                };

            const isApproved = res.registrationStatus === "APPROVED";
            const date = res.reviewedAt || res.dateReceived || res.createdAt;
            const actionText = res.reviewedBy
                ? (isApproved ? "approved" : "reviewed")
                : "received & encoded";

            logs.push({
                id: `resident-review-${res.id}`,
                userName: staff.name,
                userRole: staff.role,
                department: `Brgy. ${managedBarangay}`,
                action: actionText,
                module: "Resident Verification",
                details: `${res.firstName} ${res.lastName}`,
                time: formatTimeAgo(date),
                createdAt: date.toISOString(),
            });
        });

        // Add Barangay Transactions
        barangayTransactions.forEach((tx) => {
            const staff = tx.processedBy && staffMap.has(tx.processedBy)
                ? staffMap.get(tx.processedBy)!
                : { name: tx.processedBy || "Municipal Staff", role: "Processing Staff" };

            const citizenName = tx.user?.name ? tx.user.name.split(" ")[0] : "Citizen";
            const docName = tx.type?.name || "Service Document";

            logs.push({
                id: `tx-${tx.id}`,
                userName: staff.name,
                userRole: staff.role,
                department: `Brgy. ${managedBarangay}`,
                action: `processed ${tx.status.toLowerCase()}`,
                module: "Citizen Requests",
                details: `${docName} for ${citizenName} marked as ${tx.status}`,
                time: formatTimeAgo(tx.updatedAt),
                createdAt: tx.updatedAt.toISOString(),
            });
        });

        // Add Barangay Announcements (Official Publications)
        barangayAnnouncements.forEach((ann) => {
            logs.push({
                id: `ann-${ann.id}`,
                userName: "Barangay Information",
                userRole: "Official Bulletin",
                department: `Brgy. ${managedBarangay}`,
                action: "published announcement",
                module: "Barangay Bulletin",
                details: `Posted: "${ann.title}" (${ann.priority} Priority)`,
                time: formatTimeAgo(ann.createdAt),
                createdAt: ann.createdAt.toISOString(),
            });
        });

        // 4. Sort all combined logs by createdAt descending
        logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({
            success: true,
            logs: logs.slice(0, 10),
        });
    } catch (error: any) {
        console.error("[CaptainStaffLogs] Fetch error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch staff audit logs." }, { status: 500 });
    }
}
