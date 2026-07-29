import { NextRequest, NextResponse } from "next/server";
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

    // Adjust 8-hour offset if database timestamp evaluates to future
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

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Query existing tables for staff & enforcer operational records
        const [recentTickets, processedTransactions] = await Promise.all([
            // 1. POSO Enforcer Citation Tickets
            prisma.ticketHeader.findMany({
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    ticketNo: true,
                    officerName: true,
                    badgeNo: true,
                    violatorName: true,
                    totalAmount: true,
                    status: true,
                    createdAt: true,
                },
            }),
            // 2. Staff Processed Transactions (Treasury, Registrar, BPLO, etc.)
            prisma.transaction.findMany({
                where: {
                    processedBy: { not: null },
                },
                orderBy: { updatedAt: "desc" },
                take: 10,
                select: {
                    id: true,
                    status: true,
                    processedBy: true,
                    additionalData: true,
                    updatedAt: true,
                    type: { select: { name: true, category: true } },
                    user: { select: { name: true, department: true } },
                },
            }),
        ]);

        const staffLogs = [
            ...recentTickets.map((t) => ({
                id: `ticket-${t.id}`,
                userName: t.officerName || "POSO Enforcer",
                userRole: "POSO_OFFICER",
                department: "POSO",
                action: "issued citation ticket",
                module: "POSO Citation",
                details: `#${t.ticketNo} to ${t.violatorName} (₱${t.totalAmount.toLocaleString()})`,
                time: formatTimeAgo(new Date(t.createdAt)),
                createdAt: t.createdAt.toISOString(),
            })),
            ...processedTransactions.map((tx) => {
                const addData = (tx.additionalData as any) || {};
                // Priority for Department: User department > additionalData.servingDepartment > processedBy string matching
                let dept = tx.user?.department;
                if (!dept && addData.servingDepartment) {
                    dept = addData.servingDepartment;
                }
                if (!dept && tx.processedBy) {
                    const pLower = tx.processedBy.toLowerCase();
                    if (pLower.includes("treasury")) dept = "Treasury";
                    else if (pLower.includes("bplo") || pLower.includes("business")) dept = "BPLO";
                    else if (pLower.includes("registrar") || pLower.includes("civil")) dept = "Civil Registry";
                    else if (pLower.includes("poso")) dept = "POSO";
                    else if (pLower.includes("engineer")) dept = "Engineering";
                }
                if (!dept) {
                    dept = tx.type?.category || "LGU Staff";
                }

                return {
                    id: `tx-${tx.id}`,
                    userName: tx.processedBy || "Municipal Staff",
                    userRole: "STAFF",
                    department: String(dept).toUpperCase(),
                    action: tx.status === "APPROVED" || tx.status === "RELEASED" || tx.status === "PAID" ? "processed payment / approved" : tx.status === "REJECTED" ? "rejected request for" : "updated status for",
                    module: tx.type?.name || "Service Request",
                    details: `${tx.type?.name || "Document"} for ${tx.user?.name || addData.violatorName || "Resident"}`,
                    time: formatTimeAgo(new Date(tx.updatedAt)),
                    createdAt: tx.updatedAt.toISOString(),
                };
            }),
        ]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 7);

        return NextResponse.json({ success: true, logs: staffLogs });
    } catch (err: any) {
        console.error("Error fetching query-based staff activity logs:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch logs" }, { status: 500 });
    }
}
