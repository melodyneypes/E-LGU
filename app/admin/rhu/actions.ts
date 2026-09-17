"use server";

import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateQueueNumber } from "@/lib/queue";

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

async function getSession() {
    return await getServerSession(authOptions);
}

export async function clearMatchedCenterCache(emailOrUserId?: string) {
    if (emailOrUserId) {
        matchedCenterCache.delete(emailOrUserId.toLowerCase());
    } else {
        matchedCenterCache.clear();
    }
}

export async function getMatchedCenterForUser(user: any) {
    if (!user) return null;
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
        const assignedDoctorId = user.assignedDoctorId ? String(user.assignedDoctorId) : null;
        // Global admin accounts (rhu@mapandan.gov.ph, admin@mapandan.gov.ph, LGU admin) without medical personnel link see all centers
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

            // 1. Direct check in RHUMedicalPersonnel for assigned doctor or medical staff (by userId, email, accountEmail, or assigned doctor)
            try {
                let personnel: any[] = [];
                if (assignedDoctorId) {
                    personnel = await prisma.$queryRaw`
                        SELECT "healthCenterId" FROM "RHUMedicalPersonnel" 
                        WHERE ("userId" = ${userIdStr} 
                           OR LOWER("email") = ${userEmail} 
                           OR LOWER("accountEmail") = ${userEmail}
                           OR "userId" = ${assignedDoctorId}) 
                          AND "healthCenterId" IS NOT NULL LIMIT 1
                    `;
                } else {
                    personnel = await prisma.$queryRaw`
                        SELECT "healthCenterId" FROM "RHUMedicalPersonnel" 
                        WHERE ("userId" = ${userIdStr} 
                           OR LOWER("email") = ${userEmail} 
                           OR LOWER("accountEmail") = ${userEmail}) 
                          AND "healthCenterId" IS NOT NULL LIMIT 1
                    `;
                }
                if (personnel && personnel[0] && personnel[0].healthCenterId) {
                    const matched = centers.find((c: any) => c.id === personnel[0].healthCenterId);
                    if (matched) return matched;
                }
            } catch (err) {
                console.error("Error matching center for user via personnel:", err);
            }

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

            // 3. Fallback: userId match on RHUHealthCenter (including assigned doctor)
            const userIdMatch = centers.find((c: any) =>
                (c.userId && String(c.userId) === userIdStr) ||
                (assignedDoctorId && c.userId && String(c.userId) === assignedDoctorId) ||
                (c.pharmacyUserId && String(c.pharmacyUserId) === userIdStr)
            );
            if (userIdMatch) return userIdMatch;

            // 4. If user has an assignedDoctorId (e.g. Secretary), check doctor's user account email
            if (assignedDoctorId) {
                try {
                    const docUser: any[] = await prisma.$queryRaw`
                        SELECT "email" FROM "User" WHERE "id" = ${assignedDoctorId} LIMIT 1
                    `;
                    if (docUser && docUser[0]?.email) {
                        const docEmail = String(docUser[0].email).toLowerCase();
                        const docPersonnel: any[] = await prisma.$queryRaw`
                            SELECT "healthCenterId" FROM "RHUMedicalPersonnel"
                            WHERE ("userId" = ${assignedDoctorId} OR LOWER("email") = ${docEmail} OR LOWER("accountEmail") = ${docEmail})
                              AND "healthCenterId" IS NOT NULL LIMIT 1
                        `;
                        if (docPersonnel && docPersonnel[0]?.healthCenterId) {
                            const matched = centers.find((c: any) => c.id === docPersonnel[0].healthCenterId);
                            if (matched) return matched;
                        }
                    }
                } catch {}
            }

        } catch (err) {
            console.error("Error in getMatchedCenterForUser:", err);
        }

        // 5. Virtual fallback by email/name keywords
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

    const res = await promise;
    if (res) {
        matchedCenterCache.set(cacheKey, res);
    }
    return res;
}

export async function getRHUAdminTransactions(params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    checkupType?: string;
    allCenters?: boolean;
    dateFrom?: string;
    dateTo?: string;
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
        const dateFrom = params?.dateFrom;
        const dateTo = params?.dateTo;

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

        // Date Range condition
        if (dateFrom) {
            const start = new Date(dateFrom);
            start.setHours(0, 0, 0, 0);
            conditions.push(Prisma.sql`t."appointmentDate" >= ${start}`);
        }

        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            conditions.push(Prisma.sql`t."appointmentDate" <= ${end}`);
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

        if (status === "CHECK_IN") {
            const canCheckIn = role === "ASST_SEC" || role === "ADMIN" || role === "RHU_ADMIN";
            if (!canCheckIn) {
                return {
                    success: false,
                    error: "Forbidden: Only Assistant Secretary accounts are authorized to check in patients and record vital signs. Doctors and clinical staff cannot check in patients or record vitals."
                };
            }
        }

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
            // Guard: Vitals are immutable once recorded at check-in
            if (additionalData.vitals && existing.checkedIn) {
                return {
                    success: false,
                    error: "Patient vital signs have already been officially recorded at check-in and cannot be updated."
                };
            }

            // Guard: Only Assistant Secretary accounts (and overall admins) can input vitals
            if (role !== "ASST_SEC" && role !== "ADMIN" && role !== "RHU_ADMIN") {
                return {
                    success: false,
                    error: "Forbidden: Only Assistant Secretary accounts are authorized to input patient triage vital signs. Doctors and clinical staff cannot record vitals."
                };
            }

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
            // Guard: Assistant Secretary accounts are blocked from issuing clinical diagnoses or physician orders
            if (role === "ASST_SEC") {
                return {
                    success: false,
                    error: "Forbidden: Assistant Secretary accounts are not authorized to issue clinical diagnoses, prescriptions, or physician orders. Must be signed off by a licensed physician."
                };
            }

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

            // If this transaction originated from a scheduled return visit / follow-up, mark the follow-up as Completed
            try {
                if (additionalData.followUpAppointmentId) {
                    await prisma.$executeRaw`
                        UPDATE follow_up_appointments
                        SET status = 'Completed', updated_at = NOW()
                        WHERE id = ${additionalData.followUpAppointmentId}
                    `;
                }
                await prisma.$executeRaw`
                    UPDATE follow_up_appointments
                    SET status = 'Completed', updated_at = NOW()
                    WHERE injected_transaction_id = ${transactionId}
                `;
            } catch (fuErr) {
                console.warn("Could not mark follow-up appointment as completed:", fuErr);
            }
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

export async function registerRHUWalkInConsultation(payload: {
    residentId?: string;
    userId?: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    suffix?: string;
    gender?: string;
    dateOfBirth?: string;
    age?: number | string;
    civilStatus?: string;
    contactNumber?: string;
    email?: string;
    houseNumber?: string;
    street?: string;
    barangay: string;
    municipality?: string;
    province?: string;
    philhealthNumber?: string;
    healthCenterId?: string;
    checkupType: string;
    chiefComplaint?: string;
    isPriorityLane?: boolean;
    priorityReason?: string;
    followUpAppointmentId?: string;
    sourceTransactionId?: string;
    isFollowUp?: boolean;
    vitals?: {
        height?: string;
        weight?: string;
        systolic?: string;
        diastolic?: string;
        temperature?: string;
        pulseRate?: string;
        recordedBy?: string;
    };
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized: Please log in." };
        }

        const user = session.user as any;
        const role = user?.role || "";

        // If linking to a scheduled follow-up appointment, ensure its scheduled date has arrived
        if (payload.followUpAppointmentId) {
            const fuCheck: any[] = await prisma.$queryRaw`
                SELECT id, scheduled_date FROM follow_up_appointments WHERE id = ${payload.followUpAppointmentId} LIMIT 1
            `;
            if (fuCheck && fuCheck[0]) {
                const manilaDateString = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Asia/Manila",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                }).format(new Date());
                const [mMonth, mDay, mYear] = manilaDateString.split("/");
                const endOfToday = new Date(`${mYear}-${mMonth}-${mDay}T23:59:59.999+08:00`);
                if (new Date(fuCheck[0].scheduled_date) > endOfToday) {
                    const formattedDate = new Date(fuCheck[0].scheduled_date).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                    });
                    return {
                        success: false,
                        error: `Cannot check in patient before scheduled date. This follow-up visit is scheduled for ${formattedDate}.`
                    };
                }
            }
        }

        const matchedCenter = await getMatchedCenterForUser(user);

        // 1. Resolve target Health Center
        let targetCenterId = payload.healthCenterId || (matchedCenter ? matchedCenter.id : null);
        let targetCenterName = matchedCenter ? matchedCenter.name : "Main Rural Health Unit (RHU)";

        if (payload.healthCenterId) {
            try {
                const centerRow: any[] = await prisma.$queryRaw`
                    SELECT "id", "name" FROM "RHUHealthCenter" WHERE "id" = ${payload.healthCenterId} LIMIT 1
                `;
                if (centerRow && centerRow[0]) {
                    targetCenterId = centerRow[0].id;
                    targetCenterName = centerRow[0].name;
                }
            } catch {}
        }

        // 2. Resolve TransactionType for RHU
        let txType = await prisma.transactionType.findFirst({
            where: {
                OR: [
                    { category: "Rural Health Unit" },
                    { code: "rhu_consultation_v1" },
                    { code: { startsWith: "rhu_" } },
                    { name: { contains: "Consultation", mode: "insensitive" } }
                ]
            }
        });

        if (!txType) {
            txType = await prisma.transactionType.findFirst();
        }

        if (!txType) {
            return { success: false, error: "No active RHU transaction type found in system." };
        }

        // 3. Resolve user linkage if resident is registered
        let linkedUserId: string | null = null;
        if (payload.userId) {
            linkedUserId = payload.userId;
        } else if (payload.residentId) {
            const resRecord = await prisma.resident.findUnique({
                where: { id: payload.residentId },
                select: { userId: true }
            });
            if (resRecord?.userId) {
                linkedUserId = resRecord.userId;
            }
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentSlot = currentHour < 12 ? "08:00 AM - 11:00 AM" : "01:00 PM - 04:00 PM";
        const isPriority = Boolean(payload.isPriorityLane);

        // 4. Generate RHU queue number
        const queueNumber = await generateQueueNumber({
            source: "kiosk",
            isPriority,
            appointmentDate: now,
            appointmentSlot: currentSlot,
            category: "RHU"
        });

        // 5. Calculate BMI if height & weight provided
        let calculatedBmi: string | null = null;
        let calculatedCategory: string | null = null;
        if (payload.vitals?.height && payload.vitals?.weight) {
            const h = parseFloat(payload.vitals.height);
            const w = parseFloat(payload.vitals.weight);
            if (h > 0 && w > 0) {
                const heightM = h / 100;
                const bmiVal = w / (heightM * heightM);
                calculatedBmi = bmiVal.toFixed(1);
                if (bmiVal < 18.5) calculatedCategory = "Underweight";
                else if (bmiVal <= 24.9) calculatedCategory = "Normal weight";
                else if (bmiVal <= 29.9) calculatedCategory = "Overweight";
                else calculatedCategory = "Obese";
            }
        }

        const staffName = user.name || user.email || "RHU Triage Staff";

        const residentSnapshot = {
            firstName: payload.firstName.trim(),
            middleName: payload.middleName?.trim() || "",
            lastName: payload.lastName.trim(),
            suffix: payload.suffix?.trim() || "",
            gender: payload.gender || "UNSPECIFIED",
            dateOfBirth: payload.dateOfBirth || null,
            age: payload.age ? Number(payload.age) : null,
            civilStatus: payload.civilStatus || "Single",
            contactNumber: payload.contactNumber?.trim() || "",
            email: payload.email?.trim() || "",
            houseNumber: payload.houseNumber?.trim() || "",
            street: payload.street?.trim() || "",
            barangay: payload.barangay?.trim() || "Poblacion",
            municipality: payload.municipality?.trim() || "Mapandan",
            province: payload.province?.trim() || "Pangasinan",
            philhealthNumber: payload.philhealthNumber?.trim() || "",
        };

        const isFollowUpConsultation = Boolean(
            payload.isFollowUp || 
            payload.followUpAppointmentId || 
            payload.checkupType?.toLowerCase().includes("follow") || 
            payload.checkupType?.toLowerCase().includes("return")
        );

        let sourceTxAddData: any = {};
        if (payload.sourceTransactionId) {
            try {
                const stx = await prisma.transaction.findUnique({ where: { id: payload.sourceTransactionId } });
                if (stx?.additionalData) {
                    sourceTxAddData = typeof stx.additionalData === "string" ? JSON.parse(stx.additionalData) : stx.additionalData;
                }
            } catch {}
        }
        const followUpSequence = isFollowUpConsultation ? ((Number(sourceTxAddData?.followUpSequence) || 0) + 1) : null;

        const hasVitals = Boolean(payload.vitals && (payload.vitals.height || payload.vitals.weight || payload.vitals.systolic || payload.vitals.temperature));

        const additionalData: any = {
            checkupType: payload.checkupType || (isFollowUpConsultation ? "Return Patient / Follow-up" : "General Consultation"),
            healthCenterId: targetCenterId,
            healthCenterName: targetCenterName,
            chiefComplaint: payload.chiefComplaint?.trim() || "",
            isWalkIn: true,
            isFollowUp: isFollowUpConsultation,
            returnPatient: isFollowUpConsultation,
            followUpSequence,
            followUpAppointmentId: payload.followUpAppointmentId || null,
            sourceTransactionId: payload.sourceTransactionId || null,
            previousTransactionId: payload.sourceTransactionId || null,
            isPriorityLane: isPriority,
            priorityReason: payload.priorityReason || null,
            rhuStatus: hasVitals ? "CHECK_IN" : "APPOINTMENT_BOOKED",
            checkedIn: hasVitals,
            checkedInBy: hasVitals ? staffName : null,
            checkedInAt: hasVitals ? now.toISOString() : null,
            registeredBy: staffName,
            registeredByEmail: user.email || null,
            registeredAt: now.toISOString(),
        };

        if (payload.vitals) {
            // Guard: Only Assistant Secretary accounts (and overall admins) can encode initial vitals
            if (role !== "ASST_SEC" && role !== "ADMIN" && role !== "RHU_ADMIN") {
                delete payload.vitals;
            }
        }

        if (payload.vitals) {
            additionalData.vitals = {
                height: payload.vitals.height || null,
                weight: payload.vitals.weight || null,
                bmi: calculatedBmi,
                bmiCategory: calculatedCategory,
                bloodPressure: (payload.vitals.systolic && payload.vitals.diastolic)
                    ? `${payload.vitals.systolic}/${payload.vitals.diastolic}`
                    : null,
                systolic: payload.vitals.systolic || null,
                diastolic: payload.vitals.diastolic || null,
                temperature: payload.vitals.temperature || null,
                pulseRate: payload.vitals.pulseRate || null,
                philhealthNumber: payload.philhealthNumber || null,
                recordedBy: payload.vitals.recordedBy || staffName,
                recordedByEmail: user.email || null,
                recordedById: user.id || null,
            };
        }

        // 6. Create Transaction
        const newTransaction = await prisma.transaction.create({
            data: {
                userId: linkedUserId,
                typeId: txType.id,
                status: "FOR_INSPECTION", // Mapped to APPOINTMENT_BOOKED or CHECK_IN based on rhuStatus & vitals
                residentSnapshot,
                additionalData,
                totalAmount: 0,
                appointmentDate: now,
                appointmentSlot: currentSlot,
                queueNumber,
                isPriority,
            }
        });

        // If this walk-in fulfilled a pending follow-up appointment, link the injected transaction
        if (payload.followUpAppointmentId) {
            try {
                await prisma.$executeRaw`
                    UPDATE follow_up_appointments
                    SET injected_transaction_id = ${newTransaction.id}, updated_at = NOW()
                    WHERE id = ${payload.followUpAppointmentId}
                `;
            } catch (fuErr) {
                console.warn("Could not link followUpAppointment to walk-in transaction:", fuErr);
            }
        }

        revalidatePath("/admin/rhu");
        revalidatePath("/admin/rhu/consultations");
        revalidatePath("/admin/rhu/queue");
        revalidatePath("/admin/rhu/ledger");

        return {
            success: true,
            data: {
                id: newTransaction.id,
                queueNumber,
                patientName: `${payload.firstName} ${payload.lastName}`,
                centerName: targetCenterName,
                checkupType: payload.checkupType,
                appointmentSlot: currentSlot,
                isPriority
            }
        };
    } catch (error: any) {
        console.error("registerRHUWalkInConsultation error:", error);
        return { success: false, error: error.message || "Failed to register walk-in patient." };
    }
}

export async function getRHUCheckedInVitalsCount() {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, count: 0 };
        }

        const user = session.user as any;
        const matchedCenter = await getMatchedCenterForUser(user);

        const rhuTypeIds = await getRHUTypeIds();
        const typeIdCondition = rhuTypeIds.length > 0
            ? Prisma.sql`t."typeId" IN (${Prisma.join(rhuTypeIds)})`
            : Prisma.sql`1=1`;

        const conditions: Prisma.Sql[] = [
            Prisma.sql`
                (
                    ${typeIdCondition}
                    OR (t."additionalData"->>'rhuStatus' IS NOT NULL)
                    OR (t."additionalData"->>'checkupType' IS NOT NULL)
                    OR (t."additionalData"->>'healthCenterName' IS NOT NULL)
                    OR (t."additionalData"->>'healthCenterId' IS NOT NULL)
                )
            `,
            Prisma.sql`t."isCancelled" = FALSE`,
            Prisma.sql`t.status::text NOT IN ('CANCELLED', 'REJECTED')`,
            Prisma.sql`
                (
                    t."additionalData"->>'rhuStatus' = 'CHECK_IN'
                    OR (
                        t."additionalData"->>'rhuStatus' IS NULL
                        AND t.status::text IN ('CHECK_IN', 'EVALUATED')
                    )
                )
            `,
            Prisma.sql`
                (
                    t."additionalData"->'vitals' IS NOT NULL
                    OR t."additionalData"->>'checkedInBy' IS NOT NULL
                )
            `
        ];

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

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
        const result: any[] = await prisma.$queryRaw`
            SELECT COUNT(*)::int as count
            FROM "Transaction" t
            ${whereClause}
        `;

        const count = Number(result?.[0]?.count || 0);
        return { success: true, count };
    } catch (error) {
        console.error("[getRHUCheckedInVitalsCount] Error:", error);
        return { success: false, count: 0 };
    }
}

// ---------------------------------------------------------------------------
// RHU FOLLOW-UP CONSULTATION & AUTOMATED QUEUE INJECTION ACTIONS
// ---------------------------------------------------------------------------

export async function scheduleRHUFollowUp(payload: {
    patientId: string;
    patientName: string;
    doctorId?: string;
    doctorName?: string;
    healthCenterId?: string;
    healthCenterName?: string;
    scheduledDate: string | Date;
    notes?: string;
    sourceTransactionId?: string;
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const scheduledDateObj = new Date(payload.scheduledDate);
        if (isNaN(scheduledDateObj.getTime())) {
            return { success: false, error: "Invalid scheduled date for follow-up." };
        }

        const id = `fu_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const patientId = payload.patientId || "WALK_IN_PATIENT";
        const patientName = payload.patientName || "PATIENT";
        const doctorId = payload.doctorId || (session.user as any)?.id || null;
        const doctorName = payload.doctorName || (session.user as any)?.name || "Attending Physician";
        const notes = payload.notes?.trim() || null;
        const healthCenterId = payload.healthCenterId || null;
        const healthCenterName = payload.healthCenterName || null;
        const sourceTxId = payload.sourceTransactionId || null;

        await prisma.$executeRaw`
            INSERT INTO follow_up_appointments (
                id, patient_id, patient_name, doctor_id, doctor_name, 
                health_center_id, health_center_name, scheduled_date, 
                status, notes, source_transaction_id, created_at, updated_at
            ) VALUES (
                ${id}, ${patientId}, ${patientName}, ${doctorId}, ${doctorName},
                ${healthCenterId}, ${healthCenterName}, ${scheduledDateObj},
                'Pending', ${notes}, ${sourceTxId}, NOW(), NOW()
            )
        `;

        if (sourceTxId) {
            try {
                const tx = await prisma.transaction.findUnique({ where: { id: sourceTxId } });
                if (tx) {
                    const additionalData = (tx.additionalData as any) || {};
                    additionalData.followUpScheduled = {
                        followUpId: id,
                        scheduledDate: scheduledDateObj.toISOString(),
                        notes,
                        doctorName,
                        scheduledAt: new Date().toISOString()
                    };
                    await prisma.transaction.update({
                        where: { id: sourceTxId },
                        data: { additionalData, updatedAt: new Date() }
                    });
                }
            } catch (err) {
                console.warn("Could not attach followUpScheduled to source transaction:", err);
            }
        }

        try {
            revalidatePath("/admin/rhu");
            revalidatePath("/admin/rhu/consultations");
            revalidatePath("/admin/rhu/follow-ups");
            if (sourceTxId) revalidatePath(`/admin/rhu/${sourceTxId}`);
        } catch {}

        return { success: true, followUpId: id };
    } catch (error: any) {
        console.error("Failed to schedule follow-up:", error);
        return { success: false, error: error.message || "Failed to schedule follow-up." };
    }
}

export async function getRHUFollowUpAppointments(filters?: {
    status?: string;
    search?: string;
    dateFilter?: string;
    healthCenterId?: string;
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const conditions: Prisma.Sql[] = [Prisma.sql`1=1`];

        if (filters?.status && filters.status !== "ALL") {
            conditions.push(Prisma.sql`fa.status = ${filters.status}`);
        }

        if (filters?.healthCenterId) {
            conditions.push(Prisma.sql`fa.health_center_id = ${filters.healthCenterId}`);
        }

        if (filters?.search && filters.search.trim()) {
            const term = `%${filters.search.trim().toLowerCase()}%`;
            conditions.push(Prisma.sql`(
                LOWER(fa.patient_name) LIKE ${term}
                OR LOWER(fa.doctor_name) LIKE ${term}
                OR LOWER(fa.notes) LIKE ${term}
            )`);
        }

        if (filters?.dateFilter === "today") {
            const manilaDateString = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }).format(new Date());
            const [month, day, year] = manilaDateString.split("/");
            const startOfToday = new Date(`${year}-${month}-${day}T00:00:00.000+08:00`);
            const endOfToday = new Date(`${year}-${month}-${day}T23:59:59.999+08:00`);
            conditions.push(Prisma.sql`fa.scheduled_date >= ${startOfToday} AND fa.scheduled_date <= ${endOfToday}`);
        } else if (filters?.dateFilter === "upcoming") {
            const now = new Date();
            conditions.push(Prisma.sql`fa.scheduled_date >= ${now}`);
        } else if (filters?.dateFilter === "past") {
            const now = new Date();
            conditions.push(Prisma.sql`fa.scheduled_date < ${now}`);
        }

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
        const appointments: any[] = await prisma.$queryRaw`
            SELECT 
                fa.id,
                fa.patient_id as "patientId",
                fa.patient_name as "patientName",
                fa.doctor_id as "doctorId",
                fa.doctor_name as "doctorName",
                fa.health_center_id as "healthCenterId",
                fa.health_center_name as "healthCenterName",
                fa.scheduled_date as "scheduledDate",
                fa.status,
                fa.notes,
                fa.source_transaction_id as "sourceTransactionId",
                fa.injected_transaction_id as "injectedTransactionId",
                fa.created_at as "createdAt",
                fa.updated_at as "updatedAt",
                t.status as "injectedStatus",
                t."additionalData"->>'rhuStatus' as "injectedRhuStatus",
                t."additionalData"->>'dispensedAt' as "injectedDispensedAt",
                t."queueNumber" as "injectedQueueNumber"
            FROM follow_up_appointments fa
            LEFT JOIN "Transaction" t ON fa.injected_transaction_id = t.id
            ${whereClause}
            ORDER BY fa.scheduled_date ASC
        `;

        return { success: true, data: appointments };
    } catch (error: any) {
        console.error("getRHUFollowUpAppointments error:", error);
        return { success: false, error: error.message || "Failed to fetch follow-up appointments." };
    }
}

export async function injectDailyFollowUpQueue() {
    try {
        const manilaFormatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const [month, day, year] = manilaFormatter.format(new Date()).split("/");
        const startOfToday = new Date(`${year}-${month}-${day}T00:00:00.000+08:00`);
        const endOfToday = new Date(`${year}-${month}-${day}T23:59:59.999+08:00`);

        // 1. Automatically mark past unfulfilled pending appointments as "Missed"
        await prisma.$executeRaw`
            UPDATE follow_up_appointments
            SET status = 'Missed', updated_at = NOW()
            WHERE status = 'Pending' AND scheduled_date < ${startOfToday}
        `;

        // 2. Fetch all pending follow-ups for CURRENT_DATE
        const todaysFollowUps: any[] = await prisma.$queryRaw`
            SELECT 
                id,
                patient_id,
                patient_name,
                doctor_id,
                doctor_name,
                health_center_id,
                health_center_name,
                scheduled_date,
                status,
                notes,
                source_transaction_id,
                injected_transaction_id
            FROM follow_up_appointments
            WHERE status = 'Pending'
              AND scheduled_date >= ${startOfToday}
              AND scheduled_date <= ${endOfToday}
            ORDER BY scheduled_date ASC
        `;

        if (todaysFollowUps.length === 0) {
            return { 
                success: true, 
                processed: 0, 
                injected: 0, 
                message: "No pending return visits scheduled for today." 
            };
        }

        // 3. Resolve RHU TransactionType
        let rhuType = await prisma.transactionType.findFirst({
            where: {
                OR: [
                    { code: "RHU_CONSULTATION" },
                    { code: { startsWith: "RHU" } },
                    { category: { in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH"] } }
                ]
            }
        });

        if (!rhuType) {
            rhuType = await prisma.transactionType.findFirst();
        }

        if (!rhuType) {
            return { success: false, error: "Unable to find RHU Consultation transaction type in database." };
        }

        let injectedCount = 0;
        const now = new Date();

        for (const fu of todaysFollowUps) {
            // Check idempotency: If already injected, verify transaction exists
            if (fu.injected_transaction_id) {
                const existingTx = await prisma.transaction.findUnique({
                    where: { id: fu.injected_transaction_id }
                });
                if (existingTx && !existingTx.isCancelled) {
                    continue;
                }
            }

            // Also verify no other active queue transaction exists today for this follow-up
            const duplicateCheck = await prisma.transaction.findFirst({
                where: {
                    appointmentDate: { gte: startOfToday, lte: endOfToday },
                    status: { in: ["FOR_INSPECTION", "IN_CONSULTATION", "PRESCRIBED", "CHECK_IN", "FOR_PROCESSING"] },
                    isCancelled: false,
                    additionalData: {
                        path: ["followUpAppointmentId"],
                        equals: fu.id
                    }
                }
            });
            if (duplicateCheck) {
                continue;
            }

            // Retrieve snapshot from source transaction or construct fallback
            let residentSnapshot: any = {
                firstName: fu.patient_name?.split(" ")[0] || "Return",
                lastName: fu.patient_name?.split(" ").slice(1).join(" ") || "Patient",
                middleName: "",
                gender: "UNSPECIFIED",
                barangay: "Poblacion",
                municipality: "Mapandan",
                province: "Pangasinan"
            };

            let userId: string | null = null;
            if (fu.source_transaction_id) {
                const sourceTx = await prisma.transaction.findUnique({
                    where: { id: fu.source_transaction_id }
                });
                if (sourceTx) {
                    if (sourceTx.residentSnapshot) {
                        residentSnapshot = typeof sourceTx.residentSnapshot === "string"
                            ? JSON.parse(sourceTx.residentSnapshot)
                            : sourceTx.residentSnapshot;
                    }
                    userId = sourceTx.userId || null;
                }
            }

            if (!userId && fu.patient_id && !fu.patient_id.startsWith("WALK_IN") && !fu.patient_id.startsWith("fu_")) {
                const user = await prisma.user.findUnique({ where: { id: fu.patient_id } });
                if (user) userId = user.id;
            }

            // Generate dedicated RHU Queue Number (e.g. 09142026-AM-H001)
            const queueNumber = await generateQueueNumber({
                source: "kiosk",
                isPriority: false,
                appointmentDate: now,
                appointmentSlot: "AM",
                category: "RHU"
            });

            let sourceTxAddData: any = {};
            if (fu.source_transaction_id) {
                try {
                    const stx = await prisma.transaction.findUnique({ where: { id: fu.source_transaction_id } });
                    if (stx?.additionalData) {
                        sourceTxAddData = typeof stx.additionalData === "string" ? JSON.parse(stx.additionalData) : stx.additionalData;
                    }
                } catch {}
            }
            const followUpSequence = (Number(sourceTxAddData?.followUpSequence) || 0) + 1;

            const additionalData = {
                checkupType: "Return Patient / Follow-up",
                isFollowUp: true,
                returnPatient: true,
                followUpSequence,
                followUpAppointmentId: fu.id,
                sourceTransactionId: fu.source_transaction_id || null,
                previousTransactionId: fu.source_transaction_id || null,
                followUpNotes: fu.notes || "Scheduled return visit",
                originalDoctor: fu.doctor_name || "Attending Physician",
                healthCenterId: fu.health_center_id || null,
                healthCenterName: fu.health_center_name || null,
                checkedIn: false,
                checkedInAt: null,
                rhuStatus: "APPOINTMENT_BOOKED",
                autoInjectedByCron: true
            };

            const newTx = await prisma.transaction.create({
                data: {
                    typeId: rhuType.id,
                    userId,
                    status: "FOR_INSPECTION",
                    appointmentDate: now,
                    appointmentSlot: "AM",
                    queueNumber,
                    residentSnapshot,
                    additionalData,
                    totalAmount: 0,
                    isPaid: true
                }
            });

            // Update follow_up_appointments with the injected transaction ID
            await prisma.$executeRaw`
                UPDATE follow_up_appointments
                SET injected_transaction_id = ${newTx.id}, updated_at = NOW()
                WHERE id = ${fu.id}
            `;

            injectedCount++;
        }

        try {
            revalidatePath("/admin/rhu");
            revalidatePath("/admin/rhu/queue");
            revalidatePath("/admin/rhu/consultations");
            revalidatePath("/admin/rhu/follow-ups");
        } catch {}

        return {
            success: true,
            processed: todaysFollowUps.length,
            injected: injectedCount
        };
    } catch (error: any) {
        console.error("injectDailyFollowUpQueue error:", error);
        return { success: false, error: error.message || "Failed to execute daily follow-up queue injection." };
    }
}

export async function cancelRHUFollowUp(appointmentId: string, reason?: string) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        await prisma.$executeRaw`
            UPDATE follow_up_appointments
            SET status = 'Cancelled', 
                notes = CONCAT(COALESCE(notes, ''), ' [Cancelled: ', ${reason || 'By Staff'}, ']'), 
                updated_at = NOW()
            WHERE id = ${appointmentId}
        `;

        try {
            revalidatePath("/admin/rhu/follow-ups");
        } catch {}
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to cancel follow-up." };
    }
}

export async function completeRHUFollowUp(appointmentId: string) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        await prisma.$executeRaw`
            UPDATE follow_up_appointments
            SET status = 'Completed', updated_at = NOW()
            WHERE id = ${appointmentId}
        `;

        try {
            revalidatePath("/admin/rhu/follow-ups");
        } catch {}
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Failed to complete follow-up." };
    }
}

export async function checkInRHUFollowUpPatient(followUpId: string) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized: Please log in." };
        }

        const user = session.user as any;
        const role = user?.role || "";
        const allowedRoles = ["ASST_SEC", "ADMIN", "RHU_ADMIN"];
        if (!allowedRoles.includes(role)) {
            return { success: false, error: "Forbidden: Only Assistant Secretary accounts are authorized to check in patients and record vital signs." };
        }

        const fuRows: any[] = await prisma.$queryRaw`
            SELECT * FROM follow_up_appointments WHERE id = ${followUpId} LIMIT 1
        `;
        const fu = fuRows[0];
        if (!fu) {
            return { success: false, error: "Follow-up appointment record not found." };
        }

        // Validate that scheduled date has arrived (today or earlier)
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [mMonth, mDay, mYear] = manilaDateString.split("/");
        const endOfToday = new Date(`${mYear}-${mMonth}-${mDay}T23:59:59.999+08:00`);

        if (new Date(fu.scheduled_date) > endOfToday) {
            const formattedDate = new Date(fu.scheduled_date).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            return {
                success: false,
                error: `Cannot check in patient before scheduled date. This follow-up visit is scheduled for ${formattedDate}.`
            };
        }

        // If an injected transaction already exists and is not cancelled, return it
        if (fu.injected_transaction_id) {
            const existingTx = await prisma.transaction.findUnique({
                where: { id: fu.injected_transaction_id }
            });
            if (existingTx && !existingTx.isCancelled) {
                return { success: true, transactionId: existingTx.id, queueNumber: existingTx.queueNumber };
            }
        }

        // Retrieve resident snapshot & details from source transaction or fallback
        let residentSnapshot: any = {
            firstName: fu.patient_name?.split(" ")[0] || "Return",
            lastName: fu.patient_name?.split(" ").slice(1).join(" ") || "Patient",
            middleName: "",
            gender: "UNSPECIFIED",
            barangay: "Poblacion",
            municipality: "Mapandan",
            province: "Pangasinan"
        };

        let userId: string | null = null;
        let sourceTxAddData: any = {};

        if (fu.source_transaction_id) {
            const sourceTx = await prisma.transaction.findUnique({
                where: { id: fu.source_transaction_id }
            });
            if (sourceTx) {
                if (sourceTx.residentSnapshot) {
                    residentSnapshot = typeof sourceTx.residentSnapshot === "string"
                        ? JSON.parse(sourceTx.residentSnapshot)
                        : sourceTx.residentSnapshot;
                }
                userId = sourceTx.userId || null;
                if (sourceTx.additionalData) {
                    sourceTxAddData = typeof sourceTx.additionalData === "string"
                        ? JSON.parse(sourceTx.additionalData)
                        : sourceTx.additionalData;
                }
            }
        }

        if (!userId && fu.patient_id && !fu.patient_id.startsWith("WALK_IN") && !fu.patient_id.startsWith("fu_")) {
            const matchedUser = await prisma.user.findUnique({ where: { id: fu.patient_id } });
            if (matchedUser) userId = matchedUser.id;
        }

        // Resolve RHU TransactionType
        let rhuType = await prisma.transactionType.findFirst({
            where: {
                OR: [
                    { code: "RHU_CONSULTATION" },
                    { code: "rhu_consultation_v1" },
                    { code: { startsWith: "rhu" } },
                    { category: { in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH"] } }
                ]
            }
        });
        if (!rhuType) {
            rhuType = await prisma.transactionType.findFirst();
        }
        if (!rhuType) {
            return { success: false, error: "No RHU Consultation transaction type found in system." };
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentSlot = currentHour < 12 ? "08:00 AM - 11:00 AM" : "01:00 PM - 04:00 PM";
        const queueNumber = await generateQueueNumber({
            source: "kiosk",
            isPriority: false,
            appointmentDate: now,
            appointmentSlot: currentSlot,
            category: "RHU"
        });

        const followUpSequence = (Number(sourceTxAddData?.followUpSequence) || 0) + 1;

        const additionalData = {
            checkupType: "Return Patient / Follow-up",
            isFollowUp: true,
            returnPatient: true,
            followUpSequence,
            followUpAppointmentId: fu.id,
            sourceTransactionId: fu.source_transaction_id || null,
            previousTransactionId: fu.source_transaction_id || null,
            followUpNotes: fu.notes || "Scheduled return visit",
            originalDoctor: fu.doctor_name || "Attending Physician",
            healthCenterId: fu.health_center_id || null,
            healthCenterName: fu.health_center_name || null,
            checkedIn: false,
            rhuStatus: "APPOINTMENT_BOOKED",
            checkedInBySecretaryId: user.id || null,
            checkedInBySecretaryName: user.name || "Assistant Secretary",
            checkedInAt: null,
            autoInjectedByCron: false
        };

        const newTx = await prisma.transaction.create({
            data: {
                typeId: rhuType.id,
                userId,
                status: "FOR_INSPECTION", // Effective status APPOINTMENT_BOOKED awaiting Secretary triage vitals
                appointmentDate: now,
                appointmentSlot: currentSlot,
                queueNumber,
                residentSnapshot,
                additionalData,
                totalAmount: 0,
                isPaid: true
            }
        });

        await prisma.$executeRaw`
            UPDATE follow_up_appointments
            SET injected_transaction_id = ${newTx.id}, updated_at = NOW()
            WHERE id = ${fu.id}
        `;

        try {
            revalidatePath("/admin/rhu");
            revalidatePath("/admin/rhu/follow-ups");
            revalidatePath("/admin/rhu/consultations");
            revalidatePath("/admin/rhu/queue");
            revalidatePath(`/admin/rhu/${newTx.id}`);
        } catch {}

        return { success: true, transactionId: newTx.id, queueNumber };
    } catch (error: any) {
        console.error("checkInRHUFollowUpPatient error:", error);
        return { success: false, error: error.message || "Failed to check in follow-up patient." };
    }
}

export async function getPatientConsultationHistory(params: {
    userId?: string | null;
    patientName?: string | null;
    currentTransactionId?: string | null;
}) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const conditions: Prisma.Sql[] = [
            Prisma.sql`t.status::text IN ('COMPLETED', 'RELEASED', 'DELIVERED', 'PRESCRIBED', 'FOR_CLAIM', 'IN_CONSULTATION', 'CHECK_IN')`,
            Prisma.sql`t."isCancelled" = FALSE`,
            Prisma.sql`(tt.category = 'RHU' OR tt.code LIKE 'RHU%' OR (t."additionalData"->>'checkupType') IS NOT NULL)`
        ];

        if (params.currentTransactionId) {
            conditions.push(Prisma.sql`t.id != ${params.currentTransactionId}`);
        }

        if (params.userId) {
            conditions.push(Prisma.sql`t."userId" = ${params.userId}`);
        } else if (params.patientName && params.patientName.trim()) {
            const term = `%${params.patientName.trim().toLowerCase()}%`;
            conditions.push(Prisma.sql`(
                LOWER(CONCAT(t."residentSnapshot"->>'firstName', ' ', t."residentSnapshot"->>'lastName')) LIKE ${term}
                OR LOWER(t."residentSnapshot"->>'lastName') LIKE ${term}
            )`);
        } else {
            return { success: true, data: [] };
        }

        const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

        const transactions: any[] = await prisma.$queryRaw`
            SELECT 
                t.id,
                t.status,
                t."queueNumber",
                t."appointmentDate",
                t."createdAt",
                t."residentSnapshot",
                t."additionalData"
            FROM "Transaction" t
            LEFT JOIN "TransactionType" tt ON t."typeId" = tt.id
            ${whereClause}
            ORDER BY t."createdAt" DESC
            LIMIT 10
        `;

        const data = transactions.map(tx => {
            const addData = typeof tx.additionalData === "string" ? JSON.parse(tx.additionalData) : (tx.additionalData || {});
            const physician = addData.deos?.attendingPhysician || addData.attendingPhysician || addData.originalDoctor || "Attending Physician";
            const visitDate = tx.appointmentDate || tx.createdAt;
            return {
                id: tx.id,
                queueNumber: tx.queueNumber,
                controlNumber: tx.queueNumber || tx.id.slice(0, 10),
                date: visitDate,
                createdAt: tx.createdAt,
                completedAt: tx.createdAt,
                status: tx.status,
                rhuStatus: addData.rhuStatus || tx.status,
                checkupType: addData.checkupType || "General Consultation",
                attendingPhysician: physician,
                doctor: physician,
                vitals: addData.vitals || null,
                deos: addData.deos || null,
                diagnosis: addData.deos?.diagnosis || null,
                examinationFindings: addData.deos?.examinationFindings || null,
                orders: addData.deos?.orders || null,
                dispenseInfo: addData.dispenseInfo || null,
                isFollowUp: !!addData.isFollowUp,
                followUpSequence: addData.followUpSequence || null,
                followUpScheduled: addData.followUpScheduled || null
            };
        });

        return { success: true, data };
    } catch (error: any) {
        console.error("getPatientConsultationHistory error:", error);
        return { success: false, error: error.message || "Failed to fetch patient consultation history." };
    }
}


