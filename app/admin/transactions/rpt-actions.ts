"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

export interface GetAssessorTransactionsParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string | null;
}

export async function getAssessorTransactions(params?: GetAssessorTransactionsParams) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized", data: [], totalCount: 0, stats: { total: 0, pending: 0, approved: 0 } };
        }

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const category = params?.category || null;

        const skip = (page - 1) * limit;

        const where: any = {
            isCancelled: false,
            type: {
                category: "RPT"
            }
        };

        if (category && category !== "ALL") {
            where.OR = [
                { type: { code: category } },
                {
                    additionalData: {
                        path: ["categoryCode"],
                        equals: category
                    }
                }
            ];
        }

        if (search) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { queueNumber: { contains: search, mode: "insensitive" } },
                        {
                            user: {
                                name: { contains: search, mode: "insensitive" }
                            }
                        },
                        {
                            additionalData: {
                                path: ["ownerName"],
                                string_contains: search
                            }
                        },
                        {
                            additionalData: {
                                path: ["tdn"],
                                string_contains: search
                            }
                        },
                        {
                            additionalData: {
                                path: ["barangay"],
                                string_contains: search
                            }
                        }
                    ]
                }
            ];
        }

        // Fetch paginated transactions with explicit SELECT (no SELECT * over-fetching)
        const [transactions, totalCount, allRptTransactionsForStats] = await Promise.all([
            prisma.transaction.findMany({
                where,
                select: {
                    id: true,
                    queueNumber: true,
                    status: true,
                    appointmentDate: true,
                    appointmentSlot: true,
                    totalAmount: true,
                    createdAt: true,
                    additionalData: true,
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    type: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.transaction.count({ where }),
            // Light aggregation for total stats across all RPT (only status and assessorStatus)
            prisma.transaction.findMany({
                where: {
                    isCancelled: false,
                    type: { category: "RPT" }
                },
                select: {
                    status: true,
                    additionalData: true
                }
            })
        ]);

        let pendingCount = 0;
        let approvedCount = 0;

        for (const t of allRptTransactionsForStats) {
            const addData = (t.additionalData as any) || {};
            const assessorStatus = addData.assessorStatus || (addData.categoryCode === "RPT_CAT1" ? "NOT_REQUIRED" : "PENDING");
            if (assessorStatus === "APPROVED" || t.status === "FOR_REQUESTING" || t.status === "PAID") {
                approvedCount++;
            } else if (assessorStatus === "PENDING" || t.status === "FOR_INSPECTION") {
                pendingCount++;
            }
        }

        const combined = transactions.map(t => {
            const addData = (t.additionalData as any) || {};
            return {
                id: t.id,
                queueNumber: t.queueNumber,
                status: t.status,
                appointmentDate: t.appointmentDate,
                appointmentSlot: t.appointmentSlot,
                totalAmount: t.totalAmount,
                createdAt: t.createdAt,
                user: t.user,
                type: t.type,
                realPropertyTax: {
                    rptCategory: addData.categoryCode || t.type?.code,
                    tdn: addData.tdn,
                    pin: addData.pin,
                    ownerName: addData.ownerName,
                    propertyAddress: addData.propertyAddress,
                    barangay: addData.barangay,
                    propertyType: addData.propertyType,
                    assessedValue: addData.assessedValue,
                    basicTax: addData.basicTax,
                    sefTax: addData.sefTax,
                    totalTaxDue: addData.totalTaxDue,
                    assessorStatus: addData.assessorStatus || (addData.categoryCode === "RPT_CAT1" ? "NOT_REQUIRED" : "PENDING"),
                    treasuryStatus: addData.treasuryStatus || "PENDING"
                }
            };
        });

        return {
            success: true,
            data: JSON.parse(JSON.stringify(combined)),
            totalCount,
            stats: {
                total: allRptTransactionsForStats.length,
                pending: pendingCount,
                approved: approvedCount
            }
        };
    } catch (err: any) {
        console.error("Error fetching Assessor RPT transactions:", err);
        return {
            success: false,
            error: err?.message || "Failed to fetch transactions",
            data: [],
            totalCount: 0,
            stats: { total: 0, pending: 0, approved: 0 }
        };
    }
}

export async function getAssessorTransactionById(id: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: {
                user: { 
                    select: { 
                        name: true, 
                        email: true,
                        residentProfile: true
                    } 
                },
                type: true
            }
        });

        if (!tx) {
            return { success: false, error: "Transaction not found" };
        }

        const addData = (tx.additionalData as any) || {};
        const combined = {
            ...tx,
            realPropertyTax: {
                rptCategory: addData.categoryCode || tx.type?.code,
                tdn: addData.tdn,
                pin: addData.pin,
                ownerName: addData.ownerName,
                propertyAddress: addData.propertyAddress,
                barangay: addData.barangay,
                propertyType: addData.propertyType,
                assessedValue: addData.assessedValue,
                basicTax: addData.basicTax,
                sefTax: addData.sefTax,
                totalTaxDue: addData.totalTaxDue,
                validIdUrl: addData.validIdUrl,
                previousOrUrl: addData.previousOrUrl,
                buildingPermitUrl: addData.buildingPermitUrl,
                deedOfSaleUrl: addData.deedOfSaleUrl,
                titleUrl: addData.titleUrl,
                birEcarUrl: addData.birEcarUrl,
                assessorStatus: addData.assessorStatus || "PENDING",
                treasuryStatus: addData.treasuryStatus || "PENDING"
            }
        };

        return { success: true, data: JSON.parse(JSON.stringify(combined)) };
    } catch (err: any) {
        console.error("Error fetching Assessor transaction by ID:", err);
        return { success: false, error: err?.message || "Failed to fetch transaction" };
    }
}

export async function evaluateAssessorTransaction(
    id: string,
    action: "APPROVE" | "REJECT" | "SCHEDULE_INSPECTION",
    remarks?: string,
    inspectionDetails?: { date: string; time: string }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true }
        });

        if (!tx) {
            return { success: false, error: "Transaction not found" };
        }

        const currentAddData = (tx.additionalData as any) || {};
        let nextStatus = tx.status;
        let assessorStatus = currentAddData.assessorStatus || "PENDING";
        const extraAddData: any = {};

        if (action === "APPROVE") {
            nextStatus = "UNPAID";
            assessorStatus = "APPROVED";
            extraAddData.checkedIn = false;
            extraAddData.checkedInAt = null;
            extraAddData.counterName = null;
            extraAddData.servingDepartment = null;
        } else if (action === "REJECT") {
            nextStatus = "REJECTED";
            assessorStatus = "REJECTED";
        } else if (action === "SCHEDULE_INSPECTION") {
            nextStatus = "FOR_INSPECTION";
            assessorStatus = "FOR_INSPECTION";
            if (inspectionDetails) {
                extraAddData.inspectionDate = inspectionDetails.date;
                extraAddData.inspectionTime = inspectionDetails.time;
            }
        }

        await prisma.transaction.update({
            where: { id },
            data: {
                status: nextStatus,
                rejectionRemarks: action === "REJECT" ? (remarks || "Application rejected by Municipal Assessor") : tx.rejectionRemarks,
                processedBy: session.user.name || session.user.email || "Assessor Staff",
                additionalData: {
                    ...currentAddData,
                    ...extraAddData,
                    assessorStatus
                }
            }
        });

        if ((prisma as any).realPropertyTax) {
            await (prisma as any).realPropertyTax.updateMany({
                where: { transactionId: id },
                data: { assessorStatus }
            });
        }

        revalidatePath("/admin/assessor");
        revalidatePath(`/admin/assessor/${id}`);
        revalidatePath("/admin/treasury");

        // Log administrative evaluation event
        await logActivity({
            action: action === "APPROVE" ? "APPROVE" : action === "REJECT" ? "REJECT" : "EVALUATION",
            entityType: "RealPropertyTax",
            entityId: id,
            entityName: `TDN: ${currentAddData.tdn || "N/A"} (${currentAddData.ownerName || "Declarant"})`,
            description: `Assessor ${action === "APPROVE" ? "approved" : action === "REJECT" ? "rejected" : "scheduled inspection for"} tax declaration assessment. ${remarks ? `Remarks: ${remarks}` : ""}`.trim(),
            metadata: {
                previousStatus: tx.status,
                newStatus: nextStatus,
                assessorStatus,
                remarks
            }
        });

        return { success: true };
    } catch (err: any) {
        console.error("Error evaluating Assessor transaction:", err);
        return { success: false, error: err?.message || "Failed to evaluate transaction" };
    }
}

export async function releaseRptTransaction(
    id: string,
    orSeriesNumber?: string,
    orUrl?: string
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true }
        });

        if (!tx) {
            return { success: false, error: "Transaction not found" };
        }

        const currentAddData = (tx.additionalData as any) || {};

        await prisma.transaction.update({
            where: { id },
            data: {
                status: "RELEASED",
                isPaid: true,
                processedBy: session.user.name || session.user.email || "Treasury Staff",
                additionalData: {
                    ...currentAddData,
                    orSeriesNumber: orSeriesNumber || currentAddData.orSeriesNumber,
                    orUrl: orUrl || currentAddData.orUrl,
                    treasuryStatus: "COMPLETED",
                    releasedAt: new Date().toISOString()
                }
            }
        });

        // Log Treasury release event
        await logActivity({
            action: "RELEASE",
            entityType: "RealPropertyTax",
            entityId: id,
            entityName: `TDN: ${currentAddData.tdn || "N/A"} (OR: ${orSeriesNumber || "Official"})`,
            description: `Treasury released official tax receipt for ${currentAddData.ownerName || "Citizen"}`,
            metadata: {
                orSeriesNumber,
                orUrl,
                totalAmount: tx.totalAmount
            }
        });

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/treasury/queue");
        revalidatePath(`/admin/treasury/${id}`);
        revalidatePath("/admin/assessor");

        return { success: true, data: { status: "RELEASED" } };
    } catch (err: any) {
        console.error("Error releasing RPT transaction:", err);
        return { success: false, error: err?.message || "Failed to release RPT transaction" };
    }
}
