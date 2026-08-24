"use server";

// Simple in-memory cache for matched health center per user to reduce DB queries on navigation
const matchedCenterCache = new Map<string, Promise<any> | any>();

let cachedRhuTypeIds: string[] | null = null;
let cachedRhuTypeIdsTimestamp = 0;

async function getRHUTypeIds(): Promise<string[]> {
    const now = Date.now();
    if (cachedRhuTypeIds && cachedRhuTypeIds.length > 0 && now - cachedRhuTypeIdsTimestamp < 300000) {
        return cachedRhuTypeIds;
    }
    try {
        const types: { id: string }[] = await prisma.$queryRaw`
            SELECT id FROM "TransactionType"
            WHERE LOWER(code) LIKE 'rhu_%' 
               OR LOWER(code) LIKE '%rhu%'
               OR LOWER(category) LIKE '%rhu%'
               OR LOWER(category) LIKE '%health%'
               OR LOWER(category) LIKE '%medical%'
               OR LOWER(name) LIKE '%rhu%'
               OR LOWER(name) LIKE '%rural health%'
               OR LOWER(name) LIKE '%medical consultation%'
               OR LOWER(name) LIKE '%health certificate%'
               OR LOWER(name) LIKE '%consultation%'
               OR LOWER(name) LIKE '%checkup%'
               OR LOWER(name) LIKE '%check-up%'
        `;
        cachedRhuTypeIds = types.map(t => t.id);
        cachedRhuTypeIdsTimestamp = now;
        return cachedRhuTypeIds;
    } catch {
        return [];
    }
}

import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
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

    const promise = (async () => {
        const userEmail = (user.email || "").toLowerCase();
        const userName = (user.name || "").toLowerCase();
        const userDept = (user.department || "").toLowerCase();
        const userIdStr = String(user.id);

        const userRole = (user.role || "").toUpperCase();
        // Global admin accounts (rhu@mapandan.gov.ph, admin@mapandan.gov.ph, LGU admin, Municipal Admin) without medical personnel link see all centers
        if (
            userEmail === "rhu@mapandan.gov.ph" ||
            userEmail === "admin@mapandan.gov.ph" ||
            userDept === "lgu" ||
            (userRole === "ADMIN" && (userDept === "lgu" || !userDept))
        ) {
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

        return null;
    })();

    matchedCenterCache.set(cacheKey, promise);
    return promise;
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

        const skip = (page - 1) * limit;

        const isPharmacy = session.user.role === "RHU_PHARMACY" ||
            ((session.user as any).department || "").toUpperCase().includes("PHARMACY");

        const matchedCenter = showAllCenters ? null : await getMatchedCenterForUser(session.user);

        const conditions: Prisma.Sql[] = [];

        // Base condition: Pre-filtered RHU transaction type IDs with indexed lookups
        const rhuTypeIds = await getRHUTypeIds();
        const typeIdCondition = rhuTypeIds.length > 0
            ? Prisma.sql`t."typeId" IN (${Prisma.join(rhuTypeIds)})`
            : Prisma.sql`1=1`;

        conditions.push(Prisma.sql`
            (
                ${typeIdCondition}
                OR (t."additionalData"->>'rhuStatus' IS NOT NULL)
                OR (t."additionalData"->>'checkupType' IS NOT NULL)
                OR (t."additionalData"->>'healthCenterName' IS NOT NULL)
                OR (t."additionalData"->>'healthCenterId' IS NOT NULL)
            )
        `);

        // Health Center condition
        if (matchedCenter) {
            const centerId = matchedCenter.id;
            const centerNameLower = (matchedCenter.name || "").toLowerCase();
            const isLalas = centerNameLower.includes("lalas");
            const isMain = centerNameLower.includes("main");

            conditions.push(Prisma.sql`
                (
                    (t."additionalData"->>'healthCenterId' = ${centerId})
                    OR (LOWER(t."additionalData"->>'healthCenterName') LIKE ${`%${centerNameLower}%`})
                    OR (${centerNameLower} LIKE CONCAT('%', LOWER(t."additionalData"->>'healthCenterName'), '%'))
                    OR (${isLalas} = TRUE AND (
                        LOWER(t."additionalData"->>'healthCenterName') LIKE '%lalas%'
                        OR LOWER(t."additionalData"::text) LIKE '%lalas%'
                        OR (t."additionalData"->>'healthCenterId' IS NULL AND t."additionalData"->>'healthCenterName' IS NULL)
                    ))
                    OR (${isMain} = TRUE AND (
                        LOWER(t."additionalData"->>'healthCenterName') LIKE '%main%'
                        OR LOWER(t."additionalData"::text) LIKE '%main%'
                        OR (t."additionalData"->>'healthCenterId' IS NULL AND t."additionalData"->>'healthCenterName' IS NULL)
                    ))
                )
            `);
        }

        // Pharmacy condition
        if (isPharmacy) {
            conditions.push(Prisma.sql`
                (
                    COALESCE(t."additionalData"->>'rhuStatus', t.status::text) IN ('PRESCRIBED', 'PO_APPROVED', 'COMPLETED')
                    OR t.status::text IN ('FOR_CLAIM', 'RELEASED', 'DELIVERED')
                )
            `);
        }

        // Search condition
        if (search) {
            const searchPattern = `%${search.toLowerCase()}%`;
            conditions.push(Prisma.sql`
                (
                    LOWER(t.id) LIKE ${searchPattern}
                    OR LOWER(t."queueNumber") LIKE ${searchPattern}
                    OR LOWER(u.name) LIKE ${searchPattern}
                    OR LOWER(u.email) LIKE ${searchPattern}
                    OR LOWER(t."residentSnapshot"->>'firstName') LIKE ${searchPattern}
                    OR LOWER(t."residentSnapshot"->>'lastName') LIKE ${searchPattern}
                    OR LOWER(t."residentSnapshot"->>'barangay') LIKE ${searchPattern}
                )
            `);
        }

        // Checkup Type condition
        if (checkupType && checkupType !== "ALL") {
            const checkupLower = `%${checkupType.toLowerCase()}%`;
            conditions.push(Prisma.sql`
                (
                    LOWER(t."additionalData"->>'checkupType') LIKE ${checkupLower}
                    OR ${checkupType.toLowerCase()} LIKE CONCAT('%', LOWER(t."additionalData"->>'checkupType'), '%')
                )
            `);
        }

        // Effective Status Expression
        const effectiveStatusSql = Prisma.sql`
            CASE 
                WHEN t."additionalData"->>'rhuStatus' IS NOT NULL THEN t."additionalData"->>'rhuStatus'
                WHEN t."isCancelled" = TRUE THEN 'CANCELLED'
                WHEN t.status::text IN ('CANCELLED', 'REJECTED') THEN 'CANCELLED'
                WHEN t.status::text IN ('BOOKED', 'FOR_INSPECTION', 'FOR_REQUESTING') THEN 'APPOINTMENT_BOOKED'
                WHEN t.status::text IN ('CHECK_IN', 'EVALUATED') THEN 'CHECK_IN'
                WHEN t.status::text IN ('IN_CONSULTATION', 'FOR_PROCESSING') THEN 'IN_CONSULTATION'
                WHEN t.status::text IN ('PRESCRIBED', 'FOR_CLAIM') THEN 'PRESCRIBED'
                WHEN t.status::text IN ('REFERRED') THEN 'REFERRED'
                WHEN t.status::text IN ('COMPLETED', 'RELEASED', 'DELIVERED') THEN 'COMPLETED'
                ELSE t.status::text
            END
        `;

        // Status condition
        if (status === "CANCELLED") {
            conditions.push(Prisma.sql`
                (${effectiveStatusSql} = 'CANCELLED' OR t."isCancelled" = TRUE OR t.status::text IN ('CANCELLED', 'REJECTED'))
            `);
        } else if (status === "COMPLETED") {
            conditions.push(Prisma.sql`
                (${effectiveStatusSql} = 'COMPLETED')
            `);
        } else if (status && status !== "ALL" && status !== "ALL_WITH_COMPLETED") {
            conditions.push(Prisma.sql`
                (${effectiveStatusSql} = ${status})
            `);
        } else if (status === "ALL" || !status) {
            conditions.push(Prisma.sql`
                (${effectiveStatusSql} NOT IN ('COMPLETED', 'CANCELLED'))
            `);
        }

        const whereClause = conditions.length > 0 
            ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` 
            : Prisma.empty;

        // Count total matching records for pagination - skip redundant joins
        const joinUser = search ? Prisma.sql`LEFT JOIN "User" u ON t."userId" = u.id` : Prisma.empty;
        const countResult: any[] = await prisma.$queryRaw`
            SELECT COUNT(*)::int as count
            FROM "Transaction" t
            ${joinUser}
            ${whereClause}
        `;
        const total = countResult[0]?.count || 0;

        // Fetch the paginated records
        const data: any[] = await prisma.$queryRaw`
            SELECT t.id, t.status, t."createdAt", t."isCancelled", t."totalAmount", t."appointmentDate",
                   t."appointmentSlot", t."queueNumber", t."isPriority", t."additionalData", t."residentSnapshot",
                   t."businessName", t."rejectionRemarks", t."userId",
                   JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'email', u.email) as user,
                   JSON_BUILD_OBJECT('id', tt.id, 'code', tt.code, 'name', tt.name, 'category', tt.category) as type
            FROM "Transaction" t
            LEFT JOIN "User" u ON t."userId" = u.id
            LEFT JOIN "TransactionType" tt ON t."typeId" = tt.id
            ${whereClause}
            ORDER BY t."createdAt" DESC
            LIMIT ${limit}
            OFFSET ${skip}
        `;

        return {
            success: true,
            centerName: matchedCenter ? matchedCenter.name : null,
            data,
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

        const conditions: Prisma.Sql[] = [];

        // Base condition: Pre-filtered RHU transaction type IDs with indexed lookups
        const rhuTypeIds = await getRHUTypeIds();
        const typeIdCondition = rhuTypeIds.length > 0
            ? Prisma.sql`t."typeId" IN (${Prisma.join(rhuTypeIds)})`
            : Prisma.sql`1=1`;

        conditions.push(Prisma.sql`
            (
                ${typeIdCondition}
                OR (t."additionalData"->>'rhuStatus' IS NOT NULL)
                OR (t."additionalData"->>'checkupType' IS NOT NULL)
                OR (t."additionalData"->>'healthCenterName' IS NOT NULL)
                OR (t."additionalData"->>'healthCenterId' IS NOT NULL)
            )
        `);

        // Center matching
        const matchedCenter = await getMatchedCenterForUser(session.user);
        if (matchedCenter) {
            const centerId = matchedCenter.id;
            const centerNameLower = (matchedCenter.name || "").toLowerCase();
            const isLalas = centerNameLower.includes("lalas");
            const isMain = centerNameLower.includes("main");

            conditions.push(Prisma.sql`
                (
                    (t."additionalData"->>'healthCenterId' = ${centerId})
                    OR (LOWER(t."additionalData"->>'healthCenterName') LIKE ${`%${centerNameLower}%`})
                    OR (${centerNameLower} LIKE CONCAT('%', LOWER(t."additionalData"->>'healthCenterName'), '%'))
                    OR (${isLalas} = TRUE AND (
                        LOWER(t."additionalData"->>'healthCenterName') LIKE '%lalas%'
                        OR LOWER(t."additionalData"::text) LIKE '%lalas%'
                        OR (t."additionalData"->>'healthCenterId' IS NULL AND t."additionalData"->>'healthCenterName' IS NULL)
                    ))
                    OR (${isMain} = TRUE AND (
                        LOWER(t."additionalData"->>'healthCenterName') LIKE '%main%'
                        OR LOWER(t."additionalData"::text) LIKE '%main%'
                        OR (t."additionalData"->>'healthCenterId' IS NULL AND t."additionalData"->>'healthCenterName' IS NULL)
                    ))
                )
            `);
        }

        const whereClause = conditions.length > 0 
            ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` 
            : Prisma.empty;

        const statsResult: any[] = await prisma.$queryRaw`
            SELECT 
                COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE t."isCancelled" = TRUE OR t.status::text IN ('CANCELLED', 'REJECTED') OR t."additionalData"->>'rhuStatus' = 'CANCELLED')::int as cancelled,
                COUNT(*) FILTER (WHERE NOT t."isCancelled" AND (t.status::text IN ('BOOKED', 'FOR_INSPECTION', 'FOR_REQUESTING') OR t."additionalData"->>'rhuStatus' = 'APPOINTMENT_BOOKED'))::int as booked,
                COUNT(*) FILTER (WHERE NOT t."isCancelled" AND (t.status::text IN ('CHECK_IN', 'EVALUATED') OR t."additionalData"->>'rhuStatus' = 'CHECK_IN'))::int as "checkedIn",
                COUNT(*) FILTER (WHERE NOT t."isCancelled" AND (t.status::text IN ('IN_CONSULTATION', 'FOR_PROCESSING') OR t."additionalData"->>'rhuStatus' = 'IN_CONSULTATION'))::int as "inConsultation",
                COUNT(*) FILTER (WHERE NOT t."isCancelled" AND (t.status::text IN ('PRESCRIBED', 'FOR_CLAIM') OR t."additionalData"->>'rhuStatus' = 'PRESCRIBED'))::int as prescribed,
                COUNT(*) FILTER (WHERE NOT t."isCancelled" AND (t.status::text = 'REFERRED' OR t."additionalData"->>'rhuStatus' = 'REFERRED'))::int as referred,
                COUNT(*) FILTER (WHERE NOT t."isCancelled" AND (t.status::text IN ('COMPLETED', 'RELEASED', 'DELIVERED') OR t."additionalData"->>'rhuStatus' = 'COMPLETED') AND t.status::text != 'REFERRED')::int as completed
            FROM "Transaction" t
            ${whereClause}
        `;

        const stats = statsResult[0] || { total: 0, booked: 0, checkedIn: 0, inConsultation: 0, prescribed: 0, referred: 0, completed: 0, cancelled: 0 };
        const booked = stats.booked || 0;
        const checkedIn = stats.checkedIn || 0;
        const inConsultation = stats.inConsultation || 0;
        const prescribed = stats.prescribed || 0;

        return {
            success: true,
            centerName: matchedCenter ? matchedCenter.name : null,
            stats: {
                total: stats.total || 0,
                booked,
                checkedIn,
                inConsultation,
                prescribed,
                referred: stats.referred || 0,
                completed: stats.completed || 0,
                cancelled: stats.cancelled || 0,
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
