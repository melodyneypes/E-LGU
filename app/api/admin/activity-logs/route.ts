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

        const { searchParams } = new URL(req.url);
        const selectedBarangay = searchParams.get("barangay") || "";

        const [recentResidents, recentReports, recentPayments, recentTransactions] = await Promise.all([
            prisma.resident.findMany({
                where: {
                    registrationStatus: "APPROVED",
                    ...(selectedBarangay ? { barangay: selectedBarangay } : {})
                },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    createdAt: true
                }
            }),
            prisma.report.findMany({
                where: selectedBarangay ? { barangay: { name: selectedBarangay } } : {},
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    category: true,
                    createdAt: true,
                    user: { select: { name: true } }
                }
            }),
            prisma.payment.findMany({
                where: {
                    status: "PAID",
                    ...(selectedBarangay ? {
                        transaction: {
                            user: {
                                residentProfile: {
                                    barangay: selectedBarangay
                                }
                            }
                        }
                    } : {})
                },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    amount: true,
                    method: true,
                    createdAt: true,
                    transaction: {
                        select: {
                            user: { select: { name: true } },
                            residentSnapshot: true,
                            additionalData: true,
                        }
                    }
                }
            }),
            prisma.transaction.findMany({
                where: selectedBarangay ? {
                    user: {
                        residentProfile: {
                            barangay: selectedBarangay
                        }
                    }
                } : {},
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    createdAt: true,
                    residentSnapshot: true,
                    additionalData: true,
                    type: { select: { name: true } },
                    user: { select: { name: true } }
                }
            })
        ]);

        const activityLogs = [
            ...recentResidents.map((r) => ({
                id: r.id,
                type: "resident" as const,
                user: `${r.firstName} ${r.lastName}`,
                action: "registered as a new",
                details: "Resident Profile",
                time: formatTimeAgo(new Date(r.createdAt)),
                createdAt: r.createdAt
            })),
            ...recentReports.map((rp) => ({
                id: rp.id,
                type: "report" as const,
                user: rp.user?.name || "A Resident",
                action: "filed a public report on",
                details: rp.category,
                time: formatTimeAgo(new Date(rp.createdAt)),
                createdAt: rp.createdAt
            })),
            ...recentPayments.map((p) => {
                const tx = p.transaction;
                let resSnap: any = {};
                let addData: any = {};
                try {
                    resSnap = typeof tx?.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx?.residentSnapshot || {};
                } catch { resSnap = {}; }
                try {
                    addData = typeof tx?.additionalData === "string" ? JSON.parse(tx.additionalData) : tx?.additionalData || {};
                } catch { addData = {}; }

                const name = tx?.user?.name || resSnap.fullName || resSnap.name || addData.violatorName || addData.fullName || addData.name || "A Resident";
                return {
                    id: p.id,
                    type: "payment" as const,
                    user: name,
                    action: `paid ₱${p.amount.toLocaleString()} via`,
                    details: p.method,
                    time: formatTimeAgo(new Date(p.createdAt)),
                    createdAt: p.createdAt
                };
            }),
            ...recentTransactions.map((t) => {
                let resSnap: any = {};
                let addData: any = {};
                try {
                    resSnap = typeof t?.residentSnapshot === "string" ? JSON.parse(t.residentSnapshot) : t?.residentSnapshot || {};
                } catch { resSnap = {}; }
                try {
                    addData = typeof t?.additionalData === "string" ? JSON.parse(t.additionalData) : t?.additionalData || {};
                } catch { addData = {}; }

                const name = t.user?.name || resSnap.fullName || resSnap.name || addData.violatorName || addData.fullName || addData.name || "A Resident";
                return {
                    id: t.id,
                    type: "transaction" as const,
                    user: name,
                    action: "requested service for",
                    details: t.type?.name || "Certificate",
                    time: formatTimeAgo(new Date(t.createdAt)),
                    createdAt: t.createdAt
                };
            })
        ]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 7);

        return NextResponse.json({ success: true, logs: activityLogs });
    } catch (err: any) {
        console.error("Error fetching activity logs:", err);
        return NextResponse.json({ error: err.message || "Failed to fetch logs" }, { status: 500 });
    }
}
