"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

export interface ReportAccountableFormIncidentParams {
    transactionId?: string;
    formType: "OFFICIAL_RECEIPT" | "COMMUNITY_TAX_CERTIFICATE";
    incidentType: "PAPER_JAM" | "PRINTER_MISFEED" | "INK_SMUDGE" | "DAMAGED_LEAF" | "ENCODING_ERROR";
    damagedSeriesNumber: string;
    replacedSeriesNumber: string;
    reasonDetails?: string;
    counterName?: string;
}

/**
 * Enterprise server action to report and log a spoiled/jammed accountable form
 * strictly adhering to government municipal audit standards.
 */
export async function reportAccountableFormIncidentAction(params: ReportAccountableFormIncidentParams) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || (user.role !== "ADMIN" && user.role !== "TREASURY_STAFF")) {
            return { success: false, error: "Unauthorized: Only Treasury staff and Admins can log form incidents." };
        }

        const damagedSeriesNumber = sanitizeString(params.damagedSeriesNumber || "").trim();
        const replacedSeriesNumber = sanitizeString(params.replacedSeriesNumber || "").trim();
        const reasonDetails = sanitizeString(params.reasonDetails || "").trim();
        const counterName = sanitizeString(params.counterName || "").trim();
        const formType = params.formType;
        const incidentType = params.incidentType;
        const transactionId = params.transactionId ? sanitizeString(params.transactionId) : undefined;

        if (!damagedSeriesNumber) {
            return { success: false, error: "Damaged serial number is required." };
        }
        if (!replacedSeriesNumber) {
            return { success: false, error: "Replacement serial number is required." };
        }
        if (damagedSeriesNumber.toLowerCase() === replacedSeriesNumber.toLowerCase()) {
            return { success: false, error: "Replacement serial number must be different from damaged serial number." };
        }

        const staffName = user.name || user.email || "Treasury Staff";
        const formTypeName = formType === "OFFICIAL_RECEIPT" ? "Official Receipt (OR)" : "Cedula (CTC)";
        const incidentTypeName = incidentType.replace(/_/g, " ");

        const now = new Date();

        // 1. If linked to an active Transaction, update active serial & store incident history
        if (transactionId) {
            const txRecord = await prisma.transaction.findUnique({
                where: { id: transactionId },
                select: { id: true, additionalData: true, fiscalSnapshot: true }
            });

            if (txRecord) {
                const currentAdditional = typeof txRecord.additionalData === "string"
                    ? (() => { try { return JSON.parse(txRecord.additionalData); } catch { return {}; } })()
                    : (txRecord.additionalData || {});

                const existingIncidents = Array.isArray(currentAdditional.spoiledForms)
                    ? currentAdditional.spoiledForms
                    : [];

                const newIncidentEntry = {
                    formType,
                    incidentType,
                    damagedSeriesNumber,
                    replacedSeriesNumber,
                    reasonDetails: reasonDetails || incidentTypeName,
                    counterName: counterName || currentAdditional.counterName || null,
                    reportedBy: staffName,
                    reportedAt: now.toISOString()
                };

                const updatedAdditional = {
                    ...currentAdditional,
                    spoiledForms: [...existingIncidents, newIncidentEntry],
                    ...(formType === "OFFICIAL_RECEIPT" ? { orSeriesNumber: replacedSeriesNumber } : { ctcNumber: replacedSeriesNumber }),
                    lastModifiedByStaff: staffName,
                    lastModifiedAt: now.toISOString()
                };

                const currentFiscal = typeof txRecord.fiscalSnapshot === "string"
                    ? (() => { try { return JSON.parse(txRecord.fiscalSnapshot); } catch { return {}; } })()
                    : (txRecord.fiscalSnapshot || {});

                const updatedFiscal = {
                    ...currentFiscal,
                    ...(formType === "OFFICIAL_RECEIPT" ? { orNumber: replacedSeriesNumber } : {})
                };

                await prisma.transaction.update({
                    where: { id: transactionId },
                    data: {
                        additionalData: updatedAdditional as any,
                        fiscalSnapshot: updatedFiscal as any
                    }
                });
            }
        }

        // 2. Persist to universal immutable AuditLog table
        await logActivity({
            action: "ACCOUNTABLE_FORM_INCIDENT",
            entityType: "AccountableForm",
            entityId: transactionId || null,
            entityName: `${formTypeName}: ${damagedSeriesNumber} ➔ ${replacedSeriesNumber}`,
            description: `Staff ${staffName} reported ${incidentTypeName} for ${formTypeName} #${damagedSeriesNumber}. Replacement stub #${replacedSeriesNumber} issued.${reasonDetails ? ` Reason: ${reasonDetails}` : ""}`,
            metadata: {
                formType,
                incidentType,
                damagedSeriesNumber,
                replacedSeriesNumber,
                reasonDetails: reasonDetails || null,
                counterName: counterName || null,
                reportedBy: user.email,
                reportedRole: user.role,
                timestamp: now.toISOString()
            }
        });

        if (transactionId) {
            revalidatePath(`/admin/treasury/${transactionId}`);
        }
        revalidatePath("/admin/treasury/queue");
        revalidatePath("/admin/treasury");

        return {
            success: true,
            replacedSeriesNumber,
            message: `Accountable form incident logged successfully. Serial #${replacedSeriesNumber} is now active.`
        };
    } catch (error: any) {
        console.error("Error reporting accountable form incident:", error);
        return { success: false, error: error?.message || "Failed to log accountable form incident." };
    }
}
