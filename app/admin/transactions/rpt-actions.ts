"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

export async function evaluateAssessorTransaction(
    id: string,
    action: "APPROVE" | "REJECT" | "SCHEDULE_INSPECTION",
    remarks?: string
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

        if (action === "APPROVE") {
            // Once approved by Assessor, advance status to FOR_REQUESTING so Treasury can bill/issue OR
            await prisma.transaction.update({
                where: { id },
                data: {
                    status: "FOR_REQUESTING",
                    processedBy: session.user.name || session.user.email || "Assessor Staff"
                }
            });
            await (prisma as any).realPropertyTax.updateMany({
                where: { transactionId: id },
                data: { assessorStatus: "APPROVED" }
            });
        } else if (action === "REJECT") {
            await prisma.transaction.update({
                where: { id },
                data: {
                    status: "REJECTED",
                    rejectionRemarks: remarks || "Application rejected by Municipal Assessor",
                    processedBy: session.user.name || session.user.email || "Assessor Staff"
                }
            });
            await (prisma as any).realPropertyTax.updateMany({
                where: { transactionId: id },
                data: { assessorStatus: "REJECTED" }
            });
        } else if (action === "SCHEDULE_INSPECTION") {
            await prisma.transaction.update({
                where: { id },
                data: {
                    status: "FOR_INSPECTION",
                    processedBy: session.user.name || session.user.email || "Assessor Staff"
                }
            });
            await (prisma as any).realPropertyTax.updateMany({
                where: { transactionId: id },
                data: { assessorStatus: "FOR_INSPECTION" }
            });
        }

        revalidatePath("/admin/assessor");
        revalidatePath("/admin/treasury");

        return { success: true };
    } catch (err: any) {
        console.error("Error evaluating Assessor transaction:", err);
        return { success: false, error: err?.message || "Evaluation failed" };
    }
}
