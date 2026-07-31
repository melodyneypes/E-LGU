"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";

export async function callTicketToCounter(id: string, counterName: string) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedCounterName = sanitizeString(counterName);

        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true }
        });

        if (!transaction) {
            return { success: false, error: "Transaction not found" };
        }

        // Avoid changing status if the transaction is already finalized
        const finalStatuses = ["RELEASED", "CANCELLED", "REJECTED", "DELIVERED"];
        if (finalStatuses.includes(transaction.status)) {
            return { success: true, message: "Transaction already finalized" };
        }

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const isTreasury = user.role === "TREASURY_STAFF" || user.department?.toUpperCase() === "TREASURY";
        const updatedAdditionalData = {
            ...currentAdditionalData,
            counterName: sanitizedCounterName,
            servingDepartment: isTreasury ? "Treasury" : "BPLO"
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
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error) {
        console.error("Failed to call ticket to counter:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function fetchAndCallNextTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);

        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch all matching queue tickets waiting for Treasury
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    // CEDULA walk-ins
                    {
                        type: {
                            processorRole: "TREASURY_STAFF",
                            category: "CEDULA"
                        },
                        status: {
                            in: ["FOR_REQUESTING", "FOR_INSPECTION"]
                        }
                    },
                    // Standard UNPAID transactions
                    {
                        status: "UNPAID"
                    },
                    // PSA Appointment Endorsements awaiting Treasury counter payment
                    {
                        type: {
                            code: {
                                in: [
                                    "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                                    "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                                    "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                                ]
                            }
                        },
                        status: "UNPAID"
                    }
                ],
                isCancelled: false,
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            }
        });

        if (transactions.length === 0) {
            return { success: false, error: "No citizens are currently waiting in line." };
        }

        // Sort: Priority (Seniors/PWDs) first, then by checkedInAt physical timestamp (FIFO)
        const sorted = transactions.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];

        // Call the next ticket using our existing function logic
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
        console.error("Failed to fetch and call next ticket:", error);
        return { success: false, error: "Internal server error" };
    }
}

export async function fetchAndCallNextBploTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);

        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch all matching queue tickets waiting for BPLO (Business Permits)
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
                },
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            }
        });

        if (transactions.length === 0) {
            return { success: false, error: "No commercial applicants are currently waiting in line." };
        }

        // Sort: Priority (Seniors/PWDs) first, then by checkedInAt physical timestamp (FIFO)
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
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch waiting tickets
        const waiting = await prisma.transaction.findMany({
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
                },
                additionalData: {
                    path: ["checkedIn"],
                    equals: true
                }
            },
            include: {
                businessPermit: true
            }
        });

        // Fetch currently serving at this counter
        const serving = await prisma.transaction.findMany({
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
                },
                additionalData: {
                    path: ["counterName"],
                    equals: counterName
                }
            },
            include: {
                businessPermit: true
            }
        });

        // Sort waiting queue and filter out already called/assigned tickets
        const filteredWaiting = waiting.filter(tx => {
            const addData = tx.additionalData as any;
            return !addData || !addData.counterName;
        });

        const sortedWaiting = filteredWaiting.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
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

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id: ticketId }
        });

        if (!tx) {
            return { success: false, error: "Ticket not found" };
        }

        const currentAdditionalData = (tx.additionalData as any) || {};
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

export async function getTreasuryQueueTickets(counterName: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch waiting tickets
        const allRawWaiting = await prisma.transaction.findMany({
            where: {
                OR: [
                    // POSO Citation Fine transactions waiting to pay at Treasury
                    {
                        type: {
                            category: "POSO"
                        },
                        status: "UNPAID"
                    },
                    // CEDULA walk-ins waiting at treasury
                    {
                        type: {
                            processorRole: "TREASURY_STAFF",
                            category: "CEDULA"
                        },
                        status: {
                            in: ["FOR_REQUESTING", "FOR_INSPECTION"]
                        }
                    },
                    // Standard UNPAID transactions waiting to pay
                    {
                        status: "UNPAID",
                        NOT: {
                            type: {
                                code: {
                                     in: [
                                         "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                                         "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                                         "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                                     ]
                                }
                            }
                        }
                    },
                    // PSA Appointment Endorsements awaiting Treasury counter payment
                    {
                        type: {
                            code: {
                                in: [
                                    "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                                    "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                                    "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                                ]
                            }
                        },
                        status: "UNPAID",
                        appointmentDate: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    }
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

        // Filter in JS: checked-in tickets that have not yet been assigned to a counter
        const waiting = allRawWaiting.filter(tx => {
            const addData = (tx.additionalData as any) || {};
            const isCheckedIn = Boolean(addData.checkedIn === true);
            return isCheckedIn && !addData.counterName;
        });

        // Fetch currently serving at this counter
        const serving = await prisma.transaction.findMany({
            where: {
                status: "FOR_PROCESSING",
                isCancelled: false,
                additionalData: {
                    path: ["counterName"],
                    equals: counterName
                }
            },
            include: {
                user: {
                    include: {
                        residentProfile: true
                    }
                }
            }
        });

        // Sort waiting queue
        const sortedWaiting = waiting.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;

            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
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

export async function getRegistrarQueueTickets(counterName: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        // Fetch all Civil Registry tickets that are in a waiting status
        const allCivilTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "Civil Registry" } },
                    { type: { code: { startsWith: "LCR_" } } },
                    { type: { code: { startsWith: "CIVIL_REGISTRY" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_CLAIM", "FOR_PICKING"] },
                isCancelled: false,
            },
            include: {
                type: true,
                user: { include: { residentProfile: true } }
            }
        });

        const filteredWaiting = allCivilTxs.filter(tx => {
            const addData = tx.additionalData as any;
            return addData && !!addData.checkedIn && !addData.counterName;
        });

        // Fetch currently serving at this counter (all Civil Registry FOR_PROCESSING)
        const allServing = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "Civil Registry" } },
                    { type: { code: { startsWith: "LCR_" } } },
                    { type: { code: { startsWith: "CIVIL_REGISTRY" } } }
                ],
                status: { in: ["FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING"] },
                isCancelled: false,
            },
            include: {
                type: true,
                user: { include: { residentProfile: true } }
            }
        });

        // Filter in JS: only tickets at this specific counter
        const serving = allServing.filter(tx => {
            const addData = tx.additionalData as any;
            return addData?.counterName === counterName;
        });

        const sortedWaiting = filteredWaiting.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
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

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const allCivilTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: "Civil Registry" } },
                    { type: { code: { startsWith: "LCR_" } } },
                    { type: { code: { startsWith: "CIVIL_REGISTRY" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_CLAIM", "FOR_PICKING"] },
                isCancelled: false,
            }
        });

        // Filter in JS: checked-in and no counter assigned yet
        const unassigned = allCivilTxs.filter(tx => {
            const addData = tx.additionalData as any;
            return addData && !!addData.checkedIn && !addData.counterName;
        });

        if (unassigned.length === 0) {
            return { success: false, error: "No citizens are currently waiting in the Civil Registry queue." };
        }

        const sorted = unassigned.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = (nextTx.additionalData as any) || {};
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

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({ where: { id: ticketId } });
        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};
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

export async function getRHUQueueTickets(counterName: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        const allRHUTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: { in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"] } } },
                    { type: { code: { startsWith: "RHU_" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "EVALUATED", "FOR_PROCESSING"] },
                isCancelled: false,
            },
            include: {
                type: true,
                user: { include: { residentProfile: true } }
            }
        });

        const filteredWaiting = allRHUTxs.filter(tx => {
            const addData = tx.additionalData as any;
            const isCheckedIn = tx.status === "FOR_INSPECTION" || (addData && !!addData.checkedIn);
            return isCheckedIn && (!addData || !addData.counterName);
        });

        const serving = allRHUTxs.filter(tx => {
            const addData = tx.additionalData as any;
            return (tx.status === "EVALUATED" || tx.status === "FOR_PROCESSING") && addData?.counterName === counterName;
        });

        const sortedWaiting = filteredWaiting.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
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

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Forbidden: Unauthorized role" };
        }

        const allRHUTxs = await prisma.transaction.findMany({
            where: {
                OR: [
                    { type: { category: { in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"] } } },
                    { type: { code: { startsWith: "RHU_" } } }
                ],
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] },
                isCancelled: false,
            }
        });

        const unassigned = allRHUTxs.filter(tx => {
            const addData = tx.additionalData as any;
            const isCheckedIn = tx.status === "FOR_INSPECTION" || (addData && !!addData.checkedIn);
            return isCheckedIn && (!addData || !addData.counterName);
        });

        if (unassigned.length === 0) {
            return { success: false, error: "No patients are currently waiting in the RHU queue." };
        }

        const sorted = unassigned.sort((a, b) => {
            if (a.isPriority && !b.isPriority) return -1;
            if (!a.isPriority && b.isPriority) return 1;
            const aCheckedIn = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
            const bCheckedIn = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
            return aCheckedIn - bCheckedIn;
        });

        const nextTx = sorted[0];
        const currentAdditionalData = (nextTx.additionalData as any) || {};
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

        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "REGISTRAR"];
        if (!user || !allowedRoles.includes(user.role)) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({ where: { id: ticketId } });
        if (!tx) return { success: false, error: "Ticket not found" };

        const currentAdditionalData = (tx.additionalData as any) || {};
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

