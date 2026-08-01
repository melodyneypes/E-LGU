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

function parseDateMs(input: unknown): number {
    if (!input) return 0;
    const rawStr = String(input).trim();
    const dateObj = new Date(rawStr);
    if (isNaN(dateObj.getTime())) return 0;
    let ms = dateObj.getTime();
    const nowMs = Date.now();
    if (ms > nowMs + 60000) {
        ms -= 8 * 60 * 60 * 1000;
    }
    return ms;
}

/**
 * Detects whether a given string looks like a CUID user ID
 * (as opposed to a human-readable name or department string).
 */
function looksLikeCuid(value: string): boolean {
    return value.length > 20 || /^c[a-z0-9]{20,}$/i.test(value);
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch citation tickets + processed transactions in parallel
        const [recentTickets, processedTransactions] = await Promise.all([
            // POSO Enforcer Citation Tickets
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
            // Staff Processed Transactions (Treasury, BPLO, Registrar, etc.)
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
                    // NOTE: tx.user is the REQUESTER (citizen), not the staff processor
                    user: { select: { name: true } },
                },
            }),
        ]);

        // 2. Batch-resolve processedBy values that are CUIDs into actual staff names
        //    Some legacy records store plain name strings (e.g. "Treasury Staff") — keep those as-is.
        const cuidIds = [
            ...new Set(
                processedTransactions
                    .map((tx) => tx.processedBy)
                    .filter((v): v is string => !!v && looksLikeCuid(v))
            ),
        ];

        // Single bulk query for all staff users referenced as processedBy
        const staffUserRecords = cuidIds.length > 0
            ? await prisma.user.findMany({
                where: { id: { in: cuidIds } },
                select: { id: true, name: true, department: true },
            })
            : [];

        // O(1) lookup: userId → { name, department }
        const staffByIdMap = new Map<string, { name: string; department?: string | null }>(
            staffUserRecords.map((u) => [u.id, { name: u.name ?? "Municipal Staff", department: u.department }])
        );

        // 3. Build the staff logs array
        const staffLogs = [
            // --- POSO Citation Tickets ---
            ...recentTickets.map((t) => {
                // officerName may sometimes be a CUID — fall back gracefully
                const officerName = (
                    t.officerName &&
                    !looksLikeCuid(t.officerName)
                ) ? t.officerName : "POSO Officer";

                return {
                    id: `ticket-${t.id}`,
                    userName: officerName,
                    userRole: "POSO_OFFICER",
                    department: "POSO",
                    action: "issued citation ticket",
                    module: "POSO Citation",
                    details: `POSO Traffic Violation Citation for ${(t.violatorName || "Violator").split(" ")[0]}`,
                    time: formatTimeAgo(t.createdAt),
                    createdAt: t.createdAt.toISOString(),
                };
            }),

            // --- Staff Processed Transactions ---
            ...processedTransactions.map((tx) => {
                const addData = typeof tx.additionalData === "string"
                    ? JSON.parse(tx.additionalData || "{}")
                    : tx.additionalData || {};

                // Resolve actual staff name:
                // Priority 1 — DB lookup by CUID
                // Priority 2 — processedBy is already a readable name string
                // Priority 3 — additionalData fallbacks
                let staffName = "Municipal Staff";
                let staffDepartment: string | null | undefined = null;

                const processedById = tx.processedBy ?? "";

                if (processedById && staffByIdMap.has(processedById)) {
                    // ✅ CUID resolved to real user record
                    const resolved = staffByIdMap.get(processedById)!;
                    staffName = resolved.name;
                    staffDepartment = resolved.department;
                } else if (processedById && !looksLikeCuid(processedById)) {
                    // Already a plain human-readable string (e.g. "Treasury Staff")
                    staffName = processedById;
                } else {
                    // Fallback to additionalData name fields
                    staffName = addData.processedByStaff || addData.officerName || "Municipal Staff";
                }

                // Resolve department (DB-resolved dept takes highest priority)
                const dept = (
                    staffDepartment ||
                    addData.servingDepartment ||
                    tx.type?.category ||
                    "LGU Staff"
                );

                const st = String(tx.status);
                const isApprovedOrPaid = ["APPROVED", "RELEASED", "PAID", "DELIVERED"].includes(st);
                const isRejected = st === "REJECTED";

                // Requester name — tx.user is the citizen, not the processor
                // Show first name only to keep audit trail concise
                const requesterName = (tx.user?.name || addData.violatorName || "Resident").split(" ")[0];

                return {
                    id: `tx-${tx.id}`,
                    userName: staffName,
                    userRole: "STAFF",
                    department: String(dept).toUpperCase(),
                    action: isApprovedOrPaid
                        ? "processed payment / approved"
                        : isRejected
                        ? "rejected request for"
                        : "updated status for",
                    module: tx.type?.name || "Service Request",
                    details: `${tx.type?.name || "Document"} for ${requesterName}`,
                    time: formatTimeAgo(tx.updatedAt),
                    createdAt: tx.updatedAt.toISOString(),
                };
            }),
        ]
            .sort((a, b) => parseDateMs(b.createdAt) - parseDateMs(a.createdAt))
            .slice(0, 7);

        return NextResponse.json({ success: true, logs: staffLogs });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch logs";
        console.error("Error fetching staff activity logs:", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
