"use server";

import prisma from "@/lib/db/prisma";

export interface QueueDepartmentData {
    department: string;
    nowServing: {
        queueNumber: string | null;
        residentName: string;
        counterName: string;
    } | null;
    waiting: string[];
}

export async function getActiveQueueData(): Promise<QueueDepartmentData[]> {
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
            // Find current serving transaction for this department (scheduled for today)
            const activeTx = await prisma.transaction.findFirst({
                where: {
                    status: "FOR_PROCESSING",
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

            // Find next waiting tickets (status: FOR_REQUESTING or FOR_INSPECTION scheduled for today)
            const waitingTxs = await prisma.transaction.findMany({
                where: {
                    status: { in: ["FOR_REQUESTING", "FOR_INSPECTION"] },
                    isCancelled: false,
                    appointmentDate: {
                        gte: startOfDay,
                        lte: endOfDay
                    },
                    type: {
                        category: { in: dept.categories }
                    }
                },
                orderBy: [
                    { isPriority: "desc" },
                    { createdAt: "asc" }
                ],
                take: 5,
                select: {
                    queueNumber: true
                }
            });

            let residentName = "N/A";
            if (activeTx?.user?.residentProfile) {
                const profile = activeTx.user.residentProfile;
                residentName = `${profile.firstName} ${profile.lastName}`;
            }

            // Map counter dynamically if counter data is present in additionalData, else default to department name
            let counterName = `${dept.name} Counter`;
            const additionalData = activeTx?.additionalData as any;
            if (additionalData?.counterName) {
                counterName = additionalData.counterName;
            }

            queueData.push({
                department: dept.name,
                nowServing: activeTx ? {
                    queueNumber: activeTx.queueNumber,
                    residentName,
                    counterName
                } : null,
                waiting: waitingTxs
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
