"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

export interface ReportAccountableFormIncidentParams {
    transactionId?: string;
    formType: string;
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

        // Persist strictly to universal immutable AuditLog table (ZERO mutations to Transaction table)
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

        return {
            success: true,
            replacedSeriesNumber,
            message: `Accountable form incident logged to AuditLog successfully.`
        };
    } catch (error: any) {
        console.error("Error reporting accountable form incident:", error);
        return { success: false, error: error?.message || "Failed to log accountable form incident." };
    }
}

/**
 * Fetch all logged accountable form incidents from the immutable AuditLog table.
 */
export async function getAccountableFormIncidentsAction() {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || !["ADMIN", "TREASURY_STAFF", "TREASURY_OFFICER", "ADMIN_AIDE", "MAYOR"].includes(user.role)) {
            return { success: false, error: "Unauthorized access to audit registry." };
        }

        const logs = await prisma.auditLog.findMany({
            where: {
                action: "ACCOUNTABLE_FORM_INCIDENT"
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 200
        });

        const incidents = logs.map((log) => {
            const meta = (typeof log.metadata === "string" 
                ? (() => { try { return JSON.parse(log.metadata); } catch { return {}; } })()
                : (log.metadata || {})) as Record<string, any>;

            return {
                id: log.id,
                action: log.action,
                entityName: log.entityName,
                description: log.description,
                transactionId: log.entityId,
                formType: meta.formType || "Official Receipt",
                incidentType: meta.incidentType || "PAPER_JAM",
                damagedSeriesNumber: meta.damagedSeriesNumber || "—",
                replacedSeriesNumber: meta.replacedSeriesNumber || "—",
                reasonDetails: meta.reasonDetails || null,
                counterName: meta.counterName || null,
                reportedBy: meta.reportedBy || log.userId || "Treasury Staff",
                reportedRole: meta.reportedRole || "STAFF",
                createdAt: log.createdAt
            };
        });

        return {
            success: true,
            data: incidents
        };
    } catch (error: any) {
        console.error("Error retrieving accountable form incidents:", error);
        return { success: false, error: error?.message || "Failed to retrieve incidents." };
    }
}

