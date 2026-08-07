"use server";

// Simple in-memory cache for matched health center per user to reduce DB queries on navigation
const matchedCenterCache = new Map<string, any>();

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function getSession() {
    return await getServerSession(authOptions);
}

export async function getMatchedCenterForUser(user: any) {
    if (!user) return null;
    // Use a cache key that uniquely identifies the user (email is typically unique)
    const cacheKey = (user.email || String(user.id)).toLowerCase();
    if (matchedCenterCache.has(cacheKey)) {
        return matchedCenterCache.get(cacheKey);
    }

    const userEmail = (user.email || "").toLowerCase();
    const userName = (user.name || "").toLowerCase();
    const userDept = (user.department || "").toLowerCase();
    const userIdStr = String(user.id);

    // Global admin accounts (rhu@mapandan.gov.ph) without medical personnel link see all centers
    if (userEmail === "rhu@mapandan.gov.ph") {
        return null;
    }

    try {
        const centers: any[] = await prisma.$queryRaw`
            SELECT "id", "name", "code", "barangay", "accountEmail", "userId", "pharmacyEmail", "pharmacyUserId" FROM "RHUHealthCenter"
        `;

        // 1. Direct check in RHUMedicalPersonnel for assigned doctor or medical staff (by userId or email)
        try {
            const personnel: any[] = await prisma.$queryRaw`
                SELECT "healthCenterId" FROM "RHUMedicalPersonnel" 
                WHERE ("userId" = ${userIdStr} OR LOWER("email") = ${userEmail}) 
                  AND "healthCenterId" IS NOT NULL LIMIT 1
            `;
            if (personnel && personnel[0] && personnel[0].healthCenterId) {
                const matched = centers.find((c: any) => c.id === personnel[0].healthCenterId);
                if (matched) return matched;
            }
        } catch {}

        // 2. Priority: keyword matching by email/name on RHUHealthCenter
        const keywordMatch = centers.find((c: any) => {
            const centerNameLower = String(c.name || "").toLowerCase();
            return (
                (c.accountEmail && String(c.accountEmail).toLowerCase() === userEmail) ||
                (c.pharmacyEmail && String(c.pharmacyEmail).toLowerCase() === userEmail) ||
                (userEmail.includes("lalas") && centerNameLower.includes("lalas")) ||
                (userName.includes("lalas") && centerNameLower.includes("lalas")) ||
                (userDept.includes("lalas") && centerNameLower.includes("lalas")) ||
                (userEmail.includes("main") && centerNameLower.includes("main"))
            );
        });

        if (keywordMatch) return keywordMatch;

        // 3. Fallback: userId match on RHUHealthCenter
        const userIdMatch = centers.find((c: any) =>
            (c.userId && String(c.userId) === userIdStr) ||
            (c.pharmacyUserId && String(c.pharmacyUserId) === userIdStr)
        );
        if (userIdMatch) return userIdMatch;

    } catch {}

    // 4. Virtual fallback by email/name keywords
    if (userEmail.includes("lalas") || userName.includes("lalas") || userDept.includes("lalas")) {
        return {
            id: "lalas-medical-clinic",
            name: "Lalas Medical Clinic",
            code: "RHU-LALAS",
            barangay: "Lalas"
        };
    }

    if (userEmail.includes("main") || userName.includes("main") || userDept.includes("main")) {
        return {
            id: "main-rhu",
            name: "Main Rural Health Unit (RHU)",
            code: "RHU-MAIN",
            barangay: "Poblacion"
        };
    }

    // Cache the result before returning
    matchedCenterCache.set(cacheKey, null);
    return null;
}

export async function getRHUAdminTransactions(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    checkupType?: string;
    allCenters?: boolean;
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const status = params?.status || "ALL";
        const checkupType = params?.checkupType || "ALL";
        const showAllCenters = params?.allCenters === true;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const skip = (page - 1) * limit;

        const andConditions: any[] = [];

        // Status Filter
        if (status === "CANCELLED") {
            andConditions.push({ OR: [{ isCancelled: true }, { status: { in: ["CANCELLED", "REJECTED"] as any } }] });
        } else if (status === "APPOINTMENT_BOOKED") {
            andConditions.push({ status: { in: ["BOOKED", "FOR_INSPECTION", "FOR_REQUESTING"] as any } });
        } else if (status === "CHECK_IN") {
            andConditions.push({ status: { in: ["CHECK_IN", "EVALUATED"] as any } });
        } else if (status === "IN_CONSULTATION") {
            andConditions.push({ status: { in: ["IN_CONSULTATION", "FOR_PROCESSING"] as any } });
        } else if (status === "PRESCRIBED") {
            andConditions.push({ status: { in: ["PRESCRIBED", "FOR_CLAIM"] as any } });
        } else if (status === "REFERRED") {
            andConditions.push({ status: { in: ["REFERRED"] as any } });
        } else if (status === "COMPLETED") {
            andConditions.push({
                OR: [
                    { status: { in: ["COMPLETED", "RELEASED", "DELIVERED"] as any } },
                ],
                NOT: { status: { in: ["REFERRED"] as any } }
            });
        } else if (status !== "ALL" && status !== "ALL_WITH_COMPLETED") {
            andConditions.push({ status: status as any });
        }

        // Search Filter (Control Number, User Name, Patient Name, Barangay)
        if (search) {
            andConditions.push({
                OR: [
                    { controlNumber: { contains: search, mode: "insensitive" } },
                    { user: { name: { contains: search, mode: "insensitive" } } },
                    { user: { email: { contains: search, mode: "insensitive" } } },
                    { residentSnapshot: { path: ["firstName"], string_contains: search } },
                    { residentSnapshot: { path: ["lastName"], string_contains: search } },
                    { residentSnapshot: { path: ["barangay"], string_contains: search } },
                ]
            });
        }

        // Fetch all transactions via raw SQL for fast execution and enum safety
        const allTransactions: any[] = await prisma.$queryRaw`
            SELECT t.id, t.status, t."createdAt", t."isCancelled", t."totalAmount", t."appointmentDate",
                   t."appointmentSlot", t."queueNumber", t."isPriority", t."additionalData", t."residentSnapshot",
                   t."businessName", t."rejectionRemarks", t."userId",
                   JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'email', u.email) as user,
                   JSON_BUILD_OBJECT('id', tt.id, 'code', tt.code, 'name', tt.name, 'category', tt.category) as type
            FROM "Transaction" t
            LEFT JOIN "User" u ON t."userId" = u.id
            LEFT JOIN "TransactionType" tt ON t."typeId" = tt.id
            ORDER BY t."createdAt" DESC
            LIMIT 1000
        `;

        // Filter to RHU-only transactions in JS (robust against DB value variance)
        const RHU_KEYWORDS = ["rhu", "rural health", "medical consultation", "health certificate", "consultation", "checkup", "check-up"];
        const transactions = allTransactions.filter((tx: any) => {
            const typeCode = (tx.type?.code || "").toLowerCase();
            const typeCat = (tx.type?.category || "").toLowerCase();
            const typeName = (tx.type?.name || "").toLowerCase();
            let addData: any = {};
            if (typeof tx.additionalData === "string") {
                try { addData = JSON.parse(tx.additionalData); } catch {}
            } else {
                addData = tx.additionalData || {};
            }
            const hasRhuStatus = !!addData.rhuStatus;
            const hasCheckupType = !!addData.checkupType;
            const hasHealthCenter = !!addData.healthCenterName || !!addData.healthCenterId;

            if (hasRhuStatus || hasCheckupType || hasHealthCenter) return true;
            if (typeCode.startsWith("rhu_") || typeCode.includes("rhu")) return true;
            if (typeCat.includes("rhu") || typeCat.includes("health") || typeCat.includes("medical")) return true;
            if (RHU_KEYWORDS.some(kw => typeName.includes(kw))) return true;
            return false;
        });

        // Checkup Type Filter in JS (after RHU filter)
        let filteredByCheckup = transactions;
        if (checkupType && checkupType !== "ALL") {
            const checkupLower = checkupType.toLowerCase();
            filteredByCheckup = transactions.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const ct = (addData.checkupType || "").toLowerCase();
                return ct.includes(checkupLower) || checkupLower.includes(ct) ||
                    (checkupLower.includes("general") && (ct.includes("general") || ct === "general")) ||
                    (checkupLower.includes("marital") && ct.includes("marital")) ||
                    ((checkupLower.includes("prenatal") || checkupLower.includes("maternal")) && (ct.includes("prenatal") || ct.includes("maternal"))) ||
                    (checkupLower.includes("pediatric") && ct.includes("pediatric")) ||
                    (checkupLower.includes("dental") && ct.includes("dental"));
            });
        }

        const isPharmacy = session.user.role === "RHU_PHARMACY" ||
            ((session.user as any).department || "").toUpperCase().includes("PHARMACY");

        const matchedCenter = showAllCenters ? null : await getMatchedCenterForUser(session.user);
        let finalData = filteredByCheckup;



        if (matchedCenter) {
            const centerId = matchedCenter.id;
            const centerNameLower = (matchedCenter.name || "").toLowerCase();

            finalData = filteredByCheckup.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }

                const rawData = JSON.stringify(addData).toLowerCase();
                const txCenterId = String(addData.healthCenterId || "");
                const txCenterName = String(addData.healthCenterName || "").toLowerCase();

                if (txCenterId && txCenterId === centerId) return true;
                if (txCenterName && (txCenterName.includes(centerNameLower) || centerNameLower.includes(txCenterName))) return true;

                if (centerNameLower.includes("lalas")) {
                    if (txCenterName.includes("lalas") || rawData.includes("lalas")) return true;
                    if (!txCenterName && !txCenterId) return true;
                    return false;
                }

                if (centerNameLower.includes("main")) {
                    return txCenterName.includes("main") || rawData.includes("main") || (!txCenterName && !txCenterId);
                }

                return false;
            });
        }

        if (isPharmacy) {
            finalData = finalData.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const rhuStatus = addData?.rhuStatus || tx.status;
                return rhuStatus === "PRESCRIBED" || rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
            });
        }

        // Status Filter Logic (Separate completed records for Ledger vs active Consultations)
        if (status === "COMPLETED") {
            finalData = finalData.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const rhuStatus = (addData?.rhuStatus || "").toUpperCase();
                const txStatus = (tx.status || "").toUpperCase();
                return txStatus === "COMPLETED" || txStatus === "RELEASED" || txStatus === "DELIVERED" || rhuStatus === "COMPLETED";
            });
        } else if (status && status !== "ALL" && status !== "ALL_WITH_COMPLETED") {
            finalData = finalData.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const rhuStatus = addData?.rhuStatus || tx.status;
                return rhuStatus === status || tx.status === status;
            });
        } else if (status === "ALL" || !status) {
            // Exclude COMPLETED consultations from All Consultations page since they display in Consultation Ledger
            finalData = finalData.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const rhuStatus = (addData?.rhuStatus || "").toUpperCase();
                const txStatus = (tx.status || "").toUpperCase();
                const isCompleted = txStatus === "COMPLETED" || txStatus === "RELEASED" || txStatus === "DELIVERED" || rhuStatus === "COMPLETED";
                return !isCompleted;
            });
        }

        const total = finalData.length;
        const paginatedData = finalData.slice((page - 1) * limit, page * limit);

        return {
            success: true,
            centerName: matchedCenter ? matchedCenter.name : null,
            data: paginatedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        };
    } catch (error: any) {
        console.error("getRHUAdminTransactions error:", error);
        return { success: false, error: error.message || "Failed to fetch RHU transactions." };
    }
}

export async function updateRHUAppointmentStatus(
    transactionId: string,
    status: string,
    remarks?: string,
    referralData?: { facility?: string; reason?: string },
    vitalsData?: {
        height?: string;
        weight?: string;
        systolic?: string;
        diastolic?: string;
        temperature?: string;
        pulseRate?: string;
        philhealthNumber?: string;
        konsultationNumber?: string;
        recordedBy?: string;
    },
    deosData?: {
        diagnosis?: string;
        examinationFindings?: string;
        orders?: string;
        status?: string;
        attendingPhysician?: string;
    },
    extraAdditionalData?: Record<string, any>
) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const user = session.user as any;
        const role = user?.role || "";
        const email = (user?.email || "").toLowerCase();

        if (status === "COMPLETED" || status === "RELEASED" || status === "DELIVERED") {
            const isPharmacy = role === "ADMIN" || role === "RHU_ADMIN" || role === "RHU_PHARMACY" || role === "RHU_CENTER_ADMIN" || role === "RHU_DOCTOR" || role === "ADMIN_AIDE" || email.includes("pharmacy");
            if (!isPharmacy) {
                return { success: false, error: "Forbidden: Only Pharmacy personnel can dispense medicine and complete transactions." };
            }
        }

        let existing: any = null;
        try {
            existing = await prisma.transaction.findUnique({
                where: { id: transactionId }
            });
        } catch {
            const raw: any[] = await prisma.$queryRaw`
                SELECT * FROM "Transaction" WHERE "id" = ${transactionId} LIMIT 1
            `;
            existing = raw[0] || null;
        }

        if (!existing) {
            return { success: false, error: "Transaction not found." };
        }

        const isCancelled = status === "CANCELLED" || status === "REJECTED";

        let additionalData: any = {};
        if (existing.additionalData) {
            additionalData = typeof existing.additionalData === "string"
                ? JSON.parse(existing.additionalData)
                : { ...(existing.additionalData as any) };
        }

        additionalData.rhuStatus = status;
        if (extraAdditionalData && typeof extraAdditionalData === "object") {
            additionalData = { ...additionalData, ...extraAdditionalData };
        }

        if (vitalsData) {
            const h = parseFloat(vitalsData.height || "");
            const w = parseFloat(vitalsData.weight || "");
            let calculatedBmi: string | null = null;
            let calculatedCategory: string | null = null;
            if (h > 0 && w > 0) {
                const heightM = h / 100;
                const bmiVal = w / (heightM * heightM);
                calculatedBmi = bmiVal.toFixed(1);
                if (bmiVal < 18.5) calculatedCategory = "Underweight";
                else if (bmiVal <= 24.9) calculatedCategory = "Normal weight";
                else if (bmiVal <= 29.9) calculatedCategory = "Overweight";
                else calculatedCategory = "Obese";
            }

            const encoderStaffName = vitalsData.recordedBy?.trim() || user?.name || user?.email || "Staff Encoder";

            additionalData.vitals = {
                height: vitalsData.height || null,
                weight: vitalsData.weight || null,
                bmi: calculatedBmi,
                bmiCategory: calculatedCategory,
                bloodPressure: (vitalsData.systolic && vitalsData.diastolic)
                    ? `${vitalsData.systolic}/${vitalsData.diastolic}`
                    : null,
                systolic: vitalsData.systolic || null,
                diastolic: vitalsData.diastolic || null,
                temperature: vitalsData.temperature || null,
                pulseRate: vitalsData.pulseRate || null,
                philhealthNumber: vitalsData.philhealthNumber || null,
                konsultationNumber: vitalsData.konsultationNumber || null,
                recordedBy: encoderStaffName,
                recordedByEmail: user?.email || null,
                recordedById: user?.id || null,
            };
            additionalData.checkedInBy = encoderStaffName;
            additionalData.checkedInAt = new Date().toISOString();
        }

        if (deosData) {
            const physicianName = deosData.attendingPhysician?.trim() || user?.name || "Attending Physician";
            additionalData.deos = {
                diagnosis: deosData.diagnosis || null,
                examinationFindings: deosData.examinationFindings || null,
                orders: deosData.orders || null,
                status: deosData.status || null,
                attendingPhysician: physicianName,
                attendingPhysicianEmail: user?.email || null,
                attendingPhysicianId: user?.id || null,
            };
            additionalData.prescribedAt = new Date().toISOString();
        }

        if (referralData) {
            if (referralData.facility) additionalData.referralFacility = referralData.facility;
            if (referralData.reason) additionalData.referralReason = referralData.reason;
            additionalData.referredAt = new Date().toISOString();
        }

        if (status === "COMPLETED" || status === "DISPENSED" || status === "RELEASED") {
            additionalData.dispensedAt = additionalData.dispensedAt || new Date().toISOString();
            const existingDispenseInfo = additionalData.dispenseInfo || {};
            additionalData.dispenseInfo = {
                ...existingDispenseInfo,
                dispensedBy: existingDispenseInfo.dispensedBy || user?.name || user?.email || "RHU Pharmacy Personnel",
                dispensedByEmail: existingDispenseInfo.dispensedByEmail || user?.email || null,
                dispensedByRole: existingDispenseInfo.dispensedByRole || user?.role || "RHU_PHARMACY",
                dispensedAt: existingDispenseInfo.dispensedAt || additionalData.dispensedAt
            };
        }

        const dbStatusMap: Record<string, any> = {
            "APPOINTMENT_BOOKED": "BOOKED",
            "CHECK_IN": "CHECK_IN",
            "IN_CONSULTATION": "IN_CONSULTATION",
            "PRESCRIBED": "PRESCRIBED",
            "PO_APPROVED": "FOR_CLAIM",
            "DISPENSED": "FOR_CLAIM",
            "REFERRED": "REFERRED",
            "COMPLETED": "COMPLETED",
            "CANCELLED": "CANCELLED"
        };
        const targetDbStatus = dbStatusMap[status] || (isCancelled ? "REJECTED" : (status as any));

        let updated: any = null;
        try {
            updated = await prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    status: targetDbStatus,
                    isCancelled,
                    rejectionRemarks: remarks || null,
                    additionalData,
                    updatedAt: new Date()
                }
            });
        } catch (updateErr) {
            console.warn("Prisma model update in updateRHUAppointmentStatus failed, fallback to raw SQL:", updateErr);
            const jsonAddData = typeof additionalData === "string" ? additionalData : JSON.stringify(additionalData);
            await prisma.$executeRaw`
                UPDATE "Transaction"
                SET "status" = ${targetDbStatus}::"TransactionStatus",
                    "isCancelled" = ${isCancelled},
                    "rejectionRemarks" = ${remarks || null},
                    "additionalData" = ${jsonAddData}::jsonb,
                    "updatedAt" = NOW()
                WHERE "id" = ${transactionId}
            `;
            updated = { ...existing, status: targetDbStatus, isCancelled, additionalData };
        }

        revalidatePath("/admin/rhu");
        revalidatePath("/admin/rhu/consultations");
        revalidatePath(`/admin/rhu/${transactionId}`);
        revalidatePath("/user/appointment");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("updateRHUAppointmentStatus error:", error);
        return { success: false, error: error.message || "Failed to update appointment status." };
    }
}

export async function getRHUDashboardStats() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const baseWhere: any = {
            OR: [
                {
                    type: {
                        category: {
                            in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT", "Health Unit", "Health Services"]
                        }
                    }
                },
                { type: { code: { startsWith: "RHU_" } } },
                { type: { name: { contains: "Medical Consultation" } } }
            ]
        };

        const matchedCenter = await getMatchedCenterForUser(session.user);
        if (matchedCenter) {
            const centerId = matchedCenter.id;
            const centerName = matchedCenter.name;
            const centerNameLower = centerName.toLowerCase();

            const centerOrConditions: any[] = [
                { additionalData: { path: ["healthCenterId"], equals: centerId } },
                { additionalData: { path: ["healthCenterName"], equals: centerName } },
                { additionalData: { path: ["healthCenterName"], string_contains: centerName } }
            ];

            if (centerNameLower.includes("lalas")) {
                centerOrConditions.push(
                    { additionalData: { path: ["healthCenterName"], string_contains: "Lalas" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "lalas" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "LALAS" } }
                );
            } else if (centerNameLower.includes("main") || centerNameLower.includes("community")) {
                centerOrConditions.push(
                    { additionalData: { path: ["healthCenterName"], string_contains: "Main" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "main" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "MAIN" } },
                    { additionalData: { path: ["healthCenterName"], string_contains: "Community" } }
                );
            }

            baseWhere.AND = [
                {
                    OR: centerOrConditions
                }
            ];
        }

        const [total, booked, checkedIn, inConsultation, prescribed, referred, completed, cancelled] = await Promise.all([
            prisma.transaction.count({ where: baseWhere }),
            prisma.transaction.count({
                where: {
                    ...baseWhere, isCancelled: false,
                    status: { in: ["BOOKED", "FOR_INSPECTION", "FOR_REQUESTING"] as any }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere, isCancelled: false,
                    status: { in: ["CHECK_IN", "EVALUATED"] as any }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere, isCancelled: false,
                    status: { in: ["IN_CONSULTATION", "FOR_PROCESSING"] as any }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere, isCancelled: false,
                    status: { in: ["PRESCRIBED", "FOR_CLAIM"] as any }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere, isCancelled: false,
                    status: { in: ["REFERRED"] as any }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere, isCancelled: false,
                    status: { in: ["COMPLETED", "RELEASED", "DELIVERED"] as any },
                    NOT: { status: { in: ["REFERRED"] as any } }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseWhere,
                    OR: [
                        { isCancelled: true },
                        { status: { in: ["CANCELLED", "REJECTED"] as any } }
                    ]
                }
            })
        ]);

        return {
            success: true,
            centerName: matchedCenter ? matchedCenter.name : null,
            stats: {
                total,
                booked,
                checkedIn,
                inConsultation,
                prescribed,
                referred,
                completed,
                cancelled,
                pending: booked + checkedIn,
                confirmed: inConsultation + prescribed
            }
        };
    } catch (error: any) {
        console.error("getRHUDashboardStats error:", error);
        return { success: false, error: error.message || "Failed to fetch stats." };
    }
}

export async function getRHUPurchaseOrders({
    page = 1,
    limit = 10,
    search = "",
    status = "ALL"
}: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
} = {}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const res = await getRHUAdminTransactions({
            page: 1,
            limit: 1000,
            search,
            status: "ALL_WITH_COMPLETED"
        });

        if (!res.success || !res.data) {
            return { success: false, error: res.error || "Failed to fetch purchase orders." };
        }

        let poList = res.data.filter((tx: any) => {
            let addData: any = {};
            if (typeof tx.additionalData === "string") {
                try { addData = JSON.parse(tx.additionalData); } catch {}
            } else {
                addData = tx.additionalData || {};
            }

            const hasDeos = !!addData.deos;
            const rhuStatus = (addData.rhuStatus || "").toUpperCase();
            const txStatus = (tx.status || "").toUpperCase();

            return hasDeos || 
                rhuStatus === "PRESCRIBED" || 
                rhuStatus === "PO_APPROVED" || 
                rhuStatus === "DISPENSED" || 
                rhuStatus === "COMPLETED" || 
                txStatus === "FOR_CLAIM" || 
                txStatus === "RELEASED" || 
                txStatus === "DELIVERED";
        });

        if (status && status !== "ALL") {
            const statusUpper = status.toUpperCase();
            poList = poList.filter((tx: any) => {
                let addData: any = {};
                if (typeof tx.additionalData === "string") {
                    try { addData = JSON.parse(tx.additionalData); } catch {}
                } else {
                    addData = tx.additionalData || {};
                }
                const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                return rhuStatus === statusUpper || tx.status === statusUpper;
            });
        }

        const total = poList.length;
        const paginated = poList.slice((page - 1) * limit, page * limit);

        return {
            success: true,
            centerName: res.centerName,
            staffName: session?.user?.name || "RHU Pharmacy Staff",
            staffEmail: session?.user?.email || null,
            data: paginated,
            allData: poList,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit))
            }
        };
    } catch (error: any) {
        console.error("getRHUPurchaseOrders error:", error);
        return { success: false, error: error.message || "Failed to fetch purchase orders." };
    }
}

export async function getRHUHealthCenters() {
    try {
        const centers: any[] = await prisma.$queryRaw`
            SELECT "id", "name", "code", "location", "barangay", "contactNumber", "status"
            FROM "RHUHealthCenter"
            WHERE "status" = 'ACTIVE'
            ORDER BY "name" ASC
        `;
        return {
            success: true,
            data: centers.map((c: any) => ({
                id: c.id,
                name: c.name,
                code: c.code || null,
                location: c.location || null,
                barangay: c.barangay || null,
                contactNumber: c.contactNumber || null,
            }))
        };
    } catch (error: any) {
        console.error("getRHUHealthCenters error:", error);
        return { success: false, error: error.message || "Failed to fetch health centers.", data: [] };
    }
}
