"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

const ALLOWED_ROLES = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR", "ASSESSOR", "POSO_OFFICER"];

async function verifyAuthUser() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
        return null;
    }
    return user;
}

function parseAdditionalData(raw: any): Record<string, any> {
    if (!raw) return {};
    if (typeof raw === "string") {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return raw;
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

        const currentAdditionalData = parseAdditionalData(transaction.additionalData);
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
                    { type: { category: "POSO" }, status: "UNPAID" },
                    { type: { code: { startsWith: "POSO_" } }, status: "UNPAID" },
                    { type: { processorRole: "TREASURY_STAFF", category: "CEDULA" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { type: { code: "RPT_CAT1" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { status: "UNPAID" }
                ],
                isCancelled: false
            }
        });

        const unassignedWaiting = transactions.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        if (unassignedWaiting.length === 0) {
            return { success: false, error: "No tickets currently waiting for Treasury." };
        }

        const sorted = unassignedWaiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
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

export async function getTreasuryQueueTickets(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const allRawWaiting = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "POSO" }, status: "UNPAID" },
                    { type: { code: { startsWith: "POSO_" } }, status: "UNPAID" },
                    { type: { processorRole: "TREASURY_STAFF", category: "CEDULA" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { type: { code: "RPT_CAT1" }, status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] } },
                    { status: "UNPAID" }
                ],
                isCancelled: false
            },
            include: {
                type: true,
                user: {
                    include: {
                        residentProfile: true
                    }
                }
            }
        });

        const waiting = allRawWaiting.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        const serving = allRawWaiting.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            return tx.status === "FOR_PROCESSING" && addData.counterName === counterName;
        });

        const sortedWaiting = waiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        return {
            success: true,
            data: {
                waiting: sortedWaiting,
                serving: serving
            }
        };
    } catch (error) {
        console.error("Failed to fetch Treasury queue tickets:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// BPLO DEPARTMENT QUEUE ACTIONS
// ----------------------------------------------------

export async function fetchAndCallNextBploTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const transactions = await prisma.transaction.findMany({
            where: {
                type: {
                    code: { startsWith: "BUSINESS_PERMIT" }
                },
                status: {
                    in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM"]
                },
                isCancelled: false,
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });

        const unassignedWaiting = transactions.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        if (unassignedWaiting.length === 0) {
            return { success: false, error: "No commercial applicants are currently waiting in line." };
        }

        const sorted = unassignedWaiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        const nextTx = sorted[0];

        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "BPLO"
        };

        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/bplo");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next BPLO ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function getBploQueueTickets(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const allBploTxs = await prisma.transaction.findMany({
            where: {
                type: {
                    code: { startsWith: "BUSINESS_PERMIT" }
                },
                status: {
                    in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM"]
                },
                isCancelled: false,
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            },
            include: {
                businessPermit: true
            }
        });

        const waiting = allBploTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        const serving = allBploTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            return addData.counterName === counterName;
        });

        const sortedWaiting = waiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        return {
            success: true,
            data: {
                waiting: sortedWaiting,
                serving: serving
            }
        };
    } catch (error) {
        console.error("Failed to fetch BPLO queue tickets:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function callSpecificBploTicket(ticketId: string, counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({
            where: { id: ticketId }
        });

        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = parseAdditionalData(tx.additionalData);
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: "BPLO"
        };

        const updated = await prisma.transaction.update({
            where: { id: ticketId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: updatedAdditionalData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/bplo");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call specific BPLO ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// REGISTRAR / CIVIL REGISTRY QUEUE ACTIONS
// ----------------------------------------------------

export async function getRegistrarQueueTickets(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const allCivilTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "Civil Registry" } },
                    { type: { code: { startsWith: "LCR_" } } },
                    { type: { code: { startsWith: "CIVIL_REGISTRY" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_CLAIM", "FOR_PICKING"] },
                isCancelled: false
            },
            include: {
                type: true,
                user: { include: { residentProfile: true } }
            }
        });

        const waiting = allCivilTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        const serving = allCivilTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            return (tx.status === "FOR_PROCESSING" || tx.status === "FOR_CLAIM" || tx.status === "FOR_PICKING") && addData.counterName === counterName;
        });

        const sortedWaiting = waiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        return { success: true, data: { waiting: sortedWaiting, serving } };
    } catch (error) {
        console.error("Failed to fetch Registrar queue tickets:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function fetchAndCallNextRegistrarTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const allCivilTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "Civil Registry" } },
                    { type: { code: { startsWith: "LCR_" } } },
                    { type: { code: { startsWith: "CIVIL_REGISTRY" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_CLAIM", "FOR_PICKING"] },
                isCancelled: false
            }
        });

        const unassigned = allCivilTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        if (unassigned.length === 0) {
            return { success: false, error: "No citizens are currently waiting in the Civil Registry queue." };
        }

        const sorted = unassigned.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: { ...currentAdditionalData, counterName: sanitizedCounterName, servingDepartment: "Registrar" },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/registrar");
        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next Registrar ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function callSpecificRegistrarTicket(ticketId: string, counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({ where: { id: ticketId } });
        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = parseAdditionalData(tx.additionalData);
        const updated = await prisma.transaction.update({
            where: { id: ticketId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: { ...currentAdditionalData, counterName: sanitizedCounterName, servingDepartment: "Registrar" },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/registrar");
        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call specific Registrar ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// RHU (RURAL HEALTH UNIT) QUEUE ACTIONS
// ----------------------------------------------------

export async function getRHUQueueTickets(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const allRHUTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: { in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"] } } },
                    { type: { code: { startsWith: "RHU_" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "EVALUATED", "FOR_PROCESSING"] },
                isCancelled: false
            },
            include: {
                type: true,
                user: { include: { residentProfile: true } }
            }
        });

        const waiting = allRHUTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = tx.status === "FOR_INSPECTION" || Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        const serving = allRHUTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            return (tx.status === "EVALUATED" || tx.status === "FOR_PROCESSING") && addData.counterName === counterName;
        });

        const sortedWaiting = waiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        return { success: true, data: { waiting: sortedWaiting, serving } };
    } catch (error) {
        console.error("Failed to fetch RHU queue tickets:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function fetchAndCallNextRHUTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const allRHUTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: { in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"] } } },
                    { type: { code: { startsWith: "RHU_" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] },
                isCancelled: false
            }
        });

        const unassigned = allRHUTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = tx.status === "FOR_INSPECTION" || Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        if (unassigned.length === 0) {
            return { success: false, error: "No patients are currently waiting in the RHU queue." };
        }

        const sorted = unassigned.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: { ...currentAdditionalData, counterName: sanitizedCounterName, servingDepartment: "RHU" },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/rhu");
        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next RHU ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function callSpecificRHUTicket(ticketId: string, counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({ where: { id: ticketId } });
        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = parseAdditionalData(tx.additionalData);
        const updated = await prisma.transaction.update({
            where: { id: ticketId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: { ...currentAdditionalData, counterName: sanitizedCounterName, servingDepartment: "RHU" },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/rhu");
        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call specific RHU ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

// ----------------------------------------------------
// POSO (PUBLIC ORDER & SAFETY OFFICE) QUEUE ACTIONS
// ----------------------------------------------------

export async function getPosoQueueTickets(counterName: string) {
    try {
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const allPosoTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "POSO" } },
                    { type: { code: { startsWith: "POSO_" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID", "FOR_PROCESSING"] },
                isCancelled: false
            },
            include: {
                type: true,
                user: { include: { residentProfile: true } }
            }
        });

        const waiting = allPosoTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        const serving = allPosoTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            return (tx.status === "FOR_PROCESSING" || tx.status === "UNPAID") && addData.counterName === counterName;
        });

        const sortedWaiting = waiting.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        return { success: true, data: { waiting: sortedWaiting, serving } };
    } catch (error) {
        console.error("Failed to fetch POSO queue tickets:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function fetchAndCallNextPosoTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Forbidden: Unauthorized role" };

        const allPosoTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "POSO" } },
                    { type: { code: { startsWith: "POSO_" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID"] },
                isCancelled: false
            }
        });

        const unassigned = allPosoTxs.filter(tx => {
            const addData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(addData.checkedIn === true);
            const hasCounter = Boolean(addData.counterName && String(addData.counterName).trim() !== "");
            return isCheckedIn && !hasCounter;
        });

        if (unassigned.length === 0) {
            return { success: false, error: "No tickets currently waiting in the POSO queue." };
        }

        const sorted = unassigned.sort((a, b) => {
            const aPriority = Boolean(a.isPriority);
            const bPriority = Boolean(b.isPriority);

            if (aPriority && !bPriority) return -1;
            if (!aPriority && bPriority) return 1;

            const aData = parseAdditionalData(a.additionalData);
            const bData = parseAdditionalData(b.additionalData);
            const aTime = new Date(aData.checkedInAt || a.createdAt).getTime();
            const bTime = new Date(bData.checkedInAt || b.createdAt).getTime();
            return aTime - bTime;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = parseAdditionalData(nextTx.additionalData);
        const updated = await prisma.transaction.update({
            where: { id: nextTx.id },
            data: {
                status: "FOR_PROCESSING",
                additionalData: { ...currentAdditionalData, counterName: sanitizedCounterName, servingDepartment: "POSO" },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/poso");
        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to fetch and call next POSO ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function callSpecificPosoTicket(ticketId: string, counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const user = await verifyAuthUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({ where: { id: ticketId } });
        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = parseAdditionalData(tx.additionalData);
        const updated = await prisma.transaction.update({
            where: { id: ticketId },
            data: {
                status: "FOR_PROCESSING",
                additionalData: { ...currentAdditionalData, counterName: sanitizedCounterName, servingDepartment: "POSO" },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/poso");
        revalidatePath("/queue");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call specific POSO ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}
