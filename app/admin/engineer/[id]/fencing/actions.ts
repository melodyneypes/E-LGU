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

/**
 * Endorse Fencing Permit by Municipal Engineer
 * Sets transaction status to EVALUATED and prepares it for MPDC Zoning locational clearance review.
 */
export async function endorseFencingPermitByEngineer(id: string, notes?: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Municipal Engineers or Admins can endorse fencing permits to Zoning." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};
        const feeAssessment = currentAdditionalData.feeAssessment || {};

        const updatedAdditionalData = {
            ...currentAdditionalData,
            engineerEndorsementNotes: notes ? sanitizeString(notes) : null,
            engineerEndorsedAt: new Date().toISOString(),
            engineerEndorsedBy: user.name || user.id,
            zoningStatus: "FOR_INSPECTION",
            feeAssessment: {
                ...feeAssessment,
                engineerEndorsedToZoning: true,
                engineerEndorsedToZoningAt: new Date().toISOString(),
                engineerEndorsedToZoningBy: user.name || user.id
            }
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: "FOR_INSPECTION",
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
                remarks: `Your Fencing Permit application has been approved by the Municipal Engineering Office and forwarded to MPDC Zoning for site inspection and locational clearance verification.`,
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Engineer fencing endorsement email error:", e));
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/zoning");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Endorse fencing permit by engineer error:", error);
        return { success: false, error: error?.message || "Failed to endorse fencing permit" };
    }
}

/**
 * Schedule on-site fencing inspection by Municipal Engineer
 */
export async function scheduleEngineerFencingInspection(
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
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Municipal Engineers can schedule inspection." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};

        const updatedAdditionalData = {
            ...currentAdditionalData,
            inspectionSchedule: {
                date: payload.date,
                time: payload.time,
                inspectorName: payload.inspectorName,
                notes: payload.notes || "",
                scheduledAt: new Date().toISOString(),
                scheduledBy: user.name || user.id
            }
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: "FOR_INSPECTION",
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
                remarks: `An on-site fencing inspection has been scheduled for ${payload.date} at ${payload.time}. Assigned Inspector: ${payload.inspectorName}. ${payload.notes ? `Notes: ${payload.notes}` : ""}`,
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Engineer schedule inspection email error:", e));
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Schedule fencing inspection error:", error);
        return { success: false, error: error?.message || "Failed to schedule inspection" };
    }
}

/**
 * Send Fencing Permit for Revision by Municipal Engineer
 * Includes 3rd-revision protection and specific revision requests
 */
export async function sendEngineerFencingRevision(
    id: string,
    remarks: string,
    revisionRequests: { type: "REQUIREMENTS" | "PERMITS"; name: string; key?: string }[] = []
) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Municipal Engineers can request revisions." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        if ((tx.revisionCount || 0) >= 3) {
            return {
                success: false,
                error: "Maximum revision limit reached (3 revisions). This application can no longer be sent for revision."
            };
        }

        const nextRevisionCount = (tx.revisionCount || 0) + 1;
        const currentAdditionalData = (tx.additionalData as any) || {};
        const revHistory = Array.isArray(currentAdditionalData.revisionHistory)
            ? currentAdditionalData.revisionHistory
            : [];

        const normalizedRevisionRequests = revisionRequests
            .map((item) => ({
                type: item?.type === "PERMITS" ? ("PERMITS" as const) : ("REQUIREMENTS" as const),
                name: sanitizeString(item?.name || ""),
                key: item?.key ? sanitizeString(item.key) : undefined
            }))
            .filter((item) => item.name.length > 0);

        const updatedAdditionalData = {
            ...currentAdditionalData,
            revisionRequests: normalizedRevisionRequests,
            revisionHistory: [
                ...revHistory,
                {
                    id: `${Date.now()}`,
                    attempt: nextRevisionCount,
                    remarks: sanitizeString(remarks),
                    revisionRequests: normalizedRevisionRequests,
                    requestedBy: user.name || user.id,
                    requestedAt: new Date().toISOString()
                }
            ]
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: "FOR_REVISION",
                rejectionRemarks: sanitizeString(remarks),
                processedBy: user.id,
                revisionCount: nextRevisionCount,
                additionalData: updatedAdditionalData as any,
                updatedAt: new Date()
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            sendEmail({
                type: "FOR_REVISION" as any,
                to: tx.user.email,
                name: resident?.firstName || tx.user.name || "Resident",
                remarks: sanitizeString(remarks),
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Engineer fencing revision email error:", e));
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Send engineer fencing revision error:", error);
        return { success: false, error: error?.message || "Failed to request revision" };
    }
}

/**
 * Reject Fencing Permit by Municipal Engineer
 */
export async function rejectEngineerFencingPermit(id: string, reason: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Municipal Engineers can reject applications." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });
        if (!tx) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};

        const updatedAdditionalData = {
            ...currentAdditionalData,
            engineerRejectionReason: sanitizeString(reason),
            engineerRejectedAt: new Date().toISOString(),
            engineerRejectedBy: user.name || user.id
        };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectionRemarks: sanitizeString(reason),
                processedBy: user.id,
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
                remarks: `Your Fencing Permit application has been rejected by the Municipal Engineering Office. Reason: "${reason}"`,
                transactionId: tx.id.slice(-8).toUpperCase(),
                serviceName: tx.type?.name || "Fencing Permit"
            }).catch(e => console.error("Engineer fencing rejection email error:", e));
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Reject engineer fencing permit error:", error);
        return { success: false, error: error?.message || "Failed to reject fencing permit" };
    }
}
