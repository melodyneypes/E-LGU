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

export async function getActiveQueueData(): Promise<QueueDepartmentData[]> {
    noStore();
    try {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setUTCHours(23, 59, 59, 999);

        // Fetch all active transactions using raw SQL to safely handle null userId values
        const rawTxs: any[] = await prisma.$queryRaw`
            SELECT 
                t."id", t."userId", t."typeId", t."status"::text as "status", 
                t."appointmentDate", t."appointmentSlot", t."queueNumber", 
                t."totalAmount", t."isPaid", t."isPriority", t."isCancelled", 
                t."residentSnapshot", t."additionalData", t."createdAt", t."updatedAt",
                tt."code" as "typeCode", tt."name" as "typeName", tt."category" as "typeCategory",
                r."firstName", r."lastName"
            FROM "Transaction" t
            LEFT JOIN "TransactionType" tt ON t."typeId" = tt."id"
            LEFT JOIN "User" u ON t."userId" = u."id"
            LEFT JOIN "Resident" r ON u."id" = r."userId"
            WHERE t."isCancelled" = false
            ORDER BY t."updatedAt" DESC
        `;

        const allTxs = rawTxs.map(t => ({
            ...t,
            type: {
                code: t.typeCode,
                name: t.typeName,
                category: t.typeCategory
            },
            user: t.firstName ? { residentProfile: { firstName: t.firstName, lastName: t.lastName } } : null
        }));

        const deptNames = ["Treasury", "BPLO", "Registrar", "Assessor"];
        const queueData: QueueDepartmentData[] = deptNames.map(name => ({
            department: name,
            nowServing: [],
            waiting: []
        }));

        const getDeptIndex = (tx: any, isWaiting: boolean) => {
            const category = tx.type?.category || "";
            const code = tx.type?.code || "";
            const status = tx.status;
            const additionalData = parseAdditionalData(tx.additionalData);
            const counterName = (additionalData.counterName || "").toUpperCase();

            // If status is UNPAID, they are waiting to pay -> Treasury
            if (isWaiting && status === "UNPAID") {
                return 0; // Treasury index
            }

            // PSA Appointment Endorsements waiting for Treasury counter payment -> Treasury
            const PSA_APPT_CODES = [
                "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
            ];
            if (isWaiting && PSA_APPT_CODES.includes(code) && ["FOR_CLAIM", "FOR_PICKING"].includes(status)) {
                return 2; // Registrar
            }

            // If serving (status: FOR_PROCESSING), determine by counterName or servingDepartment if available
            if (!isWaiting && status === "FOR_PROCESSING") {
                if (additionalData.servingDepartment === "Treasury" || counterName.includes("TREASURY") || counterName.includes("CASHIER")) {
                    return 0; // Treasury
                }
                if (additionalData.servingDepartment === "BPLO" || counterName.includes("BPLO")) {
                    return 1; // BPLO
                }
                if (additionalData.servingDepartment === "Registrar" || counterName.includes("REGISTRAR") || counterName.includes("CIVIL")) {
                    return 2; // Registrar
                }
                if (additionalData?.servingDepartment === "Assessor" || counterName.includes("ASSESSOR")) {
                    return 3; // Assessor
                }
            }

            // Category matching
            if (code === "RPT_CAT1") return 0; // Routine Tax Payment -> Treasury
            if (code === "RPT_CAT2" || code === "RPT_CAT3" || category === "RPT_ASSESSOR" || counterName.includes("ASSESSOR")) return 3; // Assessor
            if (["CEDULA", "Treasurer", "POSO"].includes(category) || code.startsWith("CEDULA") || code.startsWith("POSO")) return 0;
            if (["Business Permit"].includes(category) || code.startsWith("BUSINESS_PERMIT")) return 1;
            if (["Civil Registry"].includes(category) || code.startsWith("LCR_") || code.startsWith("CIVIL_REGISTRY")) return 2;
            if (["Assessor"].includes(category) || code.startsWith("RPT_CAT2") || code.startsWith("RPT_CAT3")) return 3;

            return -1;
        };

        // Today's Date String Helper (Philippine Standard Time YYYY-MM-DD)
        const getPhtDateStr = (dateInput: Date | string | null | undefined): string | null => {
            if (!dateInput) return null;
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return null;
            // Format to YYYY-MM-DD using PHT (Asia/Manila)
            return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        };

        const todayPhtStr = getPhtDateStr(new Date());

        const isTodayTransaction = (tx: any): boolean => {
            const addData = parseAdditionalData(tx.additionalData);

            // Check 1: checkedInAt date match
            const checkedInAtStr = getPhtDateStr(addData.checkedInAt);
            if (checkedInAtStr && checkedInAtStr === todayPhtStr) {
                return true;
            }

            // Check 2: appointmentDate match
            const apptDateStr = getPhtDateStr(tx.appointmentDate);
            if (apptDateStr && apptDateStr === todayPhtStr) {
                return true;
            }

            return false;
        };

        // Partition serving tickets (MUST be today's transaction)
        const servingTxs = allTxs.filter(tx => {
            if (!isTodayTransaction(tx)) return false;

            const category = tx.type?.category || "";
            const code = tx.type?.code || "";
            const additionalData = parseAdditionalData(tx.additionalData);

            const isPsaAppt = [
                "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
            ].includes(code);

            const hasCounter = additionalData &&
                typeof additionalData.counterName === "string" &&
                additionalData.counterName.trim() !== "" &&
                (!isPsaAppt || !["FOR_CLAIM", "FOR_PICKING"].includes(tx.status) || additionalData.servingDepartment === "Registrar");

            if (category === "Business Permit" || code.startsWith("BUSINESS_PERMIT")) {
                const allowedBploServing = ["FOR_INSPECTION", "FOR_CLAIM"];
                return hasCounter && allowedBploServing.includes(tx.status);
            }

            if (tx.status === "FOR_PROCESSING") {
                return hasCounter;
            }

            if (category === "Civil Registry" || code.startsWith("LCR_") || code.startsWith("CIVIL_REGISTRY")) {
                const allowedRegistrarServing = ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_CLAIM", "FOR_PICKING"];
                if (allowedRegistrarServing.includes(tx.status)) {
                    return hasCounter;
                }
            }
            return false;
        });

        for (const tx of servingTxs) {
            const deptIdx = getDeptIndex(tx, false);
            if (deptIdx === -1) continue;

            const deptName = deptNames[deptIdx];
            const additionalData = parseAdditionalData(tx.additionalData);
            const counterName = additionalData.counterName || `${deptName} Counter`;

            let residentName = "N/A";
            if (tx.user?.residentProfile) {
                const profile = tx.user.residentProfile;
                residentName = `${profile.firstName} ${profile.lastName}`;
            } else if (tx.residentSnapshot) {
                const snapshot = typeof tx.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx.residentSnapshot;
                residentName = `${snapshot.firstName || ""} ${snapshot.lastName || ""}`.trim();
            }

            queueData[deptIdx].nowServing.push({
                queueNumber: tx.queueNumber,
                residentName,
                counterName,
                updatedAt: tx.updatedAt.toISOString()
            });
        }

        // Partition waiting tickets (MUST be today's transaction)
        const waitingTxsRaw = allTxs.filter(tx => {
            if (!isTodayTransaction(tx)) return false;

            const additionalData = parseAdditionalData(tx.additionalData);
            const isCheckedIn = Boolean(additionalData.checkedIn === true);
            if (!isCheckedIn) return false;

            const code = tx.type?.code || "";
            const isPsaAppt = [
                "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
            ].includes(code);

            const hasCounter = tx.status !== "UNPAID" && additionalData &&
                typeof additionalData.counterName === "string" &&
                additionalData.counterName.trim() !== "" &&
                (!isPsaAppt || !["FOR_CLAIM", "FOR_PICKING"].includes(tx.status) || additionalData.servingDepartment === "Registrar");

            if (hasCounter) return false;

            const category = tx.type?.category || "";
            if (category === "POSO" || code.startsWith("POSO") || code === "POSO_TRAFFIC_FINE") {
                return ["UNPAID", "FOR_REQUESTING", "FOR_INSPECTION"].includes(tx.status);
            }

            if (category === "Business Permit" || code.startsWith("BUSINESS_PERMIT")) {
                return ["FOR_INSPECTION", "FOR_CLAIM", "UNPAID"].includes(tx.status);
            }

            if (category === "CEDULA" || code.startsWith("CEDULA")) {
                return ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID"].includes(tx.status);
            }

            if (category === "Civil Registry" || code.startsWith("LCR_") || code.startsWith("CIVIL_REGISTRY")) {
                // PSA Appointment Endorsements waiting for Treasury counter payment
                const PSA_APPT_CODES = [
                    "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                    "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                    "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                ];
                if (PSA_APPT_CODES.includes(code)) {
                    return ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID", "FOR_CLAIM", "FOR_PICKING"].includes(tx.status);
                }
                return ["FOR_REQUESTING", "FOR_INSPECTION", "UNPAID"].includes(tx.status);
            }

            if (code === "RPT_CAT2" || code === "RPT_CAT3" || category === "RPT_ASSESSOR") {
                return ["FOR_REQUESTING", "FOR_INSPECTION", "FOR_REINSPECTION", "FOR_PROCESSING"].includes(tx.status);
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
                .slice(0, 8);
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
