"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/audit";

export async function getAssessorTransactions() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized", data: [] };
        }

        const transactions = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                type: {
                    category: "RPT"
                }
            },
            include: {
                user: { select: { name: true, email: true } },
                type: true
            },
            orderBy: { createdAt: "desc" }
        });

        const combined = transactions.map(t => {
            const addData = (t.additionalData as any) || {};
            return {
                ...t,
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
                    validIdUrl: addData.validIdUrl,
                    previousOrUrl: addData.previousOrUrl,
                    buildingPermitUrl: addData.buildingPermitUrl,
                    deedOfSaleUrl: addData.deedOfSaleUrl,
                    titleUrl: addData.titleUrl,
                    birEcarUrl: addData.birEcarUrl,
                    assessorStatus: addData.assessorStatus || (addData.categoryCode === "RPT_CAT1" ? "NOT_REQUIRED" : "PENDING"),
                    treasuryStatus: addData.treasuryStatus || "PENDING"
                }
            };
        });

        return { success: true, data: JSON.parse(JSON.stringify(combined)) };
    } catch (err: any) {
        console.error("Error fetching Assessor RPT transactions:", err);
        return { success: false, error: err?.message || "Failed to fetch transactions", data: [] };
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
                user: { select: { name: true, email: true } },
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
