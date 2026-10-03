"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

export type BedStatus = "AVAILABLE" | "OCCUPIED" | "OUT_OF_SERVICE";
export type FacilityType = "RHU" | "HEALTH_CENTER";

export interface RHUBedData {
    id: string;
    bedNumber: string;
    bedType: string;
    department: string;
    status: BedStatus;
    patientName?: string | null;
    caseDetails?: string | null;
    patientAge?: number | null;
    patientGender?: string | null;
    patientContact?: string | null;
    admissionDate?: Date | string | null;
    dischargeDate?: Date | string | null;
    attendingPhysician?: string | null;
    facilityType: FacilityType;
    healthCenterId?: string | null;
    healthCenterName?: string | null;
    notes?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

let bedTablesInitialized = true;

export async function ensureBedTablesExist() {
    if (bedTablesInitialized) return;
    try {
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUBed" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "bedNumber" TEXT NOT NULL,
                "bedType" TEXT NOT NULL DEFAULT 'Medical',
                "department" TEXT NOT NULL DEFAULT 'Internal Medicine',
                "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
                "patientName" TEXT,
                "caseDetails" TEXT,
                "patientAge" INTEGER,
                "patientGender" TEXT,
                "patientContact" TEXT,
                "admissionDate" TIMESTAMP(3),
                "dischargeDate" TIMESTAMP(3),
                "attendingPhysician" TEXT,
                "facilityType" TEXT NOT NULL DEFAULT 'RHU',
                "healthCenterId" TEXT,
                "healthCenterName" TEXT DEFAULT 'RHU {{LGU_NAME}}',
                "notes" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUBedHistory" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "bedId" TEXT NOT NULL,
                "bedNumber" TEXT NOT NULL,
                "action" TEXT NOT NULL,
                "patientName" TEXT,
                "caseDetails" TEXT,
                "attendingPhysician" TEXT,
                "notes" TEXT,
                "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        try {
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhubed_status" ON "RHUBed"("status");`);
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhubed_department" ON "RHUBed"("department");`);
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhubed_facility" ON "RHUBed"("facilityType", "healthCenterId");`);
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhubed_number" ON "RHUBed"("bedNumber");`);
        } catch { }

        bedTablesInitialized = true;
    } catch (e) {
        console.error("Error in ensureBedTablesExist:", e);
    }
}

async function checkAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    return session;
}

export async function getRHUBeds(params?: {
    facilityType?: FacilityType | "ALL";
    healthCenterId?: string;
    department?: string;
    bedType?: string;
    status?: string;
    search?: string;
    sessionUser?: any;
    matchedCenter?: any;
}): Promise<{ success: boolean; data: RHUBedData[]; error?: string }> {
    try {
        let currentUser = params?.sessionUser;
        let _matchedCenter = params?.matchedCenter;

        if (!currentUser) {
            const session = await checkAuth();
            currentUser = session?.user as any;
            _matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;
        }

        await ensureBedTablesExist();

        let query = `SELECT * FROM "RHUBed" WHERE 1=1`;
        const conditions: string[] = [];

        // Facility scoping
        if (params?.facilityType === "RHU") {
            conditions.push(`"facilityType" = 'RHU'`);
        } else if (params?.facilityType === "HEALTH_CENTER") {
            conditions.push(`"facilityType" = 'HEALTH_CENTER'`);
            if (params.healthCenterId && params.healthCenterId !== "ALL") {
                conditions.push(`"healthCenterId" = '${params.healthCenterId.replace(/'/g, "''")}'`);
            }
        } else if (params?.healthCenterId && params.healthCenterId !== "ALL") {
            conditions.push(`"healthCenterId" = '${params.healthCenterId.replace(/'/g, "''")}'`);
        }

        if (params?.department && params.department !== "ALL") {
            conditions.push(`LOWER("department") = LOWER('${params.department.replace(/'/g, "''")}')`);
        }

        if (params?.bedType && params.bedType !== "ALL") {
            conditions.push(`LOWER("bedType") = LOWER('${params.bedType.replace(/'/g, "''")}')`);
        }

        if (params?.status && params.status !== "ALL") {
            conditions.push(`"status" = '${params.status}'`);
        }

        if (params?.search && params.search.trim()) {
            const q = params.search.trim().replace(/'/g, "''").toLowerCase();
            conditions.push(`(
                LOWER("bedNumber") LIKE '%${q}%' OR 
                LOWER("patientName") LIKE '%${q}%' OR 
                LOWER("caseDetails") LIKE '%${q}%' OR
                LOWER("department") LIKE '%${q}%'
            )`);
        }

        if (conditions.length > 0) {
            query += ` AND ` + conditions.join(" AND ");
        }

        query += ` ORDER BY "bedNumber" ASC, "createdAt" ASC`;

        const beds: any[] = await prisma.$queryRawUnsafe(query);

        return {
            success: true,
            data: beds.map(b => ({
                id: b.id,
                bedNumber: b.bedNumber,
                bedType: b.bedType,
                department: b.department,
                status: b.status as BedStatus,
                patientName: b.patientName,
                caseDetails: b.caseDetails,
                patientAge: b.patientAge,
                patientGender: b.patientGender,
                patientContact: b.patientContact,
                admissionDate: b.admissionDate ? new Date(b.admissionDate) : null,
                dischargeDate: b.dischargeDate ? new Date(b.dischargeDate) : null,
                attendingPhysician: b.attendingPhysician,
                facilityType: b.facilityType as FacilityType,
                healthCenterId: b.healthCenterId,
                healthCenterName: b.healthCenterName,
                notes: b.notes,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt
            }))
        };
    } catch (error: any) {
        console.error("Error in getRHUBeds:", error);
        return { success: false, data: [], error: error?.message };
    }
}

export async function createRHUBed(data: {
    bedNumber: string;
    bedType: string;
    department: string;
    facilityType?: FacilityType;
    healthCenterId?: string | null;
    healthCenterName?: string | null;
    notes?: string | null;
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const session = await checkAuth();
        await ensureBedTablesExist();

        const user = session.user as any;
        const matchedCenter = await getMatchedCenterForUser(user);

        // Security check: If user belongs to a specific health center, they can ONLY add beds to their own center!
        let facilityType = data.facilityType || "RHU";
        let centerId = data.healthCenterId || null;
        let centerName = data.healthCenterName;

        if (matchedCenter) {
            facilityType = "HEALTH_CENTER";
            centerId = matchedCenter.id;
            centerName = matchedCenter.name;
        } else {
            centerName = centerName || (facilityType === "RHU" ? "RHU {{LGU_NAME}}" : "Health Center");
        }

        // Check if bedNumber already exists for this facility
        const cleanBedNo = data.bedNumber.trim();

        const existing: any[] = await prisma.$queryRaw`
            SELECT id FROM "RHUBed" 
            WHERE LOWER("bedNumber") = LOWER(${cleanBedNo})
              AND "facilityType" = ${facilityType}
              AND (("healthCenterId" IS NULL AND ${centerId}::text IS NULL) OR "healthCenterId" = ${centerId}::text)
            LIMIT 1
        `;

        if (existing.length > 0) {
            return { success: false, error: `Bed number "${cleanBedNo}" already exists in this facility.` };
        }

        const newId = `bed_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

        await prisma.$executeRaw`
            INSERT INTO "RHUBed" (
                "id", "bedNumber", "bedType", "department", "status",
                "facilityType", "healthCenterId", "healthCenterName", "notes",
                "createdAt", "updatedAt"
            ) VALUES (
                ${newId}, ${cleanBedNo}, ${data.bedType}, ${data.department}, 'AVAILABLE',
                ${facilityType}, ${centerId}::text, ${centerName}, ${data.notes || null}::text,
                NOW(), NOW()
            )
        `;

        revalidatePath("/admin/rhu/beds");
        return { success: true, id: newId };
    } catch (error: any) {
        console.error("Error creating bed:", error);
        return { success: false, error: error?.message };
    }
}

export async function admitPatientToBed(data: {
    bedId: string;
    patientName: string;
    caseDetails: string;
    patientAge?: number | null;
    patientGender?: string | null;
    patientContact?: string | null;
    attendingPhysician?: string | null;
    admissionDate?: Date;
    notes?: string | null;
}): Promise<{ success: boolean; error?: string }> {
    try {
        await checkAuth();
        await ensureBedTablesExist();

        const bedRes: any[] = await prisma.$queryRaw`SELECT * FROM "RHUBed" WHERE id = ${data.bedId} LIMIT 1`;
        if (bedRes.length === 0) {
            return { success: false, error: "Bed not found." };
        }
        const bed = bedRes[0];

        const admitDate = data.admissionDate || new Date();

        await prisma.$executeRaw`
            UPDATE "RHUBed"
            SET "status" = 'OCCUPIED',
                "patientName" = ${data.patientName.trim()},
                "caseDetails" = ${data.caseDetails.trim()},
                "patientAge" = ${data.patientAge || null},
                "patientGender" = ${data.patientGender || null},
                "patientContact" = ${data.patientContact || null},
                "attendingPhysician" = ${data.attendingPhysician || null},
                "admissionDate" = ${admitDate},
                "dischargeDate" = NULL,
                "notes" = ${data.notes || null},
                "updatedAt" = NOW()
            WHERE id = ${data.bedId}
        `;

        // Log to history
        const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await prisma.$executeRaw`
            INSERT INTO "RHUBedHistory" (
                "id", "bedId", "bedNumber", "action", "patientName", "caseDetails",
                "attendingPhysician", "notes", "timestamp"
            ) VALUES (
                ${histId}, ${data.bedId}, ${bed.bedNumber}, 'ADMISSION', ${data.patientName.trim()},
                ${data.caseDetails.trim()}, ${data.attendingPhysician || null}, ${data.notes || null}, NOW()
            )
        `;

        revalidatePath("/admin/rhu/beds");
        return { success: true };
    } catch (error: any) {
        console.error("Error admitting patient:", error);
        return { success: false, error: error?.message };
    }
}

export async function dischargePatientFromBed(
    bedId: string,
    dischargeNotes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await checkAuth();
        await ensureBedTablesExist();

        const bedRes: any[] = await prisma.$queryRaw`SELECT * FROM "RHUBed" WHERE id = ${bedId} LIMIT 1`;
        if (bedRes.length === 0) {
            return { success: false, error: "Bed not found." };
        }
        const bed = bedRes[0];

        const now = new Date();

        await prisma.$executeRaw`
            UPDATE "RHUBed"
            SET "status" = 'AVAILABLE',
                "patientName" = NULL,
                "caseDetails" = NULL,
                "patientAge" = NULL,
                "patientGender" = NULL,
                "patientContact" = NULL,
                "attendingPhysician" = NULL,
                "dischargeDate" = ${now},
                "notes" = ${dischargeNotes || null},
                "updatedAt" = NOW()
            WHERE id = ${bedId}
        `;

        // Log history
        const histId = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await prisma.$executeRaw`
            INSERT INTO "RHUBedHistory" (
                "id", "bedId", "bedNumber", "action", "patientName", "caseDetails",
                "attendingPhysician", "notes", "timestamp"
            ) VALUES (
                ${histId}, ${bedId}, ${bed.bedNumber}, 'DISCHARGE', ${bed.patientName || "Unknown"},
                ${bed.caseDetails || null}, ${bed.attendingPhysician || null}, ${dischargeNotes || null}, NOW()
            )
        `;

        revalidatePath("/admin/rhu/beds");
        return { success: true };
    } catch (error: any) {
        console.error("Error discharging patient:", error);
        return { success: false, error: error?.message };
    }
}

export async function updateBedStatus(
    bedId: string,
    status: BedStatus,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        await checkAuth();
        await ensureBedTablesExist();

        await prisma.$executeRaw`
            UPDATE "RHUBed"
            SET "status" = ${status},
                "notes" = COALESCE(${notes || null}, "notes"),
                "updatedAt" = NOW()
            WHERE id = ${bedId}
        `;

        revalidatePath("/admin/rhu/beds");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating bed status:", error);
        return { success: false, error: error?.message };
    }
}

export async function deleteRHUBed(bedId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await checkAuth();
        await ensureBedTablesExist();

        await prisma.$executeRaw`DELETE FROM "RHUBed" WHERE id = ${bedId}`;

        revalidatePath("/admin/rhu/beds");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting bed:", error);
        return { success: false, error: error?.message };
    }
}

// Allows RHU administrators to initialize their facility's standard bed capacity
export async function initializeFacilityBeds(data: {
    facilityType: FacilityType;
    healthCenterId?: string | null;
    healthCenterName?: string | null;
    bedCount: number;
    prefix?: string;
}): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const session = await checkAuth();
        await ensureBedTablesExist();

        const user = session.user as any;
        const matchedCenter = await getMatchedCenterForUser(user);

        let targetFacilityType = data.facilityType;
        let centerId = data.healthCenterId || null;
        let centerName = data.healthCenterName;

        if (matchedCenter) {
            targetFacilityType = "HEALTH_CENTER";
            centerId = matchedCenter.id;
            centerName = matchedCenter.name;
        } else {
            centerName = centerName || (targetFacilityType === "RHU" ? "RHU {{LGU_NAME}}" : "Health Center");
        }

        const count = Math.min(100, Math.max(1, data.bedCount || 20));
        const prefix = data.prefix || (targetFacilityType === "RHU" ? "RHU" : "BHC");

        const departments = [
            { name: "Internal Medicine", type: "Medical" },
            { name: "Surgery", type: "Surgical" },
            { name: "Pediatrics", type: "Pediatric" },
            { name: "OB-GYN", type: "Obstetrics" },
            { name: "Emergency", type: "ER" },
            { name: "Infectious Disease", type: "Isolation" },
            { name: "Others", type: "Medical" }
        ];

        let createdCount = 0;
        for (let i = 1; i <= count; i++) {
            const bedNo = `${prefix}-${String(i).padStart(3, "0")}`;
            const deptInfo = departments[(i - 1) % departments.length];
            const newId = `bed_${Math.random().toString(36).substring(2, 9)}_${Date.now()}_${i}`;

            // Check if already exists
            const existing: any[] = await prisma.$queryRaw`
                SELECT id FROM "RHUBed" 
                WHERE LOWER("bedNumber") = LOWER(${bedNo})
                  AND "facilityType" = ${data.facilityType}
                  AND (("healthCenterId" IS NULL AND ${centerId}::text IS NULL) OR "healthCenterId" = ${centerId}::text)
                LIMIT 1
            `;

            if (existing.length === 0) {
                await prisma.$executeRaw`
                    INSERT INTO "RHUBed" (
                        "id", "bedNumber", "bedType", "department", "status",
                        "facilityType", "healthCenterId", "healthCenterName", "notes",
                        "createdAt", "updatedAt"
                    ) VALUES (
                        ${newId}, ${bedNo}, ${deptInfo.type}, ${deptInfo.name}, 'AVAILABLE',
                        ${data.facilityType}, ${centerId}::text, ${centerName}, 'Facility capacity bed',
                        NOW(), NOW()
                    )
                `;
                createdCount++;
            }
        }

        revalidatePath("/admin/rhu/beds");
        return { success: true, count: createdCount };
    } catch (error: any) {
        console.error("Error initializing beds:", error);
        return { success: false, error: error?.message };
    }
}
