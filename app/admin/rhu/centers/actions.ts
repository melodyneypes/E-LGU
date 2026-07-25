"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

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
}

export interface RHUHealthCenterFilterParams {
    search?: string;
    barangay?: string;
    status?: string;
}

function getCenterModel() {
    return (prisma as any).rHUHealthCenter || (prisma as any).RHUHealthCenter;
}

export async function ensureHealthCenterTableExists() {
    try {
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

        // Check count
        const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "RHUHealthCenter"`;
        const total = Number(countRes[0]?.count || 0);

        if (total === 0) {
            // Seed initial Mapandan Health Centers
            const initialCenters = [
                {
                    id: `cmrctr${Date.now()}1`,
                    name: "Main Rural Health Unit (RHU)",
                    code: "RHU-MAIN",
                    location: "Poblacion, Mapandan, Pangasinan",
                    barangay: "Poblacion",
                    contactNumber: "(075) 555-0101",
                    operatingHours: "Mon-Fri 8:00 AM - 5:00 PM",
                    headPersonnel: "Dr. Municipal Health Officer",
                    servicesOffered: "General Consultation, Vaccination, Animal Bite Care, Maternal & Child Health, Dental, Laboratory",
                    status: "ACTIVE",
                    remarks: "Central Municipal Health Center"
                },
                {
                    id: `cmrctr${Date.now()}2`,
                    name: "Barangay Coral Health Station",
                    code: "BHS-CORAL",
                    location: "Barangay Hall Complex, Coral, Mapandan",
                    barangay: "Coral",
                    contactNumber: "(075) 555-0102",
                    operatingHours: "Mon-Fri 8:00 AM - 4:00 PM",
                    headPersonnel: "Midwife Elena Garcia",
                    servicesOffered: "General Consultation, Prenatal Care, Immunization, First Aid",
                    status: "ACTIVE",
                    remarks: "Barangay Sub-station"
                },
                {
                    id: `cmrctr${Date.now()}3`,
                    name: "Barangay Torres Health Station",
                    code: "BHS-TORRES",
                    location: "Main Road, Torres, Mapandan",
                    barangay: "Torres",
                    contactNumber: "(075) 555-0103",
                    operatingHours: "Mon-Fri 8:00 AM - 4:00 PM",
                    headPersonnel: "Nurse Rita Ramos",
                    servicesOffered: "General Check-up, Blood Pressure Monitoring, BP & Diabetes Screening",
                    status: "ACTIVE",
                    remarks: "Community Health Station"
                }
            ];

            for (const c of initialCenters) {
                await prisma.$executeRaw`
                    INSERT INTO "RHUHealthCenter" (
                        "id", "name", "code", "location", "barangay", "contactNumber", "operatingHours", "headPersonnel", "servicesOffered", "status", "remarks", "createdAt", "updatedAt"
                    ) VALUES (
                        ${c.id}, ${c.name}, ${c.code}, ${c.location}, ${c.barangay}, ${c.contactNumber}, ${c.operatingHours}, ${c.headPersonnel}, ${c.servicesOffered}, ${c.status}, ${c.remarks}, NOW(), NOW()
                    )
                    ON CONFLICT DO NOTHING;
                `;
            }
        }
    } catch (err) {
        console.error("Error in ensureHealthCenterTableExists:", err);
    }
}

export async function getRHUHealthCenters(params?: RHUHealthCenterFilterParams) {
    try {
        await ensureHealthCenterTableExists();

        let centers: any[] = [];
        const model = getCenterModel();

        if (model) {
            try {
                centers = await model.findMany({
                    orderBy: { name: "asc" }
                });
            } catch (pErr) {
                console.warn("Prisma center model findMany failed, using raw SQL fallback:", pErr);
                centers = await prisma.$queryRaw`
                    SELECT * FROM "RHUHealthCenter" ORDER BY "name" ASC
                `;
            }
        } else {
            centers = await prisma.$queryRaw`
                SELECT * FROM "RHUHealthCenter" ORDER BY "name" ASC
            `;
        }

        // Apply filters in JS
        if (params?.search && params.search.trim()) {
            const q = params.search.trim().toLowerCase();
            centers = centers.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.code && c.code.toLowerCase().includes(q)) ||
                (c.location && c.location.toLowerCase().includes(q)) ||
                (c.barangay && c.barangay.toLowerCase().includes(q)) ||
                (c.headPersonnel && c.headPersonnel.toLowerCase().includes(q))
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
        await ensureHealthCenterTableExists();

        if (!input.name || !input.name.trim()) {
            return { success: false, error: "Health center name is required" };
        }
        if (!input.location || !input.location.trim()) {
            return { success: false, error: "Location address is required" };
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

        const latVal = typeof input.latitude === "number" ? input.latitude : null;
        const lngVal = typeof input.longitude === "number" ? input.longitude : null;

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
                        remarks: remarksClean
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
                    "id", "name", "code", "location", "latitude", "longitude", "barangay", "contactNumber", "operatingHours", "headPersonnel", "servicesOffered", "status", "remarks", "createdAt", "updatedAt"
                ) VALUES (
                    ${centerId}, ${nameClean}, ${codeClean}, ${locationClean}, ${latVal}, ${lngVal}, ${barangayClean}, ${contactClean}, ${hoursClean}, ${headClean}, ${servicesClean}, ${statusClean}, ${remarksClean}, NOW(), NOW()
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
        if (!id) {
            return { success: false, error: "Health center ID is required" };
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

        let updateSuccess = false;
        const model = getCenterModel();

        if (model && nameClean && locationClean) {
            try {
                await model.update({
                    where: { id },
                    data: {
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
                    }
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
        if (!id) {
            return { success: false, error: "Health center ID is required" };
        }

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

        revalidatePath("/admin/rhu/centers");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting RHU health center:", error);
        return { success: false, error: error?.message || "Failed to delete health center" };
    }
}
