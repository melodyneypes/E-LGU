"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { sanitizeString } from "@/lib/validation";

async function getSession() {
    return await getServerSession(authOptions);
}

export interface ZoningFeeItem {
    name: string;
    amount: number;
}

/**
 * Endorse Fencing Permit by MPDC Zoning with assessed fees
 * Approves Locational Clearance for Fencing and advances status
 */
export async function endorseFencingPermitByZoning(id: string, notes?: string, fees?: ZoningFeeItem[], clearanceUrl?: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "MPDC_ZONING" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only MPDC Zoning officers can endorse fencing clearances." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};
        const feeAssessment = currentAdditionalData.feeAssessment || {};

        const validFees = (fees || []).filter(f => f.name.trim() !== "" && Number(f.amount) > 0);
        const totalZoningFee = validFees.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

        const updatedAdditionalData = {
            ...currentAdditionalData,
            zoningStatus: "ENDORSED",
            zoningClearanceUrl: clearanceUrl || currentAdditionalData.zoningClearanceUrl || null,
            zoningEndorsementNotes: notes ? sanitizeString(notes) : null,
            zoningEndorsedAt: new Date().toISOString(),
            zoningEndorsedBy: user.name || user.id,
            feeAssessment: {
                ...feeAssessment,
                zoningFees: validFees,
                totalZoningFee,
                zoningApproved: true,
                zoningApprovedAt: new Date().toISOString(),
                zoningApprovedBy: user.name || user.id
            }
        };

        const lineItems = validFees.map(f => ({
            label: f.name,
            amount: Number(f.amount) || 0
        }));

        const existingFiscal = typeof tx.fiscalSnapshot === "object" && tx.fiscalSnapshot !== null ? tx.fiscalSnapshot : {};
        const fiscalSnapshot = {
            ...existingFiscal,
            totalAmount: totalZoningFee,
            basicTax: 0,
            additionalTax: 0,
            penaltyCharge: 0,
            lineItems: lineItems,
            assessedBy: user.name || user.id,
            assessedAt: new Date().toISOString(),
            department: "MPDC_ZONING"
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: totalZoningFee > 0 ? "UNPAID" : "FOR_INSPECTION",
                totalAmount: totalZoningFee > 0 ? totalZoningFee : tx.totalAmount,
                fiscalSnapshot: fiscalSnapshot as any,
                additionalData: updatedAdditionalData as any,
                updatedAt: new Date()
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            sendEmail({
                type: "GENERAL" as any,
                to: tx.user.email,
                name: resident?.firstName || tx.user.name || "Resident",
                remarks: `Your Fencing Permit application has been verified and cleared for Locational Clearance by the MPDC Zoning Department.`,
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Fencing endorsement email error:", e));
        }

        revalidatePath("/admin/zoning");
        revalidatePath("/admin/engineer");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Endorse fencing permit error:", error);
        return { success: false, error: error?.message || "Failed to endorse fencing permit" };
    }
}

/**
 * Schedule site inspection by MPDC Zoning
 */
export async function scheduleZoningFencingInspection(
    id: string,
    payload: {
        date: string;
        time: string;
        inspectorName: string;
        notes?: string;
    }
) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "MPDC_ZONING" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only MPDC Zoning officers can schedule inspection." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const targetDateStr = payload?.date;
        if (targetDateStr) {
            const todayStr = new Date().toISOString().split("T")[0];
            if (targetDateStr < todayStr) {
                return { success: false, error: "Cannot schedule an inspection for a past date." };
            }
        }

        const currentAdditionalData = (tx.additionalData as any) || {};

        const updatedAdditionalData = {
            ...currentAdditionalData,
            zoningInspectionSchedule: {
                type: "Zoning & Boundary Ocular Inspection",
                date: payload.date,
                time: payload.time,
                inspectorName: sanitizeString(payload.inspectorName),
                notes: payload.notes ? sanitizeString(payload.notes) : "",
                scheduledAt: new Date().toISOString(),
                scheduledBy: user.name || user.id
            },
            zoningStatus: "FOR_INSPECTION"
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData as any,
                updatedAt: new Date()
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            sendEmail({
                type: "FOR_INSPECTION",
                to: tx.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName || ''}` : tx.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit",
                remarks: `A Zoning site inspection for your Fencing Permit has been scheduled for ${payload.date} at ${payload.time}. Inspector: ${payload.inspectorName}. ${payload.notes ? `Notes: ${payload.notes}` : ''}`,
                department: "ZONING"
            }).catch(e => console.error("Zoning fencing schedule email error:", e));
        }

        revalidatePath("/admin/zoning");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Schedule zoning inspection error:", error);
        return { success: false, error: error?.message || "Failed to schedule zoning inspection" };
    }
}

/**
 * Send Fencing Permit for Revision by MPDC Zoning
 */
export async function sendZoningFencingRevision(
    id: string,
    remarks: string,
    revisionRequests: { type: "REQUIREMENTS" | "PERMITS"; name: string; key?: string }[] = []
) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "MPDC_ZONING" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only MPDC Zoning officers can request revisions." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};
        const count = (currentAdditionalData.zoningRevisionCount || 0) + 1;
        const history = Array.isArray(currentAdditionalData.zoningRevisionHistory) ? currentAdditionalData.zoningRevisionHistory : [];

        const normalizedRevisionRequests = revisionRequests
            .map((item) => ({
                type: item?.type === "PERMITS" ? ("PERMITS" as const) : ("REQUIREMENTS" as const),
                name: sanitizeString(item?.name || ""),
                key: item?.key ? sanitizeString(item.key) : undefined
            }))
            .filter((item) => item.name.length > 0);

        const updatedHistory = [
            ...history,
            {
                id: `${Date.now()}`,
                attempt: count,
                remarks: sanitizeString(remarks),
                revisionRequests: normalizedRevisionRequests,
                requestedAt: new Date().toISOString(),
                requestedBy: user.name || user.id
            }
        ];

        const updatedAdditionalData = {
            ...currentAdditionalData,
            zoningRevisionCount: count,
            zoningRejectionRemarks: sanitizeString(remarks),
            zoningRevisionRequests: normalizedRevisionRequests,
            zoningRevisionHistory: updatedHistory,
            zoningStatus: "FOR_REVISION"
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData as any,
                updatedAt: new Date()
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            sendEmail({
                type: "FOR_REVISION",
                to: tx.user.email,
                name: resident?.firstName || tx.user.name || "Resident",
                remarks: sanitizeString(remarks),
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Zoning fencing revision email error:", e));
        }

        revalidatePath("/admin/zoning");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Send zoning fencing revision error:", error);
        return { success: false, error: error?.message || "Failed to request zoning revision" };
    }
}

/**
 * Reject Fencing Permit by MPDC Zoning
 */
export async function rejectZoningFencingPermit(id: string, reason: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "MPDC_ZONING" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only MPDC Zoning officers can reject applications." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};

        const updatedAdditionalData = {
            ...currentAdditionalData,
            zoningStatus: "REJECTED",
            zoningRejectionRemarks: sanitizeString(reason),
            zoningRejectedAt: new Date().toISOString(),
            zoningRejectedBy: user.name || user.id
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData as any,
                updatedAt: new Date()
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            sendEmail({
                type: "REJECTED",
                to: tx.user.email,
                name: resident?.firstName || tx.user.name || "Resident",
                remarks: sanitizeString(reason),
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Zoning fencing rejection email error:", e));
        }

        revalidatePath("/admin/zoning");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Reject zoning fencing permit error:", error);
        return { success: false, error: error?.message || "Failed to reject zoning fencing permit" };
    }
}
