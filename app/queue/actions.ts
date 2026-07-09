"use server";

import prisma from "@/lib/db/prisma";
import { unstable_noStore as noStore } from "next/cache";

export interface QueueDepartmentData {
    department: string;
    nowServing: {
        queueNumber: string | null;
        residentName: string;
        counterName: string;
        updatedAt?: string;
    }[];
    waiting: string[];
}

export async function getActiveQueueData(): Promise<QueueDepartmentData[]> {
    noStore();
    try {
        const departments = [
            {
                name: "Treasury",
                categories: ["CEDULA", "Treasurer"]
            },
            {
                name: "BPLO",
                categories: ["Business Permit"]
            },
            {
                name: "Registrar",
                categories: ["Civil Registry"]
            },
            {
                name: "Engineering",
                categories: ["Building Permit", "Engineer"]
            }
        ];

        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        const queueData: QueueDepartmentData[] = [];

        for (const dept of departments) {
            const isBplo = dept.name === "BPLO";

            // Find current serving transactions for this department (scheduled for today)
            const activeTxs = await prisma.transaction.findMany({
                where: {
                    status: {
                        in: isBplo 
                            ? ["FOR_PROCESSING", "FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION"]
                            : ["FOR_PROCESSING"]
                    },
                    isCancelled: false,
                    appointmentDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    type: {
                        category: { in: dept.categories }
                    }
                },
                orderBy: {
                    updatedAt: "desc"
                },
                include: {
                    user: {
                        include: {
                            residentProfile: true
                        }
                    }
                }
            });

            // Group by counterName in memory to show the latest ticket per window
            const nowServingList: { queueNumber: string | null; residentName: string; counterName: string }[] = [];
            const seenCounters = new Set<string>();

            // Filter active transactions to only include currently active/called tickets
            const servingTxs = activeTxs.filter(tx => {
                if (tx.status === "FOR_PROCESSING") return true;
                // For BPLO, we also count it as serving if it's in a queue status but counterName is set
                if (isBplo) {
                    const additionalData = tx.additionalData as any;
                    return additionalData && typeof additionalData.counterName === "string" && additionalData.counterName.trim() !== "";
                }
                return false;
            });

            for (const tx of servingTxs) {
                const additionalData = tx.additionalData as any;
                const counterName = additionalData?.counterName || `${dept.name} Counter`;

                if (!seenCounters.has(counterName)) {
                    seenCounters.add(counterName);

                    let residentName = "N/A";
                    if (tx.user?.residentProfile) {
                        const profile = tx.user.residentProfile;
                        residentName = `${profile.firstName} ${profile.lastName}`;
                    }

                    nowServingList.push({
                        queueNumber: tx.queueNumber,
                        residentName,
                        counterName,
                        updatedAt: tx.updatedAt.toISOString()
                    });
                }
            }

            // Define allowed statuses for waiting queue
            const allowedStatuses = isBplo 
                ? ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION"]
                : ["FOR_REQUESTING", "FOR_INSPECTION"];

            if (dept.name === "Treasury") {
                allowedStatuses.push("UNPAID");
            }

            // Find next waiting tickets (scheduled for today and physically checked-in)
            const waitingTxsRaw = await prisma.transaction.findMany({
                where: {
                    status: { in: allowedStatuses as any },
                    isCancelled: false,
                    appointmentDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    type: {
                        category: { in: dept.categories }
                    },
                    additionalData: {
                        path: ["checkedIn"],
                        equals: true
                    }
                },
                select: {
                    queueNumber: true,
                    isPriority: true,
                    additionalData: true,
                    createdAt: true
                }
            });

            // Filter out tickets that are already assigned to a counter (currently serving)
            const filteredWaiting = waitingTxsRaw.filter(tx => {
                const addData = tx.additionalData as any;
                return !addData || !addData.counterName;
            });

            // Sort in memory: Priority (Seniors/PWDs) first, then by checkedInAt physical timestamp (FIFO)
            const sortedWaiting = filteredWaiting
                .sort((a, b) => {
                    if (a.isPriority && !b.isPriority) return -1;
                    if (!a.isPriority && b.isPriority) return 1;

                    const aCheckedInAt = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
                    const bCheckedInAt = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
                    return aCheckedInAt - bCheckedInAt;
                })
                .slice(0, 5);

            queueData.push({
                department: dept.name,
                nowServing: nowServingList,
                waiting: sortedWaiting
                    .map(tx => tx.queueNumber)
                    .filter((num): num is string => !!num)
            });
        }

        return queueData;
    } catch (error) {
        console.error("Failed to fetch queue data:", error);
        return [];
    }
}

export async function verifyRfidUnlock(rfidCardId: string): Promise<{ success: boolean; role?: string; error?: string }> {
    try {
        const user = await prisma.user.findFirst({
            where: {
                rfid: rfidCardId,
                role: {
                    in: ["ADMIN", "BARANGAY_ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "MPDC_ZONING"]
                }
            }
        });

        if (user) {
            return { success: true, role: user.role };
        }
        return { success: false, error: "Invalid RFID Card or Unauthorized Access" };
    } catch (error) {
        console.error("RFID Verification failed:", error);
        return { success: false, error: "Database verification failed" };
    }
}
