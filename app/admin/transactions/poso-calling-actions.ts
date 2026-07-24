"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";
import { generateQueueNumber } from "@/lib/queue";

export async function checkInPosoTicket({
    ticketId,
    isPriority = false
}: {
    ticketId: string;
    isPriority?: boolean;
}) {
    try {
        const sanitizedId = sanitizeString(ticketId);
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized access." };
        }

        const ticket = await prisma.ticketHeader.findUnique({
            where: { id: sanitizedId },
            include: { details: { include: { violation: true } } }
        });

        if (!ticket) {
            return { success: false, error: "Traffic ticket not found." };
        }

        const currentQueueData = (ticket.queueData as any) || {};

        // If already checked in, return existing queue details
        if (currentQueueData.checkedIn && currentQueueData.queueNumber) {
            return {
                success: true,
                alreadyCheckedIn: true,
                queueNumber: currentQueueData.queueNumber,
                data: ticket
            };
        }

        const queueNumber = await generateQueueNumber({
            source: "kiosk",
            isPriority: Boolean(isPriority),
            appointmentDate: new Date(),
            category: "POSO"
        });

        const newQueueData = {
            ...currentQueueData,
            queueNumber,
            isPriority: Boolean(isPriority),
            checkedIn: true,
            checkedInAt: new Date().toISOString(),
            queueStatus: "WAITING",
            counterName: null
        };

        const updated = await prisma.ticketHeader.update({
            where: { id: sanitizedId },
            data: {
                queueData: newQueueData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/poso");
        revalidatePath("/queue");

        return {
            success: true,
            queueNumber,
            data: updated
        };
    } catch (error: any) {
        console.error("Failed to check in POSO ticket:", error);
        return { success: false, error: error.message || "Failed to check in POSO ticket." };
    }
}

export async function getPosoQueueTickets(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized." };
        }

        // Fetch all TicketHeaders that have queueData.checkedIn = true
        const tickets = await prisma.ticketHeader.findMany({
            include: {
                details: {
                    include: {
                        violation: true
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });

        const checkedInTickets = tickets.filter(t => {
            const q = (t.queueData as any) || {};
            return q.checkedIn === true;
        });

        const waiting = checkedInTickets
            .filter(t => {
                const q = (t.queueData as any) || {};
                return q.queueStatus === "WAITING";
            })
            .map(t => {
                const q = (t.queueData as any) || {};
                return {
                    id: t.id,
                    ticketNo: t.ticketNo,
                    queueNumber: q.queueNumber || t.ticketNo,
                    violatorName: t.violatorName,
                    plateNo: t.plateNo,
                    totalAmount: t.totalAmount,
                    isPriority: Boolean(q.isPriority),
                    checkedInAt: q.checkedInAt || t.createdAt,
                    status: t.status,
                    details: t.details
                };
            })
            .sort((a, b) => {
                if (a.isPriority && !b.isPriority) return -1;
                if (!a.isPriority && b.isPriority) return 1;
                return new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime();
            });

        const serving = checkedInTickets
            .filter(t => {
                const q = (t.queueData as any) || {};
                return q.queueStatus === "SERVING" && (q.counterName === sanitizedCounterName || !sanitizedCounterName);
            })
            .map(t => {
                const q = (t.queueData as any) || {};
                return {
                    id: t.id,
                    ticketNo: t.ticketNo,
                    queueNumber: q.queueNumber || t.ticketNo,
                    violatorName: t.violatorName,
                    plateNo: t.plateNo,
                    totalAmount: t.totalAmount,
                    isPriority: Boolean(q.isPriority),
                    checkedInAt: q.checkedInAt || t.createdAt,
                    counterName: q.counterName || sanitizedCounterName,
                    status: t.status,
                    details: t.details
                };
            });

        return {
            success: true,
            data: {
                waiting,
                serving
            }
        };
    } catch (error: any) {
        console.error("Failed to fetch POSO queue tickets:", error);
        return { success: false, error: error.message || "Internal server error" };
    }
}

export async function fetchAndCallNextPosoTicket(counterName: string) {
    try {
        const sanitizedCounterName = sanitizeString(counterName);
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Forbidden: Unauthorized access" };
        }

        const res = await getPosoQueueTickets(sanitizedCounterName);
        if (!res.success || !res.data) {
            return { success: false, error: res.error || "Failed to load queue." };
        }

        const waitingList = res.data.waiting;
        if (waitingList.length === 0) {
            return { success: false, error: "No citation tickets are currently waiting in line." };
        }

        const nextTicket = waitingList[0];
        return await callSpecificPosoTicket(nextTicket.id, sanitizedCounterName);
    } catch (error: any) {
        console.error("Failed to fetch & call next POSO ticket:", error);
        return { success: false, error: error.message || "Internal server error" };
    }
}

export async function callSpecificPosoTicket(ticketId: string, counterName: string) {
    try {
        const sanitizedId = sanitizeString(ticketId);
        const sanitizedCounterName = sanitizeString(counterName);

        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Forbidden: Unauthorized access" };
        }

        const ticket = await prisma.ticketHeader.findUnique({
            where: { id: sanitizedId }
        });

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        const currentQueueData = (ticket.queueData as any) || {};
        const updatedQueueData = {
            ...currentQueueData,
            counterName: sanitizedCounterName,
            queueStatus: "SERVING",
            servedAt: new Date().toISOString()
        };

        const updated = await prisma.ticketHeader.update({
            where: { id: sanitizedId },
            data: {
                queueData: updatedQueueData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/poso");
        revalidatePath("/queue");

        return {
            success: true,
            data: {
                id: updated.id,
                ticketNo: updated.ticketNo,
                queueNumber: updatedQueueData.queueNumber || updated.ticketNo,
                violatorName: updated.violatorName,
                counterName: sanitizedCounterName
            }
        };
    } catch (error: any) {
        console.error("Failed to call POSO ticket to counter:", error);
        return { success: false, error: error.message || "Internal server error" };
    }
}

export async function completePosoServingTicket(ticketId: string) {
    try {
        const sanitizedId = sanitizeString(ticketId);
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized." };
        }

        const ticket = await prisma.ticketHeader.findUnique({
            where: { id: sanitizedId }
        });

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        const currentQueueData = (ticket.queueData as any) || {};
        const updatedQueueData = {
            ...currentQueueData,
            queueStatus: "SERVED",
            completedAt: new Date().toISOString()
        };

        const updated = await prisma.ticketHeader.update({
            where: { id: sanitizedId },
            data: {
                queueData: updatedQueueData,
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/poso");
        revalidatePath("/queue");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Failed to complete serving ticket:", error);
        return { success: false, error: error.message || "Internal server error" };
    }
}
