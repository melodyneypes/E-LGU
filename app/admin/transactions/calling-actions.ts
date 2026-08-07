"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

const ALLOWED_ROLES = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR", "ASSESSOR"];

async function verifyAuthUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
        return null;
    }
    return user;
}

// ----------------------------------------------------
// GENERAL / GENERIC CALLING ACTIONS
// ----------------------------------------------------

export async function callTicketToCounter(id: string, counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const sanitizedId = sanitizeString(id);
        const sanitizedCounterName = sanitizeString(counterName);

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const finalStatuses = ["RELEASED", "CANCELLED", "REJECTED", "DELIVERED"];
        if (finalStatuses.includes(transaction.status)) {
            return { success: true, message: "Transaction already finalized" };
        }

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const isAssessor = user.role === "ASSESSOR" || user.department?.toUpperCase() === "ASSESSOR";
        const isTreasury = user.role === "TREASURY_STAFF" || user.department?.toUpperCase() === "TREASURY";
        const servingDept = isAssessor ? "Assessor" : isTreasury ? "Treasury" : "BPLO";

        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: servingDept
        };

        const updated = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/assessor");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call ticket to counter:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// TREASURY DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextTicket(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const sanitizedCounterName = sanitizeString(counterName);

        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { processorRole: "TREASURY_STAFF", category: "CEDULA" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { type: { code: "RPT_CAT1" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { status: "UNPAID" }
                ],
                isCancelled: false,
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            }
        });

        if (transactions.length === 0) {
            return { success: false, error: "No tickets currently waiting for Treasury." };
        }

        const sorted = transactions.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = (nextTx.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "Treasury"
        };

        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/treasury");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next Treasury ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function getTreasuryQueueTickets(counterName?: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const transactions = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                OR: [
                    { type: { category: "CEDULA" } },
                    { type: { code: "RPT_CAT1" } },
                    { status: "UNPAID" }
                ]
            },
            include: {
                user: { include: { residentProfile: true } },
                type: true
            },
            orderBy: { createdAt: "desc" }
        });

        const serving = transactions.filter(t => {
            const addData = (t.additionalData as any) || {};
            const matchesCounter = !counterName || addData.counterName === counterName;
            return t.status === "FOR_PROCESSING" && addData.servingDepartment === "Treasury" && matchesCounter;
        });

        const waiting = transactions.filter(t => {
            const addData = (t.additionalData as any) || {};
            const isCheckedIn = !!addData.checkedIn;
            const isServing = t.status === "FOR_PROCESSING" && addData.servingDepartment === "Treasury";
            return isCheckedIn && !isServing && ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID"].includes(t.status);
        });

        return {
            success: true,
            data: {
                serving: JSON.parse(JSON.stringify(serving)),
                waiting: JSON.parse(JSON.stringify(waiting))
            }
        };
    } catch (error: any) {
        console.error("Failed to fetch Treasury queue tickets:", error);
        return { success: false, error: error.message || "Failed to fetch Treasury queue tickets" };
    }
}

// ----------------------------------------------------
// BPLO DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextBploTicket(counterName: string) {
    return await callTicketToCounterByName(counterName, "BPLO", ["BUSINESS_PERMIT"]);
}

export async function callSpecificBploTicket(id: string, counterName: string) {
    return await callTicketToCounter(id, counterName);
}

export async function getBploQueueTickets(counterName?: string) {
    return await getDepartmentQueueTickets("BPLO", ["BUSINESS_PERMIT"], counterName);
}

// ----------------------------------------------------
// REGISTRAR DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextRegistrarTicket(counterName: string) {
    return await callTicketToCounterByName(counterName, "Registrar", ["LCR_", "CIVIL_REGISTRY"]);
}

export async function callSpecificRegistrarTicket(id: string, counterName: string) {
    return await callTicketToCounter(id, counterName);
}

export async function getRegistrarQueueTickets(counterName?: string) {
    return await getDepartmentQueueTickets("Registrar", ["LCR_", "CIVIL_REGISTRY"], counterName);
}

// ----------------------------------------------------
// RHU DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextRHUTicket(counterName: string) {
    return await callTicketToCounterByName(counterName, "RHU", ["RHU_"]);
}

export async function callSpecificRHUTicket(id: string, counterName: string) {
    return await callTicketToCounter(id, counterName);
}

export async function getRHUQueueTickets(counterName?: string) {
    return await getDepartmentQueueTickets("RHU", ["RHU_"], counterName);
}

// ----------------------------------------------------
// ASSESSOR DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextAssessorTicket(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const sanitizedCounterName = sanitizeString(counterName);

        const transactions = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                type: { category: "RPT" },
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_PROCESSING"] }
            },
            include: {
                user: { include: { residentProfile: true } },
                type: true
            }
        });

        const assessorWaiting = transactions.filter(t => {
            const addData = (t.additionalData as any) || {};
            const isCheckedIn = !!addData.checkedIn;
            const code = t.type?.code || "";
            const categoryCode = addData.categoryCode || code;
            return isCheckedIn && (categoryCode === "RPT_CAT2" || categoryCode === "RPT_CAT3");
        });

        if (assessorWaiting.length === 0) {
            return { success: false, error: "No applicants are currently waiting in the Assessor queue." };
        }

        const sorted = assessorWaiting.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = (nextTx.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "Assessor"
        };

        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/assessor");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next Assessor ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function getAssessorQueueTickets(counterName?: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const transactions = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                type: { category: "RPT" }
            },
            include: {
                user: { include: { residentProfile: true } },
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

        const assessorTxs = combined.filter(t => {
            const rpt = t.realPropertyTax || {};
            const addData = (t.additionalData as any) || {};
            const cat = rpt.rptCategory || addData.categoryCode || t.type?.code;
            return cat === "RPT_CAT2" || cat === "RPT_CAT3";
        });

        const serving = assessorTxs.filter(t => {
            const addData = (t.additionalData as any) || {};
            const matchesCounter = !counterName || addData.counterName === counterName;
            return t.status === "FOR_PROCESSING" && addData.servingDepartment === "Assessor" && matchesCounter;
        });

        const waiting = assessorTxs.filter(t => {
            const addData = (t.additionalData as any) || {};
            const isCheckedIn = !!addData.checkedIn;
            const isServing = t.status === "FOR_PROCESSING" && addData.servingDepartment === "Assessor";
            return isCheckedIn && !isServing && ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION"].includes(t.status);
        });

        return {
            success: true,
            data: {
                serving: JSON.parse(JSON.stringify(serving)),
                waiting: JSON.parse(JSON.stringify(waiting))
            }
        };
    } catch (error: any) {
        console.error("Failed to fetch Assessor queue tickets:", error);
        return { success: false, error: error.message || "Failed to fetch Assessor queue tickets" };
    }
}

// ----------------------------------------------------
// GENERIC DEPT HELPERS FOR BPLO / REGISTRAR / RHU
// ----------------------------------------------------

async function getDepartmentQueueTickets(deptName: string, codePrefixes: string[], counterName?: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const transactions = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                OR: codePrefixes.map(prefix => ({
                    type: { code: { startsWith: prefix } }
                }))
            },
            include: {
                user: { include: { residentProfile: true } },
                type: true
            },
            orderBy: { createdAt: "desc" }
        });

        const serving = transactions.filter(t => {
            const addData = (t.additionalData as any) || {};
            const matchesCounter = !counterName || addData.counterName === counterName;
            return t.status === "FOR_PROCESSING" && addData.servingDepartment === deptName && matchesCounter;
        });

        const waiting = transactions.filter(t => {
            const addData = (t.additionalData as any) || {};
            const isCheckedIn = !!addData.checkedIn;
            const isServing = t.status === "FOR_PROCESSING" && addData.servingDepartment === deptName;
            return isCheckedIn && !isServing && ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION"].includes(t.status);
        });

        return {
            success: true,
            data: {
                serving: JSON.parse(JSON.stringify(serving)),
                waiting: JSON.parse(JSON.stringify(waiting))
            }
        };
    } catch (error: any) {
        console.error(`Failed to fetch ${deptName} queue tickets:`, error);
        return { success: false, error: error.message || `Failed to fetch ${deptName} queue tickets` };
    }
}

async function callTicketToCounterByName(counterName: string, deptName: string, codePrefixes: string[]) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const sanitizedCounterName = sanitizeString(counterName);

        const transactions = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                OR: codePrefixes.map(prefix => ({
                    type: { code: { startsWith: prefix } }
                })),
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_PROCESSING"] },
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            }
        });

        if (transactions.length === 0) {
            return { success: false, error: `No applicants currently waiting in the ${deptName} queue.` };
        }

        const sorted = transactions.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = (nextTx.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: deptName
        };

        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error(`Failed to fetch and call next ${deptName} ticket:`, error);
        return { success: false, error: "Internal server error" };
    }
}
