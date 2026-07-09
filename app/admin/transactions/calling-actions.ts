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
        
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
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
        
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
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
                    {
                        type: {
                            processorRole: "TREASURY_STAFF",
                            category: "CEDULA"
                        },
                        status: {
                            in: ["FOR_REQUESTING", "FOR_INSPECTION"]
                        }
                    },
                    {
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
        
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
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
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
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
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
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
        const allowedRoles = ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER"];
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
                OR: [
                    {
                        type: {
                            processorRole: "TREASURY_STAFF",
                            category: "CEDULA"
                        },
                        status: {
                            in: ["FOR_REQUESTING", "FOR_INSPECTION"]
                        }
                    },
                    {
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
            },
            include: {
                user: {
                    include: {
                        residentProfile: true
                    }
                }
            }
        });

        // Fetch currently serving at this counter
        const serving = await prisma.transaction.findMany({
            where: {
                status: "FOR_PROCESSING",
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

