"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type MedicalPersonnelRole = "DOCTOR" | "NURSE" | "MIDWIFE" | "DENTIST" | "ADMIN" | "PHARMACY";

async function checkCenterManageAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { authorized: false, error: "Unauthorized: Please log in." };
    }
    const role = ((session.user as any).role || "").toUpperCase();
    const dept = (((session.user as any).department || "").toUpperCase());
    const canManage = role === "ADMIN" || role === "RHU_ADMIN" || role === "RHU_CENTER_ADMIN" || dept === "LGU";
    if (!canManage) {
        return { authorized: false, error: "Access Denied: Only RHU Center Admins, RHU Administrators, and LGU Admins can manage health centers and medical staff." };
    }
    return { authorized: true, user: session.user };
}

export interface RHUHealthCenterInput {
    name: string;
    code?: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    barangay?: string;
    contactNumber?: string;
    operatingHours?: string;
    headPersonnel?: string;
    servicesOffered?: string;
    status?: string;
    remarks?: string;
    createAccount?: boolean;
    accountEmail?: string;
    accountPassword?: string;
    userId?: string | null;
    pharmacyEmail?: string;
    pharmacyPassword?: string;
    pharmacyUserId?: string | null;
}

export interface RHUHealthCenterFilterParams {
    search?: string;
    barangay?: string;
    status?: string;
}

export interface RHUMedicalPersonnelInput {
    name: string;
    role: MedicalPersonnelRole;
    specialization?: string;
    licenseNumber?: string;
    contactNumber?: string;
    email?: string;
    schedule?: string;
    assignedServices?: string;
    status?: string;
    healthCenterId?: string | null;
    createAccount?: boolean;
    accountEmail?: string;
    accountPassword?: string;
    userId?: string | null;
}

export interface RHUMedicalPersonnelFilterParams {
    search?: string;
    role?: string;
    healthCenterId?: string;
    status?: string;
}

async function checkEmailUniqueness(email: string, existingUserId?: string | null) {
    if (!email || !email.trim()) return { isUnique: true };
    const cleanEmail = email.trim().toLowerCase();

    try {
        const raw: any[] = await prisma.$queryRaw`SELECT "id" FROM "User" WHERE "email" = ${cleanEmail}`;
        if (raw && raw.length > 0) {
            const existingUser = raw[0];
            if (!existingUserId || existingUser.id !== existingUserId) {
                return { isUnique: false, error: `The email address "${cleanEmail}" is already in use by another account.` };
            }
        }
    } catch (err) {
        console.error("Error checking email uniqueness:", err);
    }
    return { isUnique: true };
}

function getCenterModel() {
    return (prisma as any).rHUHealthCenter || (prisma as any).RHUHealthCenter;
}

function getPersonnelModel() {
    return (prisma as any).rHUMedicalPersonnel || (prisma as any).RHUMedicalPersonnel;
}

export async function createOrUpdateLinkedUserAccount(params: {
    existingUserId?: string | null;
    name: string;
    email: string;
    password?: string;
    role: "RHU_CENTER_ADMIN" | "RHU_STAFF" | "RHU_DOCTOR" | "RHU_PHARMACY";
    department?: string;
    managedBarangay?: string;
}) {
    if (!params.email || !params.email.trim()) return null;
    const cleanEmail = params.email.trim().toLowerCase();

    const targetRole = params.role || "RHU_CENTER_ADMIN";
    const defaultDept = targetRole === "RHU_CENTER_ADMIN" ? "RHU Center Medical Admin" : "RHU Medical Staff";

    // Ensure PostgreSQL enum has all values
    try {
        await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RHU_CENTER_ADMIN';`);
        await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RHU_DOCTOR';`);
        await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RHU_STAFF';`);
        await prisma.$executeRawUnsafe(`ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RHU_PHARMACY';`);
    } catch { }

    let user: any = null;
    if (params.existingUserId) {
        try {
            const raw: any[] = await prisma.$queryRaw`SELECT * FROM "User" WHERE "id" = ${params.existingUserId}`;
            user = raw[0];
        } catch { }
    }
    if (!user) {
        try {
            const raw: any[] = await prisma.$queryRaw`SELECT * FROM "User" WHERE "email" = ${cleanEmail}`;
            user = raw[0];
        } catch { }
    }

    const deptClean = params.department || defaultDept;
    const brgyClean = params.managedBarangay || null;

    if (user) {
        if (params.password && params.password.trim().length >= 6) {
            const hashed = await bcrypt.hash(params.password.trim(), 10);
            await prisma.$executeRaw`
                UPDATE "User"
                SET "name" = ${params.name},
                    "email" = ${cleanEmail},
                    "role" = ${targetRole}::"UserRole",
                    "department" = ${deptClean},
                    "managedBarangay" = ${brgyClean},
                    "password" = ${hashed},
                    "isPasswordChanged" = true,
                    "updatedAt" = NOW()
                WHERE "id" = ${user.id}
            `;
        } else {
            await prisma.$executeRaw`
                UPDATE "User"
                SET "name" = ${params.name},
                    "email" = ${cleanEmail},
                    "role" = ${targetRole}::"UserRole",
                    "department" = ${deptClean},
                    "managedBarangay" = ${brgyClean},
                    "updatedAt" = NOW()
                WHERE "id" = ${user.id}
            `;
        }
        return user.id;
    } else {
        const passToUse = (params.password && params.password.trim().length >= 6)
            ? params.password.trim()
            : "mapandan123";
        const hashedPassword = await bcrypt.hash(passToUse, 10);
        const newId = `usr${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

        await prisma.$executeRaw`
            INSERT INTO "User" (
                "id", "name", "email", "password", "role", "department", "managedBarangay", "isEmailVerified", "isPasswordChanged", "createdAt", "updatedAt"
            ) VALUES (
                ${newId}, ${params.name}, ${cleanEmail}, ${hashedPassword}, ${targetRole}::"UserRole", ${deptClean}, ${brgyClean}, true, true, NOW(), NOW()
            )
        `;
        return newId;
    }
}

let tablesInitialized = false;

export async function ensureHealthCenterTableExists() {
    if (tablesInitialized) return;
    try {
        try {
            await prisma.$executeRawUnsafe(`ALTER TYPE "MedicalRole" ADD VALUE IF NOT EXISTS 'ADMIN';`);
            await prisma.$executeRawUnsafe(`ALTER TYPE "MedicalRole" ADD VALUE IF NOT EXISTS 'PHARMACY';`);
        } catch { }

        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUHealthCenter" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "code" TEXT,
                "location" TEXT NOT NULL,
                "latitude" DOUBLE PRECISION,
                "longitude" DOUBLE PRECISION,
                "barangay" TEXT,
                "contactNumber" TEXT,
                "operatingHours" TEXT DEFAULT 'Mon-Fri 8:00 AM - 5:00 PM',
                "headPersonnel" TEXT,
                "servicesOffered" TEXT,
                "status" TEXT NOT NULL DEFAULT 'ACTIVE',
                "remarks" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await prisma.$executeRaw`ALTER TABLE "RHUHealthCenter" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;`;
        await prisma.$executeRaw`ALTER TABLE "RHUHealthCenter" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;`;
        await prisma.$executeRaw`ALTER TABLE "RHUHealthCenter" ADD COLUMN IF NOT EXISTS "userId" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "RHUHealthCenter" ADD COLUMN IF NOT EXISTS "accountEmail" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "RHUHealthCenter" ADD COLUMN IF NOT EXISTS "pharmacyUserId" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "RHUHealthCenter" ADD COLUMN IF NOT EXISTS "pharmacyEmail" TEXT;`;

        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUMedicalPersonnel" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "role" TEXT NOT NULL DEFAULT 'DOCTOR',
                "specialization" TEXT,
                "licenseNumber" TEXT,
                "contactNumber" TEXT,
                "email" TEXT,
                "schedule" TEXT DEFAULT 'Mon-Fri 8:00 AM - 5:00 PM',
                "assignedServices" TEXT,
                "status" TEXT NOT NULL DEFAULT 'ACTIVE',
                "healthCenterId" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;

        await prisma.$executeRaw`ALTER TABLE "RHUMedicalPersonnel" ADD COLUMN IF NOT EXISTS "userId" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "RHUMedicalPersonnel" ADD COLUMN IF NOT EXISTS "accountEmail" TEXT;`;

        tablesInitialized = true;
    } catch (err) {
        console.error("Error in ensureHealthCenterTableExists:", err);
    }
}

export async function ensureMedicalPersonnelTableExists() {
    return ensureHealthCenterTableExists();
}

export async function getRHUHealthCenters(params?: RHUHealthCenterFilterParams) {
    try {
        await ensureHealthCenterTableExists();
        await ensureMedicalPersonnelTableExists();

        let centers: any[] = [];
        const model = getCenterModel();

        if (model) {
            try {
                centers = await model.findMany({
                    include: {
                        personnel: true
                    },
                    orderBy: { name: "asc" }
                });
            } catch (pErr) {
                console.warn("Prisma center model findMany with personnel failed, fallback to raw SQL:", pErr);
                centers = await prisma.$queryRaw`
                    SELECT * FROM "RHUHealthCenter" ORDER BY "name" ASC
                `;
            }
        } else {
            centers = await prisma.$queryRaw`
                SELECT * FROM "RHUHealthCenter" ORDER BY "name" ASC
            `;
        }

        // Fetch personnel to attach if raw SQL fallback was used or personnel array missing
        let allPersonnel: any[] = [];
        try {
            allPersonnel = await prisma.$queryRaw`
                SELECT * FROM "RHUMedicalPersonnel" ORDER BY "name" ASC
            `;
        } catch {
            allPersonnel = [];
        }

        // Map personnel to centers
        centers = centers.map(c => {
            const attachedPersonnel = c.personnel || allPersonnel.filter(p => p.healthCenterId === c.id);
            return {
                ...c,
                personnel: attachedPersonnel
            };
        });

        // Apply filters in JS
        if (params?.search && params.search.trim()) {
            const q = params.search.trim().toLowerCase();
            centers = centers.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.code && c.code.toLowerCase().includes(q)) ||
                (c.location && c.location.toLowerCase().includes(q)) ||
                (c.barangay && c.barangay.toLowerCase().includes(q)) ||
                (c.headPersonnel && c.headPersonnel.toLowerCase().includes(q)) ||
                c.personnel.some((p: any) => p.name.toLowerCase().includes(q) || (p.specialization && p.specialization.toLowerCase().includes(q)))
            );
        }

        if (params?.barangay && params.barangay !== "ALL") {
            centers = centers.filter(c => c.barangay === params.barangay);
        }

        if (params?.status && params.status !== "ALL") {
            centers = centers.filter(c => c.status === params.status);
        }

        return { success: true, data: centers };
    } catch (error: any) {
        console.error("Error fetching RHU health centers:", error);
        return { success: false, error: error?.message || "Failed to fetch health centers" };
    }
}

export async function createRHUHealthCenter(input: RHUHealthCenterInput) {
    try {
        const auth = await checkCenterManageAuth();
        if (!auth.authorized) return { success: false, error: auth.error };

        await ensureHealthCenterTableExists();

        if (!input.name || !input.name.trim()) {
            return { success: false, error: "Health center name is required" };
        }
        if (!input.location || !input.location.trim()) {
            return { success: false, error: "Location address is required" };
        }

        if (input.accountEmail && input.accountEmail.trim()) {
            const check = await checkEmailUniqueness(input.accountEmail);
            if (!check.isUnique) {
                return { success: false, error: check.error };
            }
        }
        if (input.pharmacyEmail && input.pharmacyEmail.trim()) {
            const check = await checkEmailUniqueness(input.pharmacyEmail);
            if (!check.isUnique) {
                return { success: false, error: check.error };
            }
        }

        const centerId = `cmrctr${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
        const nameClean = input.name.trim();
        const codeClean = input.code?.trim() || null;
        const locationClean = input.location.trim();
        const barangayClean = input.barangay?.trim() || null;
        const contactClean = input.contactNumber?.trim() || null;
        const hoursClean = input.operatingHours?.trim() || "Mon-Fri 8:00 AM - 5:00 PM";
        const headClean = input.headPersonnel?.trim() || null;
        const servicesClean = input.servicesOffered?.trim() || null;
        const statusClean = input.status || "ACTIVE";
        const remarksClean = input.remarks?.trim() || null;
        const accountEmailClean = input.accountEmail?.trim() || null;
        const pharmacyEmailClean = input.pharmacyEmail?.trim() || null;

        const latVal = typeof input.latitude === "number" ? input.latitude : null;
        const lngVal = typeof input.longitude === "number" ? input.longitude : null;

        let linkedUserId: string | null = null;
        if (input.accountEmail && input.accountEmail.trim()) {
            linkedUserId = await createOrUpdateLinkedUserAccount({
                existingUserId: input.userId,
                name: `${nameClean} Medical Admin`,
                email: input.accountEmail,
                password: input.accountPassword,
                role: "RHU_CENTER_ADMIN",
                department: "RHU Center Medical Admin",
                managedBarangay: barangayClean || undefined
            });
        }

        let linkedPharmacyUserId: string | null = null;
        if (input.pharmacyEmail && input.pharmacyEmail.trim()) {
            linkedPharmacyUserId = await createOrUpdateLinkedUserAccount({
                existingUserId: input.pharmacyUserId,
                name: `${nameClean} Pharmacy`,
                email: input.pharmacyEmail,
                password: input.pharmacyPassword,
                role: "RHU_PHARMACY",
                department: "RHU Center Pharmacy",
                managedBarangay: barangayClean || undefined
            });
        }

        let createdSuccess = false;
        const model = getCenterModel();

        if (model) {
            try {
                await model.create({
                    data: {
                        id: centerId,
                        name: nameClean,
                        code: codeClean,
                        location: locationClean,
                        latitude: latVal,
                        longitude: lngVal,
                        barangay: barangayClean,
                        contactNumber: contactClean,
                        operatingHours: hoursClean,
                        headPersonnel: headClean,
                        servicesOffered: servicesClean,
                        status: statusClean,
                        remarks: remarksClean,
                        accountEmail: accountEmailClean,
                        userId: linkedUserId,
                        pharmacyEmail: pharmacyEmailClean,
                        pharmacyUserId: linkedPharmacyUserId
                    }
                });
                createdSuccess = true;
            } catch (pErr) {
                console.warn("Prisma model create center failed, falling back to raw SQL:", pErr);
            }
        }

        if (!createdSuccess) {
            await prisma.$executeRaw`
                INSERT INTO "RHUHealthCenter" (
                    "id", "name", "code", "location", "latitude", "longitude", "barangay", "contactNumber", "operatingHours", "headPersonnel", "servicesOffered", "status", "remarks", "accountEmail", "userId", "pharmacyEmail", "pharmacyUserId", "createdAt", "updatedAt"
                ) VALUES (
                    ${centerId}, ${nameClean}, ${codeClean}, ${locationClean}, ${latVal}, ${lngVal}, ${barangayClean}, ${contactClean}, ${hoursClean}, ${headClean}, ${servicesClean}, ${statusClean}, ${remarksClean}, ${accountEmailClean}, ${linkedUserId}, ${pharmacyEmailClean}, ${linkedPharmacyUserId}, NOW(), NOW()
                )
            `;
        }

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating RHU health center:", error);
        return { success: false, error: error?.message || "Failed to create health center" };
    }
}

export async function updateRHUHealthCenter(id: string, input: Partial<RHUHealthCenterInput>) {
    try {
        const auth = await checkCenterManageAuth();
        if (!auth.authorized) return { success: false, error: auth.error };

        if (!id) {
            return { success: false, error: "Health center ID is required" };
        }

        // Fetch the existing center to get current user IDs
        let existingCenter: any = null;
        try {
            const raw: any[] = await prisma.$queryRaw`SELECT * FROM "RHUHealthCenter" WHERE "id" = ${id}`;
            existingCenter = raw[0];
        } catch { }
        const currentUserId = input.userId || existingCenter?.userId || null;
        const currentPharmacyUserId = input.pharmacyUserId || existingCenter?.pharmacyUserId || null;

        if (input.accountEmail && input.accountEmail.trim()) {
            const check = await checkEmailUniqueness(input.accountEmail, currentUserId);
            if (!check.isUnique) {
                return { success: false, error: check.error };
            }
        }
        if (input.pharmacyEmail && input.pharmacyEmail.trim()) {
            const check = await checkEmailUniqueness(input.pharmacyEmail, currentPharmacyUserId);
            if (!check.isUnique) {
                return { success: false, error: check.error };
            }
        }

        const nameClean = input.name?.trim();
        const codeClean = input.code?.trim() || null;
        const locationClean = input.location?.trim();
        const latVal = typeof input.latitude === "number" ? input.latitude : null;
        const lngVal = typeof input.longitude === "number" ? input.longitude : null;
        const barangayClean = input.barangay?.trim() || null;
        const contactClean = input.contactNumber?.trim() || null;
        const hoursClean = input.operatingHours?.trim() || "Mon-Fri 8:00 AM - 5:00 PM";
        const headClean = input.headPersonnel?.trim() || null;
        const servicesClean = input.servicesOffered?.trim() || null;
        const statusClean = input.status || "ACTIVE";
        const remarksClean = input.remarks?.trim() || null;
        const accountEmailClean = input.accountEmail !== undefined
            ? (input.accountEmail && input.accountEmail.trim() ? input.accountEmail.trim() : null)
            : undefined;
        const pharmacyEmailClean = input.pharmacyEmail !== undefined
            ? (input.pharmacyEmail && input.pharmacyEmail.trim() ? input.pharmacyEmail.trim() : null)
            : undefined;

        let linkedUserId: string | null = input.userId || null;
        if (input.accountEmail && input.accountEmail.trim()) {
            linkedUserId = await createOrUpdateLinkedUserAccount({
                existingUserId: input.userId,
                name: `${input.name || "Health Center"} Medical Admin`,
                email: input.accountEmail,
                password: input.accountPassword,
                role: "RHU_CENTER_ADMIN",
                department: "RHU Center Medical Admin",
                managedBarangay: barangayClean || undefined
            });
        } else if (input.accountEmail !== undefined && (!input.accountEmail || !input.accountEmail.trim())) {
            linkedUserId = null;
        }

        let linkedPharmacyUserId: string | null = input.pharmacyUserId || null;
        if (input.pharmacyEmail && input.pharmacyEmail.trim()) {
            linkedPharmacyUserId = await createOrUpdateLinkedUserAccount({
                existingUserId: input.pharmacyUserId,
                name: `${input.name || "Health Center"} Pharmacy`,
                email: input.pharmacyEmail,
                password: input.pharmacyPassword,
                role: "RHU_PHARMACY",
                department: "RHU Center Pharmacy",
                managedBarangay: barangayClean || undefined
            });
        } else if (input.pharmacyEmail !== undefined && (!input.pharmacyEmail || !input.pharmacyEmail.trim())) {
            linkedPharmacyUserId = null;
        }

        let updateSuccess = false;
        const model = getCenterModel();

        if (model && nameClean && locationClean) {
            try {
                const updateData: any = {
                    name: nameClean,
                    code: codeClean,
                    location: locationClean,
                    latitude: latVal,
                    longitude: lngVal,
                    barangay: barangayClean,
                    contactNumber: contactClean,
                    operatingHours: hoursClean,
                    headPersonnel: headClean,
                    servicesOffered: servicesClean,
                    status: statusClean,
                    remarks: remarksClean
                };
                if (accountEmailClean !== undefined) updateData.accountEmail = accountEmailClean;
                if (linkedUserId !== undefined) updateData.userId = linkedUserId;
                if (pharmacyEmailClean !== undefined) updateData.pharmacyEmail = pharmacyEmailClean;
                if (linkedPharmacyUserId !== undefined) updateData.pharmacyUserId = linkedPharmacyUserId;

                await model.update({
                    where: { id },
                    data: updateData
                });
                updateSuccess = true;
            } catch (pErr) {
                console.warn("Prisma model update center failed, falling back to raw SQL:", pErr);
            }
        }

        if (!updateSuccess) {
            await prisma.$executeRaw`
                UPDATE "RHUHealthCenter" 
                SET "name" = COALESCE(${nameClean}, "name"),
                    "code" = ${codeClean},
                    "location" = COALESCE(${locationClean}, "location"),
                    "latitude" = ${latVal},
                    "longitude" = ${lngVal},
                    "barangay" = ${barangayClean},
                    "contactNumber" = ${contactClean},
                    "operatingHours" = ${hoursClean},
                    "headPersonnel" = ${headClean},
                    "servicesOffered" = ${servicesClean},
                    "status" = ${statusClean},
                    "remarks" = ${remarksClean},
                    "accountEmail" = CASE WHEN ${accountEmailClean !== undefined} THEN ${accountEmailClean} ELSE "accountEmail" END,
                    "userId" = CASE WHEN ${linkedUserId !== undefined} THEN ${linkedUserId} ELSE "userId" END,
                    "pharmacyEmail" = CASE WHEN ${pharmacyEmailClean !== undefined} THEN ${pharmacyEmailClean} ELSE "pharmacyEmail" END,
                    "pharmacyUserId" = CASE WHEN ${linkedPharmacyUserId !== undefined} THEN ${linkedPharmacyUserId} ELSE "pharmacyUserId" END,
                    "updatedAt" = NOW()
                WHERE "id" = ${id}
            `;
        }

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating RHU health center:", error);
        return { success: false, error: error?.message || "Failed to update health center" };
    }
}

export async function deleteRHUHealthCenter(id: string) {
    try {
        const auth = await checkCenterManageAuth();
        if (!auth.authorized) return { success: false, error: auth.error };

        if (!id) {
            return { success: false, error: "Health center ID is required" };
        }

        // 1. Fetch the center to get linked user accounts
        let center: any = null;
        try {
            const raw: any[] = await prisma.$queryRaw`SELECT * FROM "RHUHealthCenter" WHERE "id" = ${id}`;
            center = raw[0];
        } catch (err) {
            console.error("Error fetching center for deletion:", err);
        }

        // 2. Fetch all personnel assigned to this center to get their user accounts
        let personnelList: any[] = [];
        try {
            personnelList = await prisma.$queryRaw`SELECT * FROM "RHUMedicalPersonnel" WHERE "healthCenterId" = ${id}`;
        } catch (err) {
            console.error("Error fetching personnel for deletion:", err);
        }

        // 3. Collect all user IDs to delete
        const userIdsToDelete = new Set<string>();
        if (center) {
            if (center.userId) userIdsToDelete.add(center.userId);
            if (center.pharmacyUserId) userIdsToDelete.add(center.pharmacyUserId);
        }
        for (const p of personnelList) {
            if (p.userId) userIdsToDelete.add(p.userId);
        }

        // 4. Delete the medical personnel records first (due to foreign key constraint)
        try {
            await prisma.$executeRaw`DELETE FROM "RHUMedicalPersonnel" WHERE "healthCenterId" = ${id}`;
        } catch (err) {
            console.error("Error deleting personnel records:", err);
        }

        // 5. Delete the health center record
        let deleteSuccess = false;
        const model = getCenterModel();

        if (model) {
            try {
                await model.delete({ where: { id } });
                deleteSuccess = true;
            } catch (pErr) {
                console.warn("Prisma model delete center failed, falling back to raw SQL:", pErr);
            }
        }

        if (!deleteSuccess) {
            await prisma.$executeRaw`DELETE FROM "RHUHealthCenter" WHERE "id" = ${id}`;
        }

        // 6. Delete the linked User accounts
        for (const uid of userIdsToDelete) {
            try {
                await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${uid}`;
            } catch (err) {
                console.error(`Failed to delete user account ${uid}:`, err);
            }
        }

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting RHU health center:", error);
        return { success: false, error: error?.message || "Failed to delete health center" };
    }
}

// ==========================================
// MEDICAL PERSONNEL SERVER ACTIONS
// ==========================================

export async function getRHUMedicalPersonnel(params?: RHUMedicalPersonnelFilterParams) {
    try {
        await ensureMedicalPersonnelTableExists();

        let personnel: any[] = [];
        const model = getPersonnelModel();

        if (model) {
            try {
                personnel = await model.findMany({
                    include: {
                        healthCenter: true
                    },
                    orderBy: { name: "asc" }
                });
            } catch (pErr) {
                console.warn("Prisma personnel model findMany failed, fallback raw SQL:", pErr);
                personnel = await prisma.$queryRaw`
                    SELECT p.*, c."name" as "healthCenterName"
                    FROM "RHUMedicalPersonnel" p
                    LEFT JOIN "RHUHealthCenter" c ON p."healthCenterId" = c."id"
                    ORDER BY p."name" ASC
                `;
            }
        } else {
            personnel = await prisma.$queryRaw`
                SELECT p.*, c."name" as "healthCenterName"
                FROM "RHUMedicalPersonnel" p
                LEFT JOIN "RHUHealthCenter" c ON p."healthCenterId" = c."id"
                ORDER BY p."name" ASC
            `;
        }

        // Apply filters in JS
        if (params?.search && params.search.trim()) {
            const q = params.search.trim().toLowerCase();
            personnel = personnel.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.specialization && p.specialization.toLowerCase().includes(q)) ||
                (p.licenseNumber && p.licenseNumber.toLowerCase().includes(q)) ||
                (p.assignedServices && p.assignedServices.toLowerCase().includes(q)) ||
                (p.healthCenter?.name && p.healthCenter.name.toLowerCase().includes(q))
            );
        }

        if (params?.role && params.role !== "ALL") {
            personnel = personnel.filter(p => p.role === params.role);
        }

        if (params?.healthCenterId && params.healthCenterId !== "ALL") {
            personnel = personnel.filter(p => p.healthCenterId === params.healthCenterId);
        }

        if (params?.status && params.status !== "ALL") {
            personnel = personnel.filter(p => p.status === params.status);
        }

        return { success: true, data: personnel };
    } catch (error: any) {
        console.error("Error fetching RHU medical personnel:", error);
        return { success: false, error: error?.message || "Failed to fetch medical personnel" };
    }
}

async function syncHealthCenterServices(healthCenterId: string | null | undefined, assignedServices: string | null | undefined) {
    if (!healthCenterId || healthCenterId === "NONE" || !assignedServices || !assignedServices.trim()) {
        return;
    }

    try {
        const centerModel = getCenterModel();
        let center: any = null;

        if (centerModel) {
            try {
                center = await centerModel.findUnique({ where: { id: healthCenterId } });
            } catch (err) {
                console.warn("Prisma findUnique center failed:", err);
            }
        }

        if (!center) {
            const rawRes: any[] = await prisma.$queryRaw`SELECT * FROM "RHUHealthCenter" WHERE "id" = ${healthCenterId}`;
            center = rawRes[0] || null;
        }

        if (!center) return;

        const currentServices = (center.servicesOffered || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);

        const newServices = assignedServices
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);

        let updated = false;
        const mergedServices = [...currentServices];

        for (const ns of newServices) {
            const exists = mergedServices.some(s => s.toLowerCase() === ns.toLowerCase());
            if (!exists) {
                mergedServices.push(ns);
                updated = true;
            }
        }

        if (updated) {
            const updatedServicesStr = mergedServices.join(", ");
            if (centerModel) {
                try {
                    await centerModel.update({
                        where: { id: healthCenterId },
                        data: { servicesOffered: updatedServicesStr }
                    });
                } catch {
                    await prisma.$executeRaw`
                        UPDATE "RHUHealthCenter"
                        SET "servicesOffered" = ${updatedServicesStr}, "updatedAt" = NOW()
                        WHERE "id" = ${healthCenterId}
                    `;
                }
            } else {
                await prisma.$executeRaw`
                    UPDATE "RHUHealthCenter"
                    SET "servicesOffered" = ${updatedServicesStr}, "updatedAt" = NOW()
                    WHERE "id" = ${healthCenterId}
                `;
            }
        }
    } catch (err) {
        console.warn("Failed to sync health center services:", err);
    }
}

export async function createRHUMedicalPersonnel(input: RHUMedicalPersonnelInput) {
    try {
        const auth = await checkCenterManageAuth();
        if (!auth.authorized) return { success: false, error: auth.error };

        await ensureMedicalPersonnelTableExists();

        if (!input.name || !input.name.trim()) {
            return { success: false, error: "Personnel name is required" };
        }
        if (!input.role) {
            return { success: false, error: "Medical role is required" };
        }

        if (input.accountEmail && input.accountEmail.trim()) {
            const check = await checkEmailUniqueness(input.accountEmail);
            if (!check.isUnique) {
                return { success: false, error: check.error };
            }
        }

        const id = `medpers${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
        const nameClean = input.name.trim();
        const roleClean = input.role;
        const specClean = input.specialization?.trim() || null;
        const licenseClean = input.licenseNumber?.trim() || null;
        const contactClean = input.contactNumber?.trim() || null;
        const emailClean = input.email?.trim() || null;
        const schedClean = input.schedule?.trim() || "Mon-Fri 8:00 AM - 5:00 PM";
        const servicesClean = input.assignedServices?.trim() || null;
        const statusClean = input.status || "ACTIVE";
        const centerIdClean = input.healthCenterId && input.healthCenterId !== "NONE" ? input.healthCenterId : null;
        const accountEmailClean = input.accountEmail && input.accountEmail.trim() ? input.accountEmail.trim() : null;

        let linkedUserId: string | null = null;
        if (input.accountEmail && input.accountEmail.trim()) {
            let userRole: "RHU_CENTER_ADMIN" | "RHU_DOCTOR" | "RHU_STAFF" | "RHU_PHARMACY" = "RHU_STAFF";
            const roleUpper = (roleClean || "").toUpperCase();
            if (roleUpper === "ADMIN" || roleUpper.includes("ADMIN")) {
                userRole = "RHU_CENTER_ADMIN";
            } else if (roleUpper === "PHARMACY" || roleUpper.includes("PHARMACY")) {
                userRole = "RHU_PHARMACY";
            } else {
                userRole = "RHU_STAFF";
            }
            linkedUserId = await createOrUpdateLinkedUserAccount({
                existingUserId: input.userId,
                name: nameClean,
                email: input.accountEmail,
                password: input.accountPassword,
                role: userRole,
                department: roleUpper === "ADMIN" ? "RHU Center Medical Admin" : (roleUpper === "PHARMACY" ? "RHU Center Pharmacy" : `RHU Medical Staff (${roleClean})`)
            });
        }

        let createdSuccess = false;
        const model = getPersonnelModel();

        if (model) {
            try {
                await model.create({
                    data: {
                        id,
                        name: nameClean,
                        role: roleClean,
                        specialization: specClean,
                        licenseNumber: licenseClean,
                        contactNumber: contactClean,
                        email: emailClean,
                        schedule: schedClean,
                        assignedServices: servicesClean,
                        status: statusClean,
                        healthCenterId: centerIdClean,
                        accountEmail: accountEmailClean,
                        userId: linkedUserId
                    }
                });
                createdSuccess = true;
            } catch (pErr) {
                console.warn("Prisma model create personnel failed, raw SQL fallback:", pErr);
            }
        }

        if (!createdSuccess) {
            await prisma.$executeRaw`
                INSERT INTO "RHUMedicalPersonnel" (
                    "id", "name", "role", "specialization", "licenseNumber", "contactNumber", "email", "schedule", "assignedServices", "status", "healthCenterId", "accountEmail", "userId", "createdAt", "updatedAt"
                ) VALUES (
                    ${id}, ${nameClean}, ${roleClean}, ${specClean}, ${licenseClean}, ${contactClean}, ${emailClean}, ${schedClean}, ${servicesClean}, ${statusClean}, ${centerIdClean}, ${accountEmailClean}, ${linkedUserId}, NOW(), NOW()
                )
            `;
        }

        if (centerIdClean && servicesClean) {
            await syncHealthCenterServices(centerIdClean, servicesClean);
        }

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating RHU medical personnel:", error);
        return { success: false, error: error?.message || "Failed to create medical personnel" };
    }
}

export async function updateRHUMedicalPersonnel(id: string, input: Partial<RHUMedicalPersonnelInput>) {
    try {
        const auth = await checkCenterManageAuth();
        if (!auth.authorized) return { success: false, error: auth.error };

        if (!id) {
            return { success: false, error: "Medical personnel ID is required" };
        }

        let existingPersonnel: any = null;
        try {
            const raw: any[] = await prisma.$queryRaw`SELECT * FROM "RHUMedicalPersonnel" WHERE "id" = ${id}`;
            existingPersonnel = raw[0];
        } catch { }
        const currentUserId = input.userId || existingPersonnel?.userId || null;

        if (input.accountEmail && input.accountEmail.trim()) {
            const check = await checkEmailUniqueness(input.accountEmail, currentUserId);
            if (!check.isUnique) {
                return { success: false, error: check.error };
            }
        }

        const nameClean = input.name?.trim();
        const roleClean = input.role;
        const specClean = input.specialization !== undefined ? (input.specialization?.trim() || null) : undefined;
        const licenseClean = input.licenseNumber !== undefined ? (input.licenseNumber?.trim() || null) : undefined;
        const contactClean = input.contactNumber !== undefined ? (input.contactNumber?.trim() || null) : undefined;
        const emailClean = input.email !== undefined ? (input.email?.trim() || null) : undefined;
        const schedClean = input.schedule !== undefined ? (input.schedule?.trim() || "Mon-Fri 8:00 AM - 5:00 PM") : undefined;
        const servicesClean = input.assignedServices !== undefined ? (input.assignedServices?.trim() || null) : undefined;
        const statusClean = input.status;
        const centerIdClean = input.healthCenterId !== undefined ? (input.healthCenterId && input.healthCenterId !== "NONE" ? input.healthCenterId : null) : undefined;
        const accountEmailClean = input.accountEmail !== undefined
            ? (input.accountEmail && input.accountEmail.trim() ? input.accountEmail.trim() : null)
            : undefined;

        let linkedUserId: string | null = input.userId || null;
        if (input.accountEmail && input.accountEmail.trim()) {
            const roleToMap = input.role || existingPersonnel?.role || "DOCTOR";
            const roleUpper = (roleToMap || "").toUpperCase();
            let userRole: "RHU_CENTER_ADMIN" | "RHU_DOCTOR" | "RHU_STAFF" | "RHU_PHARMACY" = "RHU_STAFF";
            if (roleUpper === "ADMIN" || roleUpper.includes("ADMIN")) {
                userRole = "RHU_CENTER_ADMIN";
            } else if (roleUpper === "PHARMACY" || roleUpper.includes("PHARMACY")) {
                userRole = "RHU_PHARMACY";
            } else {
                userRole = "RHU_STAFF";
            }
            linkedUserId = await createOrUpdateLinkedUserAccount({
                existingUserId: input.userId,
                name: input.name || existingPersonnel?.name || "Medical Personnel",
                email: input.accountEmail,
                password: input.accountPassword,
                role: userRole,
                department: roleUpper === "ADMIN" ? "RHU Center Medical Admin" : (roleUpper === "PHARMACY" ? "RHU Center Pharmacy" : `RHU Medical Staff (${roleToMap})`)
            });
        } else if (input.accountEmail !== undefined && (!input.accountEmail || !input.accountEmail.trim())) {
            linkedUserId = null;
        }

        let updateSuccess = false;
        const model = getPersonnelModel();

        if (model) {
            try {
                const updateData: any = {};
                if (nameClean) updateData.name = nameClean;
                if (roleClean) updateData.role = roleClean;
                if (specClean !== undefined) updateData.specialization = specClean;
                if (licenseClean !== undefined) updateData.licenseNumber = licenseClean;
                if (contactClean !== undefined) updateData.contactNumber = contactClean;
                if (emailClean !== undefined) updateData.email = emailClean;
                if (schedClean !== undefined) updateData.schedule = schedClean;
                if (servicesClean !== undefined) updateData.assignedServices = servicesClean;
                if (statusClean) updateData.status = statusClean;
                if (centerIdClean !== undefined) updateData.healthCenterId = centerIdClean;
                if (accountEmailClean !== undefined) updateData.accountEmail = accountEmailClean;
                if (linkedUserId !== undefined) updateData.userId = linkedUserId;

                await model.update({
                    where: { id },
                    data: updateData
                });
                updateSuccess = true;
            } catch (pErr) {
                console.warn("Prisma model update personnel failed, raw SQL fallback:", pErr);
            }
        }

        if (!updateSuccess) {
            await prisma.$executeRaw`
                UPDATE "RHUMedicalPersonnel"
                SET "name" = COALESCE(${nameClean}, "name"),
                    "role" = COALESCE(${roleClean}, "role"),
                    "specialization" = ${specClean !== undefined ? specClean : null},
                    "licenseNumber" = ${licenseClean !== undefined ? licenseClean : null},
                    "contactNumber" = ${contactClean !== undefined ? contactClean : null},
                    "email" = ${emailClean !== undefined ? emailClean : null},
                    "schedule" = ${schedClean !== undefined ? schedClean : null},
                    "assignedServices" = ${servicesClean !== undefined ? servicesClean : null},
                    "status" = COALESCE(${statusClean}, "status"),
                    "healthCenterId" = ${centerIdClean !== undefined ? centerIdClean : null},
                    "accountEmail" = ${accountEmailClean !== undefined ? accountEmailClean : null},
                    "userId" = ${linkedUserId !== undefined ? linkedUserId : null},
                    "updatedAt" = NOW()
                WHERE "id" = ${id}
            `;
        }

        if (servicesClean) {
            let targetCenterId = centerIdClean;
            if (!targetCenterId) {
                try {
                    const pModel = getPersonnelModel();
                    let p: any = null;
                    if (pModel) {
                        p = await pModel.findUnique({ where: { id } });
                    }
                    if (!p) {
                        const rawRes: any[] = await prisma.$queryRaw`SELECT * FROM "RHUMedicalPersonnel" WHERE "id" = ${id}`;
                        p = rawRes[0];
                    }
                    targetCenterId = p?.healthCenterId;
                } catch (err) {
                    console.warn("Failed to fetch personnel for center sync:", err);
                }
            }
            if (targetCenterId) {
                await syncHealthCenterServices(targetCenterId, servicesClean);
            }
        }

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating RHU medical personnel:", error);
        return { success: false, error: error?.message || "Failed to update medical personnel" };
    }
}

export async function deleteRHUMedicalPersonnel(id: string) {
    try {
        const auth = await checkCenterManageAuth();
        if (!auth.authorized) return { success: false, error: auth.error };

        if (!id) {
            return { success: false, error: "Medical personnel ID is required" };
        }

        let deleteSuccess = false;
        const model = getPersonnelModel();

        if (model) {
            try {
                await model.delete({ where: { id } });
                deleteSuccess = true;
            } catch (pErr) {
                console.warn("Prisma model delete personnel failed, fallback raw SQL:", pErr);
            }
        }

        if (!deleteSuccess) {
            await prisma.$executeRaw`DELETE FROM "RHUMedicalPersonnel" WHERE "id" = ${id}`;
        }

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting RHU medical personnel:", error);
        return { success: false, error: error?.message || "Failed to delete medical personnel" };
    }
}
