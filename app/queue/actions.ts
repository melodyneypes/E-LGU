"use server";

import prisma from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
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
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch all active transactions (no date restriction — rely on checkedIn flag for queue)
        const allTxs = await prisma.transaction.findMany({
            where: {
                isCancelled: false
            },
            orderBy: {
                updatedAt: "desc"
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

        const deptNames = ["Treasury", "BPLO", "Registrar", "Engineering"];
        const queueData: QueueDepartmentData[] = deptNames.map(name => ({
            department: name,
            nowServing: [],
            waiting: []
        }));

        const getDeptIndex = (tx: any, isWaiting: boolean) => {
            const category = tx.type?.category || "";
            const code = tx.type?.code || "";
            const status = tx.status;
            const additionalData = tx.additionalData as any;
            const counterName = (additionalData?.counterName || "").toUpperCase();

            // If status is UNPAID, they are waiting to pay -> Treasury
            if (isWaiting && status === "UNPAID") {
                return 0; // Treasury index
            }

            // If serving (status: FOR_PROCESSING), determine by counterName or servingDepartment if available
            if (!isWaiting && status === "FOR_PROCESSING") {
                if (additionalData?.servingDepartment === "Treasury" || counterName.includes("TREASURY") || counterName.includes("CASHIER")) {
                    return 0; // Treasury
                }
                if (additionalData?.servingDepartment === "BPLO" || counterName.includes("BPLO")) {
                    return 1; // BPLO
                }
                if (additionalData?.servingDepartment === "Registrar" || counterName.includes("REGISTRAR") || counterName.includes("CIVIL")) {
                    return 2; // Registrar
                }
                if (additionalData?.servingDepartment === "Engineering" || counterName.includes("ENGINEER")) {
                    return 3; // Engineering
                }
            }

            // Fallback by original category or code prefix
            if (["CEDULA", "Treasurer"].includes(category) || code.startsWith("CEDULA")) return 0;
            if (["Business Permit"].includes(category) || code.startsWith("BUSINESS_PERMIT")) return 1;
            if (["Civil Registry"].includes(category) || code.startsWith("LCR_") || code.startsWith("CIVIL_REGISTRY")) return 2;
            if (["Building Permit", "Engineer"].includes(category) || code.startsWith("ENGINEER") || code.startsWith("BUILDING")) return 3;

            return -1;
        };

        // Partition serving tickets
        const servingTxs = allTxs.filter(tx => {
            if (tx.status === "FOR_PROCESSING") return true;
            const category = tx.type?.category || "";
            const code = tx.type?.code || "";
            if (category === "Business Permit" || code.startsWith("BUSINESS_PERMIT")) {
                const allowedBploServing = ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM"];
                if (allowedBploServing.includes(tx.status)) {
                    const additionalData = tx.additionalData as any;
                    return additionalData && typeof additionalData.counterName === "string" && additionalData.counterName.trim() !== "";
                }
            }
            if (category === "Civil Registry" || code.startsWith("LCR_") || code.startsWith("CIVIL_REGISTRY")) {
                const allowedRegistrarServing = ["FOR_REQUESTING", "FOR_INSPECTION"];
                if (allowedRegistrarServing.includes(tx.status)) {
                    const additionalData = tx.additionalData as any;
                    return additionalData && typeof additionalData.counterName === "string" && additionalData.counterName.trim() !== "";
                }
            }
            return false;
        });

        const seenCountersByDept: Record<string, Set<string>> = {
            Treasury: new Set(),
            BPLO: new Set(),
            Registrar: new Set(),
            Engineering: new Set()
        };

        for (const tx of servingTxs) {
            const deptIdx = getDeptIndex(tx, false);
            if (deptIdx === -1) continue;

            const deptName = deptNames[deptIdx];
            const additionalData = tx.additionalData as any;
            const counterName = additionalData?.counterName || `${deptName} Counter`;

            if (!seenCountersByDept[deptName].has(counterName)) {
                seenCountersByDept[deptName].add(counterName);

                let residentName = "N/A";
                if (tx.user?.residentProfile) {
                    const profile = tx.user.residentProfile;
                    residentName = `${profile.firstName} ${profile.lastName}`;
                }

                queueData[deptIdx].nowServing.push({
                    queueNumber: tx.queueNumber,
                    residentName,
                    counterName,
                    updatedAt: tx.updatedAt.toISOString()
                });
            }
        }

        // Partition waiting tickets
        const waitingTxsRaw = allTxs.filter(tx => {
            const additionalData = tx.additionalData as any;
            const isCheckedIn = additionalData && !!additionalData.checkedIn;
            if (!isCheckedIn) return false;

            const hasCounter = additionalData && typeof additionalData.counterName === "string" && additionalData.counterName.trim() !== "";
            if (hasCounter) return false;

            const category = tx.type?.category || "";
            const code = tx.type?.code || "";
            if (category === "Business Permit" || code.startsWith("BUSINESS_PERMIT")) {
                return ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM", "UNPAID"].includes(tx.status);
            }

            if (category === "CEDULA" || code.startsWith("CEDULA")) {
                return ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID"].includes(tx.status);
            }

            if (category === "Civil Registry" || code.startsWith("LCR_") || code.startsWith("CIVIL_REGISTRY")) {
                return ["FOR_REQUESTING", "FOR_INSPECTION"].includes(tx.status);
            }

            return ["FOR_REQUESTING", "FOR_INSPECTION"].includes(tx.status);
        });


        for (const tx of waitingTxsRaw) {
            const deptIdx = getDeptIndex(tx, true);
            if (deptIdx === -1) continue;

            queueData[deptIdx].waiting.push(tx as any);
        }

        for (const data of queueData) {
            const sorted = (data.waiting as any[]).sort((a, b) => {
                if (a.isPriority && !b.isPriority) return -1;
                if (!a.isPriority && b.isPriority) return 1;

                const aCheckedInAt = new Date((a.additionalData as any)?.checkedInAt || a.createdAt).getTime();
                const bCheckedInAt = new Date((b.additionalData as any)?.checkedInAt || b.createdAt).getTime();
                return aCheckedInAt - bCheckedInAt;
            });

            data.waiting = sorted
                .map(tx => tx.queueNumber)
                .filter((num): num is string => !!num)
                .slice(0, 5);
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
                    in: [
                        UserRole.ADMIN,
                        UserRole.BARANGAY_ADMIN,
                        UserRole.TREASURY_STAFF,
                        UserRole.ADMIN_AIDE,
                        UserRole.ENGINEER
                    ]
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
