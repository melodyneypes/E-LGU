"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile } from "@/lib/storage";
import { logActivity } from "@/lib/audit";
import { randomUUID } from "crypto";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

async function verifyRHUAccess() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { authorized: false, error: "Unauthorized access. Please login." };
    }
    return { authorized: true, user: session.user };
}

async function checkWritePermission(user: any) {
    const userRole = (user?.role || "").toUpperCase();
    const userDept = (user?.department || "").toUpperCase();
    const matchedCenter = await getMatchedCenterForUser(user);

    // 1. GLOBAL RHU ADMINISTRATORS (Full Municipality-Wide Access):
    const isGlobalAdmin = 
        userRole === "RHU_ADMIN" ||
        userRole === "ADMIN" ||
        userRole === "SUPER_ADMIN" ||
        userRole === "ADMIN_AIDE" ||
        (userDept === "LGU" && userRole.includes("ADMIN"));

    // 2. HEALTH CENTER ADMINISTRATORS (Clinic-Scoped Admin Access):
    const isCenterAdmin = 
        userRole === "RHU_CENTER_ADMIN" ||
        userDept.includes("CENTER MEDICAL ADMIN");

    // 3. MEDICAL & CLINIC STAFF (BHS Local Inventory Facility-Scoped Operational Access):
    const isStaff = 
        userRole === "RHU_STAFF" ||
        userRole === "RHU_DOCTOR" ||
        userRole === "RHU_PHARMACY" ||
        userRole === "STAFF" ||
        userRole === "USER";

    const hasBHSLocalAccess = Boolean(matchedCenter) || isCenterAdmin || isStaff;

    return {
        isGlobalAdmin,
        isCenterAdmin,
        isStaff,
        hasBHSLocalAccess,
        matchedCenter,
        // Operational privileges: Request Orders (RO) can only be filed by BHS Health Center staff/clinics, not Central RHU Administrators:
        canFileRO: (Boolean(matchedCenter) || isCenterAdmin) && !isGlobalAdmin,
        canReceiveSO: isGlobalAdmin || hasBHSLocalAccess,
        canRegisterLocalAsset: false,
        canFileRepair: isGlobalAdmin || hasBHSLocalAccess,
        canUpdateAsset: isGlobalAdmin || hasBHSLocalAccess,
        // Central Procurement & Administrative privileges restricted to Global RHU Admins:
        canCreatePO: isGlobalAdmin,
        canIntakePO: isGlobalAdmin,
        canDispatchSO: isGlobalAdmin,
        canVerifyLegacy: isGlobalAdmin,
        canCondemnAsset: isGlobalAdmin,
        // Operational access allowed:
        allowed: isGlobalAdmin || hasBHSLocalAccess,
        // Only true for completely unauthenticated / unauthorized external visitors:
        isReadOnly: !isGlobalAdmin && !hasBHSLocalAccess
    };
}

function sanitize(val?: string | null): string {
    return val ? val.trim() : "";
}

// =========================================================================
// RAW DB COMPATIBILITY LAYER (Works even if Prisma Client isn't regenerated)
// =========================================================================

async function queryRawSafe<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
        if (params.length > 0) {
            return await (prisma as any).$queryRawUnsafe(query, ...params);
        }
        return await (prisma as any).$queryRawUnsafe(query);
    } catch (e: any) {
        console.error("[queryRawSafe Error]", e.message, query);
        return [];
    }
}

async function executeRawSafe(query: string, params: any[] = []): Promise<number> {
    try {
        if (params.length > 0) {
            return await (prisma as any).$executeRawUnsafe(query, ...params);
        }
        return await (prisma as any).$executeRawUnsafe(query);
    } catch (e: any) {
        console.error("[executeRawSafe Error]", e.message, query);
        throw e;
    }
}

let isCatalogTableEnsured = false;
let cachedSiteLogo: string | null = null;

// Ensure the Master Equipment Catalog table exists safely and non-destructively
async function ensureCatalogTable() {
    if (isCatalogTableEnsured) return;
    try {
        await executeRawSafe(`
            CREATE TABLE IF NOT EXISTS "EquipmentCatalogItem" (
                "id" TEXT PRIMARY KEY,
                "equipmentName" TEXT NOT NULL UNIQUE,
                "brand" TEXT,
                "model" TEXT,
                "category" "PropertyCategory" NOT NULL DEFAULT 'SEMI_EXPENDABLE',
                "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
                "description" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Seed from distinct equipmentNames already in MedicalAsset if table was just created
        await executeRawSafe(`
            INSERT INTO "EquipmentCatalogItem" ("id", "equipmentName", "brand", "category", "estimatedCost", "createdAt", "updatedAt")
            SELECT 
                md5(random()::text || clock_timestamp()::text),
                TRIM("equipmentName"),
                MAX("brand"),
                MAX("category"),
                COALESCE(AVG("unitCost"), 0),
                NOW(),
                NOW()
            FROM "MedicalAsset"
            WHERE "equipmentName" IS NOT NULL AND TRIM("equipmentName") != ''
            GROUP BY TRIM("equipmentName")
            ON CONFLICT ("equipmentName") DO NOTHING;
        `);

        // Ensure tables are subscribed to supabase_realtime publication
        await executeRawSafe(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    BEGIN
                        ALTER PUBLICATION supabase_realtime ADD TABLE "EquipmentRequestOrder";
                    EXCEPTION WHEN duplicate_object THEN
                    END;
                    BEGIN
                        ALTER PUBLICATION supabase_realtime ADD TABLE "EquipmentStockTransfer";
                    EXCEPTION WHEN duplicate_object THEN
                    END;
                    BEGIN
                        ALTER PUBLICATION supabase_realtime ADD TABLE "EquipmentStockReturnTicket";
                    EXCEPTION WHEN duplicate_object THEN
                    END;
                END IF;
            END $$;
        `);
        isCatalogTableEnsured = true;
    } catch {
        // Safe ignore
    }
}

// =========================================================================
// 1. MASTER LEDGER & STATS
// =========================================================================

export async function getRHUEquipmentData(facilityFilter?: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error, assets: [], catalogItems: [], pos: [], ros: [], sos: [], returns: [], matchedCenter: null, isReadOnly: true };
        }

        await ensureCatalogTable();

        const perm = await checkWritePermission(auth.user);
        const matchedCenter = perm.matchedCenter;

        let assetQuery = `SELECT * FROM "MedicalAsset"`;
        const params: any[] = [];

        // Center scoping: Health Centers can ONLY see equipment belonging to their own facility
        if (matchedCenter) {
            assetQuery += ` WHERE "currentFacility" = $1`;
            params.push(matchedCenter.name);
        } else if (facilityFilter && facilityFilter !== "ALL") {
            assetQuery += ` WHERE "currentFacility" = $1`;
            params.push(facilityFilter);
        }
        assetQuery += ` ORDER BY "createdAt" DESC`;

        // Scope orders & returns based on center
        const poQuery = `SELECT * FROM "EquipmentPurchaseOrder" ORDER BY "createdAt" DESC`;
        let roQuery = `SELECT * FROM "EquipmentRequestOrder"`;
        let soQuery = `SELECT * FROM "EquipmentStockTransfer"`;
        let returnsQuery = `SELECT * FROM "EquipmentStockReturnTicket"`;

        const roParams: any[] = [];
        const soParams: any[] = [];
        const returnsParams: any[] = [];

        if (matchedCenter) {
            roQuery += ` WHERE "requestingFacility" = $1`;
            roParams.push(matchedCenter.name);

            soQuery += ` WHERE "targetFacility" = $1`;
            soParams.push(matchedCenter.name);

            returnsQuery += ` WHERE "bhsFacility" = $1`;
            returnsParams.push(matchedCenter.name);
        }

        roQuery += ` ORDER BY "createdAt" DESC`;
        soQuery += ` ORDER BY "dispatchedAt" DESC`;
        returnsQuery += ` ORDER BY "createdAt" DESC`;

        // Central stockroom assets are held at Main RHU Central Stockroom.
        // Both RHU Admins and BHS Health Centers need stockroom assets so clinics can view and requisition available stock.
        const stockroomAssetsQuery = `
            SELECT * FROM "MedicalAsset" 
            WHERE "currentStatus" = 'IN_STOCKROOM' 
              AND COALESCE("availableQty", "quantity", 1) > 0
            ORDER BY "equipmentName" ASC
        `;

        const queries: Promise<any>[] = [
            queryRawSafe(assetQuery, params),
            queryRawSafe(`SELECT * FROM "EquipmentCatalogItem" ORDER BY "equipmentName" ASC`),
            queryRawSafe(poQuery),
            queryRawSafe(`SELECT * FROM "EquipmentPOItem"`),
            queryRawSafe(roQuery, roParams),
            queryRawSafe(`SELECT * FROM "EquipmentROItem"`),
            queryRawSafe(soQuery, soParams),
            queryRawSafe(`SELECT * FROM "EquipmentSOItem"`),
            queryRawSafe(returnsQuery, returnsParams),
            queryRawSafe(`SELECT id, name, code, barangay, status FROM "RHUHealthCenter" WHERE status IS NULL OR UPPER(status) = 'ACTIVE' ORDER BY name ASC`)
        ];

        if (matchedCenter) {
            queries.push(queryRawSafe(stockroomAssetsQuery));
        }
        if (!cachedSiteLogo) {
            queries.push(queryRawSafe(`SELECT value FROM "SystemSetting" WHERE key = 'site_logo' LIMIT 1`));
        }

        const results = await Promise.all(queries);

        const assets = results[0] || [];
        const catalogItems = results[1] || [];
        const rawPOs = results[2] || [];
        const poItems = results[3] || [];
        const rawROs = results[4] || [];
        const roItems = results[5] || [];
        const rawSOs = results[6] || [];
        const soItems = results[7] || [];
        const returns = results[8] || [];
        const rawCenters = results[9] || [];

        let resultIdx = 10;
        let stockroomAssets: any[] = [];
        if (matchedCenter) {
            stockroomAssets = results[resultIdx++] || [];
        } else {
            stockroomAssets = assets
                .filter((a: any) => a.currentStatus === "IN_STOCKROOM" && (a.availableQty != null ? Number(a.availableQty) : (a.quantity != null ? Number(a.quantity) : 1)) > 0)
                .sort((a: any, b: any) => (a.equipmentName || "").localeCompare(b.equipmentName || ""));
        }

        if (!cachedSiteLogo && results[resultIdx]) {
            cachedSiteLogo = results[resultIdx][0]?.value || "";
        }
        const siteLogo = cachedSiteLogo || "";

        // Attach items
        const pos = rawPOs.map((po: any) => ({
            ...po,
            items: poItems.filter((i: any) => i.poId === po.id)
        }));

        const ros = rawROs.map((ro: any) => ({
            ...ro,
            items: roItems.filter((i: any) => i.roId === ro.id)
        }));

        const sos = rawSOs.map((so: any) => ({
            ...so,
            items: soItems.filter((i: any) => i.soId === so.id)
        }));

        return {
            success: true,
            siteLogo,
            assets,
            stockroomAssets,
            catalogItems,
            pos,
            ros,
            sos,
            returns,
            centers: rawCenters,
            matchedCenter: matchedCenter ? {
                id: matchedCenter.id,
                name: matchedCenter.name,
                code: matchedCenter.code,
                barangay: matchedCenter.barangay
            } : null,
            isReadOnly: perm.isReadOnly,
            isGlobalAdmin: Boolean(perm.isGlobalAdmin),
            canDispatchSO: Boolean(perm.canDispatchSO),
            canFileRO: Boolean(perm.canFileRO)
        };
    } catch (error: any) {
        console.error("[getRHUEquipmentData] Error:", error);
        return { success: false, error: error.message, siteLogo: "", assets: [], stockroomAssets: [], catalogItems: [], pos: [], ros: [], sos: [], returns: [], matchedCenter: null, isReadOnly: true, isGlobalAdmin: false, canDispatchSO: false, canFileRO: false };
    }
}

// =========================================================================
// 2. MASTER EQUIPMENT CATALOG REGISTRY (Purchasable Items Definition)
// =========================================================================

export async function registerEquipmentCatalogItem(data: {
    equipmentName: string;
    brand?: string;
    model?: string;
    category?: "PPE" | "SEMI_EXPENDABLE";
    estimatedCost?: number;
    description?: string;
}) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.allowed) {
            return {
                success: false,
                error: "Access Denied: You do not have permission to register equipment catalog items."
            };
        }

        const name = sanitize(data.equipmentName);
        if (!name || !name.trim()) {
            return { success: false, error: "Equipment Name is required." };
        }

        await ensureCatalogTable();

        const cost = Number(data.estimatedCost) || 0;
        const category = data.category || (cost > 50000 ? "PPE" : "SEMI_EXPENDABLE");
        const brand = data.brand ? sanitize(data.brand) : null;
        const model = data.model ? sanitize(data.model) : null;
        const description = data.description ? sanitize(data.description) : null;
        const id = randomUUID();

        const existing = await queryRawSafe(
            `SELECT * FROM "EquipmentCatalogItem" WHERE LOWER("equipmentName") = LOWER($1)`,
            [name.trim()]
        );

        let catalogItem;
        if (existing && existing.length > 0) {
            const updated = await queryRawSafe(`
                UPDATE "EquipmentCatalogItem"
                SET "brand" = COALESCE($1, "brand"),
                    "model" = COALESCE($2, "model"),
                    "category" = $3::"PropertyCategory",
                    "estimatedCost" = $4,
                    "description" = COALESCE($5, "description"),
                    "updatedAt" = NOW()
                WHERE id = $6
                RETURNING *
            `, [brand, model, category, cost, description, existing[0].id]);
            catalogItem = updated[0];
        } else {
            const inserted = await queryRawSafe(`
                INSERT INTO "EquipmentCatalogItem" (
                    id, "equipmentName", "brand", "model", "category",
                    "estimatedCost", "description", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5::"PropertyCategory",
                    $6, $7, NOW(), NOW()
                ) RETURNING *
            `, [id, name.trim(), brand, model, category, cost, description]);
            catalogItem = inserted[0];
        }

        await logActivity({
            action: "CREATE",
            entityType: "EquipmentCatalogItem",
            entityId: catalogItem.id,
            entityName: catalogItem.equipmentName,
            description: `Registered equipment catalog specification "${catalogItem.equipmentName}".`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, catalogItem };
    } catch (error: any) {
        console.error("[registerEquipmentCatalogItem] Error:", error);
        return { success: false, error: error.message || "Failed to register catalog item" };
    }
}

export async function deleteEquipmentCatalogItem(id: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.isGlobalAdmin) {
            return { success: false, error: "Access Denied: Only RHU Central Administrators can remove items from the catalog." };
        }

        await executeRawSafe(`DELETE FROM "EquipmentCatalogItem" WHERE id = $1`, [id]);
        revalidatePath("/admin/rhu/equipment");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteEquipmentCatalogItem] Error:", error);
        return { success: false, error: error.message || "Failed to delete catalog item" };
    }
}

// =========================================================================
// 3. PHYSICAL ASSET CRUD & ONBOARDING GATE
// =========================================================================

export async function saveMedicalAsset(formData: FormData) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.allowed) {
            return {
                success: false,
                error: "Access Denied: You do not have permission to register or modify equipment."
            };
        }

        const id = formData.get("id") as string | null;
        const equipmentName = sanitize(formData.get("equipmentName") as string);
        const brand = sanitize(formData.get("brand") as string) || null;
        const serialNo = sanitize(formData.get("serialNo") as string) || "UNKNOWN/NONE";
        const unitCost = parseFloat(formData.get("unitCost") as string) || 0;
        let currentFacility = sanitize(formData.get("currentFacility") as string);
        const assignedRoom = sanitize(formData.get("assignedRoom") as string);
        const accountablePerson = sanitize(formData.get("accountablePerson") as string) || "Unassigned";
        const accountableEmployeeId = sanitize(formData.get("accountableEmployeeId") as string) || null;
        const rawAcquisitionSource = formData.get("acquisitionSource") as string;
        if (!rawAcquisitionSource || !rawAcquisitionSource.trim()) {
            return { success: false, error: "Acquisition Source is required." };
        }
        const acquisitionSource = sanitize(rawAcquisitionSource);
        const isLegacyBHS = acquisitionSource === "LEGACY_BHS_EXISTING" || acquisitionSource === "DIRECT_DONATION";

        const matchedCenter = await getMatchedCenterForUser(auth.user);
        if (matchedCenter) {
            if (!id) {
                return {
                    success: false,
                    error: "Access Denied: Health Centers are not permitted to register equipment directly. All equipment must be registered and issued by Main RHU."
                };
            }
            // Lock facility strictly to the user's matched center
            currentFacility = matchedCenter.name;
        }

        if (id) {
            const existing = await queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE id = $1`, [id]);
            if (existing.length > 0 && matchedCenter && existing[0].currentFacility !== matchedCenter.name) {
                return { success: false, error: `Access Denied: You cannot modify equipment belonging to ${existing[0].currentFacility}.` };
            }
        }

        if (!equipmentName) {
            return { success: false, error: "Equipment name is required." };
        }

        if (!currentFacility) {
            return { success: false, error: "Health Facility Location is required." };
        }

        if (!assignedRoom) {
            return { success: false, error: "Specific Room Placement is required." };
        }

        // COA Property Classification Threshold: > 50,000 = PPE (PAR), <= 50,000 = SEMI_EXPENDABLE (ICS)
        const category = unitCost > 50000 ? "PPE" : "SEMI_EXPENDABLE";
        const docPrefix = category === "PPE" ? "PAR" : "ICS";
        const year = new Date().getFullYear();

        // Photo Upload
        let photoUrl: string | null = null;
        const photoFile = formData.get("photoFile") as File | null;
        if (photoFile && photoFile.size > 0) {
            const buffer = Buffer.from(await photoFile.arrayBuffer());
            const baseName = photoFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `rhu-equipment/asset_${Date.now()}_${baseName}.webp`;
            const uploaded = await uploadFile(buffer, fileName, "system-assets", "image/webp");
            if (uploaded) photoUrl = uploaded;
        }

        const rawQty = formData.get("quantity") as string | null;
        const parsedQty = rawQty && rawQty.trim() !== "" ? Math.max(0, parseInt(rawQty.trim(), 10) || 0) : 0;

        let asset: any;

        if (id) {
            let updateQuery = `
                UPDATE "MedicalAsset" SET
                    "equipmentName" = $1,
                    "brand" = $2,
                    "serialNo" = $3,
                    "category" = $4::"PropertyCategory",
                    "unitCost" = $5,
                    "currentFacility" = $6,
                    "assignedRoom" = $7,
                    "accountablePerson" = $8,
                    "accountableEmployeeId" = $9,
                    "acquisitionSource" = $10::"AcquisitionSource",
                    "quantity" = $11,
                    "availableQty" = $12,
                    "updatedAt" = NOW()
            `;
            const params: any[] = [
                equipmentName,
                brand,
                serialNo,
                category,
                unitCost,
                currentFacility,
                assignedRoom,
                accountablePerson,
                accountableEmployeeId,
                acquisitionSource,
                parsedQty,
                parsedQty
            ];

            if (photoUrl) {
                updateQuery += `, "photoUrl" = $13 WHERE id = $14 RETURNING *`;
                params.push(photoUrl, id);
            } else {
                updateQuery += ` WHERE id = $13 RETURNING *`;
                params.push(id);
            }

            const updated = await queryRawSafe(updateQuery, params);
            asset = updated[0];

            await logActivity({
                action: "UPDATE",
                entityType: "MedicalAsset",
                entityId: id,
                entityName: asset?.assetTagNo || "Asset",
                description: `Updated medical asset "${equipmentName}" at ${currentFacility}.`
            });
        } else {
            const facCode = currentFacility.includes("Main") ? "RHU" : "BHS";
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const assetTagNo = `PROP-${year}-${facCode}-${randomCode}`;
            const documentReference = `${docPrefix}-${year}-${randomCode}`;

            const currentStatus = isLegacyBHS 
                ? "PENDING_VERIFICATION" 
                : currentFacility.includes("Main") && assignedRoom.includes("Stockroom") 
                    ? "IN_STOCKROOM" 
                    : "DEPLOYED_SERVICEABLE";

            const newId = randomUUID();

            const inserted = await queryRawSafe(`
                INSERT INTO "MedicalAsset" (
                    id, "assetTagNo", "equipmentName", "brand", "serialNo",
                    "category", "acquisitionSource", "unitCost", "quantity", "availableQty", "currentStatus",
                    "currentFacility", "assignedRoom", "accountablePerson",
                    "accountableEmployeeId", "documentReference", "photoUrl",
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6::"PropertyCategory", $7::"AcquisitionSource", $8, $9, $10, $11::"MedicalAssetStatus",
                    $12, $13, $14,
                    $15, $16, $17,
                    NOW(), NOW()
                ) RETURNING *
            `, [
                newId, assetTagNo, equipmentName, brand, serialNo,
                category, acquisitionSource, unitCost, parsedQty, parsedQty, currentStatus,
                currentFacility, assignedRoom, accountablePerson,
                accountableEmployeeId, documentReference, photoUrl
            ]);

            asset = inserted[0];

            await logActivity({
                action: "CREATE",
                entityType: "MedicalAsset",
                entityId: asset.id,
                entityName: assetTagNo,
                description: `Registered medical asset "${equipmentName}" (${assetTagNo}) with status ${currentStatus}.`
            });
        }

        revalidatePath("/admin/rhu/equipment");
        return { success: true, asset };
    } catch (error: any) {
        console.error("[saveMedicalAsset] Error:", error);
        return { success: false, error: error.message || "Failed to save medical asset" };
    }
}

export async function verifyLegacyAsset(assetId: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canVerifyLegacy) {
            return { success: false, error: "Access Denied: Approving legacy assets is restricted to RHU Central Supply Administrators." };
        }

        const updated = await queryRawSafe(`
            UPDATE "MedicalAsset"
            SET "currentStatus" = 'DEPLOYED_SERVICEABLE'::"MedicalAssetStatus", "updatedAt" = NOW()
            WHERE id = $1
            RETURNING *
        `, [assetId]);

        const asset = updated[0];

        await logActivity({
            action: "APPROVE",
            entityType: "MedicalAsset",
            entityId: assetId,
            entityName: asset?.assetTagNo || "Asset",
            description: `Supply Officer approved legacy asset "${asset?.equipmentName}" (${asset?.assetTagNo}).`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, asset };
    } catch (error: any) {
        console.error("[verifyLegacyAsset] Error:", error);
        return { success: false, error: error.message || "Failed to verify asset" };
    }
}

export async function deleteMedicalAsset(id: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.isGlobalAdmin) {
            return { success: false, error: "Access Denied: Deleting equipment from the master registry is restricted to RHU Central Administrators." };
        }

        await executeRawSafe(`DELETE FROM "MedicalAsset" WHERE id = $1`, [id]);

        await logActivity({
            action: "DELETE",
            entityType: "MedicalAsset",
            entityId: id,
            entityName: "Medical Asset",
            description: `Deleted medical asset ID ${id}.`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteMedicalAsset] Error:", error);
        return { success: false, error: error.message || "Failed to delete asset" };
    }
}

// =========================================================================
// 3. DEFECT REPORTING & REPAIR WORKFLOW
// =========================================================================

export async function fileDefectRepairRequest(formData: FormData) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canFileRepair) {
            return { success: false, error: "Access Denied: You do not have permission to file repair tickets." };
        }

        const assetId = formData.get("assetId") as string;
        const defectDetails = sanitize(formData.get("defectDetails") as string);

        if (!assetId || !defectDetails) {
            return { success: false, error: "Asset ID and defect description are required." };
        }

        const existing = await queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE id = $1`, [assetId]);
        if (!existing[0]) return { success: false, error: "Asset not found." };
        const parent = existing[0];

        if (perm.matchedCenter && !perm.isGlobalAdmin && parent.currentFacility !== perm.matchedCenter.name) {
            return { 
                success: false, 
                error: `Access Denied: You can only file defect requests for equipment deployed at ${perm.matchedCenter.name}.` 
            };
        }

        // Photo Upload Handling (Verification photo attached by Nurse / Midwife)
        let photoUrl: string | null = parent.photoUrl || null;
        const photoFile = formData.get("photoFile") as File | null;
        if (photoFile && photoFile.size > 0) {
            const buffer = Buffer.from(await photoFile.arrayBuffer());
            const baseName = photoFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_");
            const fileName = `rhu-equipment/defect_${Date.now()}_${baseName}.webp`;
            const uploaded = await uploadFile(buffer, fileName, "system-assets", "image/webp");
            if (uploaded) photoUrl = uploaded;
        }

        const availableStock = parent.availableQty != null ? Number(parent.availableQty) : (parent.quantity != null ? Number(parent.quantity) : 1);
        const rawDefectQty = parseInt(formData.get("defectQuantity") as string || "1", 10);
        const defectQty = Math.max(1, Math.min(availableStock, isNaN(rawDefectQty) ? 1 : rawDefectQty));

        let asset: any;

        if (defectQty < availableStock) {
            // Partial quantity flagged: decrement active serviceable parent, create new split asset for defective unit(s)
            const remainingQty = availableStock - defectQty;
            await executeRawSafe(`
                UPDATE "MedicalAsset"
                SET "quantity" = $1,
                    "availableQty" = $1,
                    "updatedAt" = NOW()
                WHERE id = $2
            `, [remainingQty, parent.id]);

            const splitAssetId = randomUUID();
            const randSuffix = Math.floor(1000 + Math.random() * 9000);
            const splitTagNo = `${parent.assetTagNo}-DEF${randSuffix}`;

            const inserted = await queryRawSafe(`
                INSERT INTO "MedicalAsset" (
                    id, "assetTagNo", "equipmentName", brand, "serialNo",
                    category, "acquisitionSource", "unitCost", "acquisitionDate",
                    "currentStatus", "currentFacility", "assignedRoom", "accountablePerson",
                    "accountableEmployeeId", "documentReference", "photoUrl", "poReferenceNo",
                    "soReferenceNo", "defectDetails", "quantity", "availableQty", "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6::"PropertyCategory", $7::"AcquisitionSource", $8, $9,
                    'DEFECTIVE_FOR_REPAIR'::"MedicalAssetStatus", $10, $11, $12,
                    $13, $14, $15, $16,
                    $17, $18, $19, 0, NOW(), NOW()
                ) RETURNING *
            `, [
                splitAssetId, splitTagNo, parent.equipmentName, parent.brand || null, parent.serialNo || "UNKNOWN/NONE",
                parent.category, parent.acquisitionSource, parent.unitCost || 0, parent.acquisitionDate || new Date(),
                parent.currentFacility, parent.assignedRoom, parent.accountablePerson,
                parent.accountableEmployeeId || null, parent.documentReference || null, photoUrl, parent.poReferenceNo || null,
                parent.soReferenceNo || null, defectDetails, defectQty
            ]);

            asset = inserted[0];

            await logActivity({
                action: "UPDATE",
                entityType: "MedicalAsset",
                entityId: splitAssetId,
                entityName: splitTagNo,
                description: `Flagged ${defectQty} unit(s) of "${parent.equipmentName}" as defective (${splitTagNo}): ${defectDetails}. (${remainingQty} units remain active at ${parent.currentFacility}).`
            });
        } else {
            // Full batch flagged: update existing asset to DEFECTIVE_FOR_REPAIR
            const updated = await queryRawSafe(`
                UPDATE "MedicalAsset"
                SET "currentStatus" = 'DEFECTIVE_FOR_REPAIR'::"MedicalAssetStatus",
                    "defectDetails" = $1,
                    "photoUrl" = $2,
                    "availableQty" = 0,
                    "updatedAt" = NOW()
                WHERE id = $3
                RETURNING *
            `, [defectDetails, photoUrl, assetId]);

            asset = updated[0];

            await logActivity({
                action: "UPDATE",
                entityType: "MedicalAsset",
                entityId: assetId,
                entityName: asset?.assetTagNo || "Asset",
                description: `Reported defect on "${asset?.equipmentName}" (${asset?.assetTagNo}): ${defectDetails}.${photoFile && photoFile.size > 0 ? " Verification photo attached." : ""}`
            });
        }

        revalidatePath("/admin/rhu/equipment");
        return { success: true, asset };
    } catch (error: any) {
        console.error("[fileDefectRepairRequest] Error:", error);
        return { success: false, error: error.message || "Failed to file repair ticket" };
    }
}

export async function resolveEquipmentRepair(assetId: string, isRepaired: boolean, notes?: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canCondemnAsset && !perm.isGlobalAdmin) {
            return { success: false, error: "Access Denied: Resolving repairs and condemning equipment is restricted to RHU Central Maintenance & Supply Administrators." };
        }

        const existing = await queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE id = $1`, [assetId]);
        if (!existing[0]) return { success: false, error: "Asset not found." };

        const currentStatus = isRepaired ? "DEPLOYED_SERVICEABLE" : "UNSERVICEABLE_FOR_CONDEMNATION";
        const defectDetails = notes 
            ? (isRepaired ? `Repaired: ${notes}` : `Unserviceable (For Condemnation): ${notes}`)
            : (isRepaired ? "Repaired and returned to active service." : "Flagged unserviceable beyond economical repair.");

        const targetAvailableQty = isRepaired ? (existing[0].quantity || 1) : 0;

        const updated = await queryRawSafe(`
            UPDATE "MedicalAsset"
            SET "currentStatus" = $1::"MedicalAssetStatus",
                "lastRepairDate" = NOW(),
                "defectDetails" = $2,
                "availableQty" = $3,
                "updatedAt" = NOW()
            WHERE id = $4
            RETURNING *
        `, [currentStatus, defectDetails, targetAvailableQty, assetId]);

        const asset = updated[0];

        await logActivity({
            action: "UPDATE",
            entityType: "MedicalAsset",
            entityId: assetId,
            entityName: asset?.assetTagNo || "Asset",
            description: isRepaired 
                ? `Repaired asset "${asset?.equipmentName}" returned to active service. Notes: ${notes || "None"}`
                : `Asset "${asset?.equipmentName}" marked UNSERVICEABLE_FOR_CONDEMNATION for COA disposal. Findings: ${notes || "None"}`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, asset };
    } catch (error: any) {
        console.error("[resolveEquipmentRepair] Error:", error);
        return { success: false, error: error.message || "Failed to update repair status" };
    }
}

// =========================================================================
// 4. PURCHASE ORDER (PO) & STOCKROOM INTAKE
// =========================================================================

export async function createEquipmentPO(data: {
    vendorName: string;
    vendorContact?: string;
    notes?: string;
    linkedRoNumber?: string;
    items: Array<{ equipmentName: string; brand?: string; quantity: number; unitCost: number }>;
}) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canCreatePO) {
            return { success: false, error: "Access Denied: Creating purchase orders is restricted to RHU Central Supply Administrators." };
        }

        if (!data.vendorName || !data.items || data.items.length === 0) {
            return { success: false, error: "Vendor name and at least one item are required." };
        }

        await executeRawSafe(`ALTER TABLE "EquipmentPurchaseOrder" ADD COLUMN IF NOT EXISTS "linkedRoNumber" TEXT;`);
        await executeRawSafe(`ALTER TABLE "EquipmentRequestOrder" ADD COLUMN IF NOT EXISTS "linkedPoNumber" TEXT;`);

        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const poNumber = `PO-${year}-RHU-${rand}`;
        const poId = randomUUID();

        let totalAmount = 0;
        data.items.forEach(i => {
            totalAmount += (Number(i.quantity) || 1) * (Number(i.unitCost) || 0);
        });

        const createdByName = (auth.user as any)?.name || "Supply Officer";
        const createdById = (auth.user as any)?.id ? String((auth.user as any).id) : null;

        const insertedPO = await queryRawSafe(`
            INSERT INTO "EquipmentPurchaseOrder" (
                id, "poNumber", "vendorName", "vendorContact", "totalAmount",
                "status", "createdByName", "createdById", "notes", "linkedRoNumber",
                "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5,
                'DRAFT', $6, $7, $8, $9,
                NOW(), NOW()
            ) RETURNING *
        `, [
            poId, poNumber, data.vendorName.trim(), data.vendorContact?.trim() || null, totalAmount,
            createdByName, createdById, data.notes?.trim() || null, data.linkedRoNumber?.trim() || null
        ]);

        const po = insertedPO[0];
        const formattedItems: any[] = [];

        for (const item of data.items) {
            const itemId = randomUUID();
            const qty = Number(item.quantity) || 1;
            const cost = Number(item.unitCost) || 0;
            const total = qty * cost;

            const insertedItem = await queryRawSafe(`
                INSERT INTO "EquipmentPOItem" (
                    id, "poId", "equipmentName", "brand", "quantity",
                    "receivedQty", "unitCost", "totalCost", "status"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    0, $6, $7, 'PENDING'
                ) RETURNING *
            `, [
                itemId, poId, item.equipmentName.trim(), item.brand?.trim() || null, qty,
                cost, total
            ]);
            formattedItems.push(insertedItem[0]);
        }

        po.items = formattedItems;

        // If linked to an RO, update the RO's status and linkedPoNumber
        if (data.linkedRoNumber) {
            await executeRawSafe(`
                UPDATE "EquipmentRequestOrder"
                SET "status" = 'PO_ORDERED',
                    "linkedPoNumber" = $1,
                    "updatedAt" = NOW()
                WHERE "roNumber" = $2
            `, [poNumber, data.linkedRoNumber.trim()]);
        }

        await logActivity({
            action: "CREATE",
            entityType: "EquipmentPO",
            entityId: po.id,
            entityName: po.poNumber,
            description: data.linkedRoNumber
                ? `Created Purchase Order ${po.poNumber} from vendor "${po.vendorName}" linked to Requisition ${data.linkedRoNumber}.`
                : `Created Purchase Order ${po.poNumber} from vendor "${po.vendorName}".`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, po };
    } catch (error: any) {
        console.error("[createEquipmentPO] Error:", error);
        return { success: false, error: error.message || "Failed to create PO" };
    }
}

export async function intakePOToStockroom(
    poId: string,
    receivedItems: Array<{ itemId: string; receivedQty: number; damagedQty?: number; missingQty?: number }>,
    inspectionNotes?: string
) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canIntakePO) {
            return { success: false, error: "Access Denied: Stockroom intake encoding is restricted to RHU Central Supply Administrators." };
        }

        await executeRawSafe(`ALTER TABLE "MedicalAsset" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL DEFAULT 1;`);
        await executeRawSafe(`ALTER TABLE "MedicalAsset" ADD COLUMN IF NOT EXISTS "availableQty" INTEGER NOT NULL DEFAULT 1;`);
        await executeRawSafe(`ALTER TABLE "EquipmentPOItem" ADD COLUMN IF NOT EXISTS "damagedQty" INTEGER NOT NULL DEFAULT 0;`);
        await executeRawSafe(`ALTER TABLE "EquipmentPOItem" ADD COLUMN IF NOT EXISTS "missingQty" INTEGER NOT NULL DEFAULT 0;`);
        await executeRawSafe(`ALTER TABLE "EquipmentPurchaseOrder" ADD COLUMN IF NOT EXISTS "inspectionNotes" TEXT;`);

        const poRows = await queryRawSafe(`SELECT * FROM "EquipmentPurchaseOrder" WHERE id = $1`, [poId]);
        const po = poRows[0];
        if (!po) return { success: false, error: "Purchase order not found." };

        const items = await queryRawSafe(`SELECT * FROM "EquipmentPOItem" WHERE "poId" = $1`, [poId]);
        const year = new Date().getFullYear();

        let encodedCount = 0;
        let totalDamagedCount = 0;
        let totalMissingCount = 0;

        for (const item of items) {
            const match = receivedItems.find(r => r.itemId === item.id);
            const count = match ? Number(match.receivedQty) || 0 : Number(item.quantity);
            const damaged = match ? Number(match.damagedQty) || 0 : 0;
            const missing = match ? Number(match.missingQty) || 0 : 0;

            totalDamagedCount += damaged;
            totalMissingCount += missing;

            const previousReceived = Number(item.receivedQty) || 0;
            const cumulativeReceived = previousReceived + count;
            const itemStatus = cumulativeReceived >= Number(item.quantity) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

            await executeRawSafe(`
                UPDATE "EquipmentPOItem"
                SET "receivedQty" = $1,
                    "damagedQty" = COALESCE("damagedQty", 0) + $2,
                    "missingQty" = $3,
                    "status" = $4
                WHERE id = $5
            `, [cumulativeReceived, damaged, missing, itemStatus, item.id]);

            if (count > 0) {
                const category = Number(item.unitCost) > 50000 ? "PPE" : "SEMI_EXPENDABLE";
                const rand = Math.floor(1000 + Math.random() * 9000);
                const assetTagNo = `PROP-${year}-RHU-${rand}`;
                const docRef = `${category === "PPE" ? "PAR" : "ICS"}-${year}-${rand}`;
                const assetId = randomUUID();

                await executeRawSafe(`
                    INSERT INTO "MedicalAsset" (
                        id, "assetTagNo", "equipmentName", "brand", "category",
                        "acquisitionSource", "unitCost", "quantity", "availableQty", "currentStatus",
                        "currentFacility", "assignedRoom", "accountablePerson",
                        "documentReference", "poReferenceNo", "createdAt", "updatedAt"
                    ) VALUES (
                        $1, $2, $3, $4, $5::"PropertyCategory",
                        'STOCKROOM_ISSUANCE'::"AcquisitionSource", $6, $7, $8, 'IN_STOCKROOM'::"MedicalAssetStatus",
                        'Main Rural Health Unit (RHU)', 'Central Stockroom', 'RHU Supply Custodian',
                        $9, $10, NOW(), NOW()
                    )
                `, [
                    assetId, assetTagNo, item.equipmentName, item.brand || null, category,
                    Number(item.unitCost) || 0, count, count, docRef, po.poNumber
                ]);

                encodedCount += count;
            }
        }

        const updatedItems = await queryRawSafe(`SELECT * FROM "EquipmentPOItem" WHERE "poId" = $1`, [poId]);
        const allFulfilled = updatedItems.every((i: any) => (Number(i.receivedQty) || 0) >= (Number(i.quantity) || 1));

        const poStatus = allFulfilled 
            ? 'DELIVERED_INTAKE' 
            : (totalDamagedCount > 0 || totalMissingCount > 0 ? 'PARTIAL_INTAKE_DISCREPANCY' : 'PARTIAL_INTAKE');

        const updatedPORows = await queryRawSafe(`
            UPDATE "EquipmentPurchaseOrder"
            SET "status" = $1,
                "inspectionNotes" = $2,
                "updatedAt" = NOW()
            WHERE id = $3
            RETURNING *
        `, [poStatus, inspectionNotes?.trim() || po.inspectionNotes || null, poId]);

        if (po.linkedRoNumber && encodedCount > 0) {
            await executeRawSafe(`
                UPDATE "EquipmentRequestOrder"
                SET "status" = 'SUBMITTED', "updatedAt" = NOW()
                WHERE "roNumber" = $1 AND "status" != 'CONVERTED_TO_SO'
            `, [po.linkedRoNumber]);
        }

        await logActivity({
            action: "UPDATE",
            entityType: "EquipmentPO",
            entityId: po.id,
            entityName: po.poNumber,
            description: totalDamagedCount > 0 || totalMissingCount > 0
                ? `Stockroom intake with discrepancies for PO ${po.poNumber}: ${encodedCount} accepted good units encoded, ${totalDamagedCount} damaged units rejected (RTV), ${totalMissingCount} shortage.`
                : `Executed stockroom intake of ${encodedCount} total units for PO ${po.poNumber}. Assets recorded in Central Stockroom.`
        });

        revalidatePath("/admin/rhu/equipment");
        return {
            success: true,
            po: updatedPORows[0],
            newAssetCount: encodedCount,
            damagedCount: totalDamagedCount,
            missingCount: totalMissingCount,
            poStatus
        };
    } catch (error: any) {
        console.error("[intakePOToStockroom] Error:", error);
        return { success: false, error: error.message || "Failed to intake PO items" };
    }
}

// =========================================================================
// 5. REQUEST ORDERS (RO) & STOCK TRANSFERS (SO)
// =========================================================================

export async function createEquipmentRO(data: {
    requestingFacility: string;
    requestedRoom: string;
    requestedBy: string;
    justification?: string;
    items: Array<{ equipmentName: string; quantity: number; estimatedUnitCost?: number; urgency?: string }>;
}) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canFileRO) {
            return { success: false, error: "Access Denied: Requisitions (Request Orders) can only be filed by Barangay Health Stations and Health Center staff." };
        }

        const matchedCenter = perm.matchedCenter;
        const facility = matchedCenter ? matchedCenter.name : data.requestingFacility;

        const year = new Date().getFullYear();
        const facCode = facility.replace(/[^A-Za-z0-9]/g, "").substring(0, 8).toUpperCase();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const roNumber = `RO-${year}-${facCode}-${rand}`;
        const roId = randomUUID();

        const insertedRO = await queryRawSafe(`
            INSERT INTO "EquipmentRequestOrder" (
                id, "roNumber", "requestingFacility", "requestedRoom",
                "requestedBy", "justification", "status", "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, 'SUBMITTED', NOW(), NOW()
            ) RETURNING *
        `, [
            roId, roNumber, facility, data.requestedRoom,
            data.requestedBy, data.justification?.trim() || null
        ]);

        const ro = insertedRO[0];
        const formattedItems: any[] = [];

        for (const item of data.items) {
            const itemId = randomUUID();
            const qty = Number(item.quantity) || 1;
            const estCost = Number(item.estimatedUnitCost) || 0;

            const insertedItem = await queryRawSafe(`
                INSERT INTO "EquipmentROItem" (
                    id, "roId", "equipmentName", "quantity", "estimatedUnitCost", "urgency"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6
                ) RETURNING *
            `, [
                itemId, roId, item.equipmentName.trim(), qty, estCost, item.urgency || "NORMAL"
            ]);
            formattedItems.push(insertedItem[0]);
        }

        ro.items = formattedItems;

        await logActivity({
            action: "CREATE",
            entityType: "EquipmentRO",
            entityId: ro.id,
            entityName: ro.roNumber,
            description: `Submitted Request Order ${ro.roNumber} for ${ro.requestingFacility}.`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, ro };
    } catch (error: any) {
        console.error("[createEquipmentRO] Error:", error);
        return { success: false, error: error.message || "Failed to file RO" };
    }
}

export async function dispatchStockTransfer(data: {
    linkedRoNumber?: string;
    targetFacility: string;
    targetRoom: string;
    dispatchedBy: string;
    notes?: string;
    selectedAssetIds: string[];
    dispatchQuantities?: Record<string, number>;
}) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canDispatchSO) {
            return { success: false, error: "Access Denied: Dispatching stock transfers is restricted to RHU Central Supply Administrators." };
        }

        if (!data.selectedAssetIds || data.selectedAssetIds.length === 0) {
            return { success: false, error: "Please select at least one stockroom asset to dispatch." };
        }

        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const soNumber = `SO-${year}-RHU-${rand}`;
        const soId = randomUUID();

        // Fetch selected stockroom assets
        const placeholders = data.selectedAssetIds.map((_, i) => `$${i + 1}`).join(",");
        const assets = await queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE id IN (${placeholders})`, data.selectedAssetIds);

        const isPPE = assets.some((a: any) => a.category === "PPE" || Number(a.unitCost) > 50000);
        const documentType = isPPE ? "PAR" : "ICS";
        const documentReference = `${documentType}-${year}-${rand}`;

        const insertedSO = await queryRawSafe(`
            INSERT INTO "EquipmentStockTransfer" (
                id, "soNumber", "linkedRoNumber", "targetFacility", "targetRoom",
                "dispatchedBy", "dispatchedAt", "status", "documentType",
                "documentReference", "notes"
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, NOW(), 'DISPATCHED', $7,
                $8, $9
            ) RETURNING *
        `, [
            soId, soNumber, data.linkedRoNumber || null, data.targetFacility, data.targetRoom,
            data.dispatchedBy, documentType,
            documentReference, data.notes?.trim() || null
        ]);

        const so = insertedSO[0];
        const formattedItems: any[] = [];
        let totalTransferredUnits = 0;

        for (const a of assets) {
            const itemId = randomUUID();
            const cost = Number(a.unitCost) || 0;
            const availableStock = a.availableQty != null ? Number(a.availableQty) : (a.quantity != null ? Number(a.quantity) : 1);
            const requestedQty = data.dispatchQuantities?.[a.id] ? Number(data.dispatchQuantities[a.id]) : 1;
            const transferQty = Math.max(1, Math.min(availableStock, requestedQty));
            const totalItemCost = cost * transferQty;
            totalTransferredUnits += transferQty;

            if (transferQty >= availableStock) {
                // Full batch transferred: update existing asset to destination facility
                const insertedItem = await queryRawSafe(`
                    INSERT INTO "EquipmentSOItem" (
                        id, "soId", "assetId", "equipmentName", "brand",
                        "serialNo", "quantity", "unitCost", "totalCost", "status"
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, 'DISPATCHED'
                    ) RETURNING *
                `, [
                    itemId, soId, a.id, a.equipmentName, a.brand,
                    a.serialNo, transferQty, cost, totalItemCost
                ]);
                formattedItems.push(insertedItem[0]);

                // Auto-deduct asset from Central Stockroom and set destination target
                await executeRawSafe(`
                    UPDATE "MedicalAsset"
                    SET "currentStatus" = 'SO_DISPATCHED'::"MedicalAssetStatus",
                        "currentFacility" = $1,
                        "assignedRoom" = $2,
                        "soReferenceNo" = $3,
                        "documentReference" = $4,
                        "updatedAt" = NOW()
                    WHERE id = $5
                `, [data.targetFacility, data.targetRoom, soNumber, documentReference, a.id]);
            } else {
                // Partial quantity transferred: reduce Central Stockroom stock and create transferred asset record
                const remainingStock = availableStock - transferQty;
                await executeRawSafe(`
                    UPDATE "MedicalAsset"
                    SET "quantity" = $1,
                        "availableQty" = $1,
                        "updatedAt" = NOW()
                    WHERE id = $2
                `, [remainingStock, a.id]);

                const transferredAssetId = randomUUID();
                const randSuffix = Math.floor(1000 + Math.random() * 9000);
                const transferredTagNo = `${a.assetTagNo}-TR${randSuffix}`;

                await executeRawSafe(`
                    INSERT INTO "MedicalAsset" (
                        id, "assetTagNo", "equipmentName", brand, "serialNo",
                        category, "acquisitionSource", "unitCost", "acquisitionDate",
                        "currentStatus", "currentFacility", "assignedRoom", "accountablePerson",
                        "documentReference", "photoUrl", "poReferenceNo", "soReferenceNo",
                        "quantity", "availableQty", "createdAt", "updatedAt"
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        $6::"PropertyCategory", 'STOCKROOM_ISSUANCE'::"AcquisitionSource", $7, $8,
                        'SO_DISPATCHED'::"MedicalAssetStatus", $9, $10, $11,
                        $12, $13, $14, $15,
                        $16, $16, NOW(), NOW()
                    )
                `, [
                    transferredAssetId, transferredTagNo, a.equipmentName, a.brand || null, a.serialNo || "UNKNOWN/NONE",
                    a.category, cost, a.acquisitionDate || new Date(),
                    data.targetFacility, data.targetRoom, data.dispatchedBy || a.accountablePerson || "Unassigned",
                    documentReference, a.photoUrl || null, a.poReferenceNo || null, soNumber,
                    transferQty
                ]);

                const insertedItem = await queryRawSafe(`
                    INSERT INTO "EquipmentSOItem" (
                        id, "soId", "assetId", "equipmentName", "brand",
                        "serialNo", "quantity", "unitCost", "totalCost", "status"
                    ) VALUES (
                        $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, 'DISPATCHED'
                    ) RETURNING *
                `, [
                    itemId, soId, transferredAssetId, a.equipmentName, a.brand,
                    a.serialNo, transferQty, cost, totalItemCost
                ]);
                formattedItems.push(insertedItem[0]);
            }
        }

        so.items = formattedItems;

        if (data.linkedRoNumber) {
            await executeRawSafe(`
                UPDATE "EquipmentRequestOrder"
                SET "status" = 'CONVERTED_TO_SO', "updatedAt" = NOW()
                WHERE "roNumber" = $1
            `, [data.linkedRoNumber]);
        }

        await logActivity({
            action: "CREATE",
            entityType: "EquipmentSO",
            entityId: so.id,
            entityName: so.soNumber,
            description: `Dispatched Stock Transfer ${so.soNumber} (${totalTransferredUnits} units across ${assets.length} items) to ${so.targetFacility}.`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, so };
    } catch (error: any) {
        console.error("[dispatchStockTransfer] Error:", error);
        return { success: false, error: error.message || "Failed to dispatch stock transfer" };
    }
}

// =========================================================================
// 6. BHS RECEIVING & STOCK RETURN TICKETS
// =========================================================================

export async function receiveStockTransfer(data: {
    soId: string;
    acceptedFull: boolean;
    receivedBy: string;
    actualReceivedCount?: number;
    missingCount?: number;
    defectiveCount?: number;
    reasonNotes?: string;
}) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const matchedCenter = await getMatchedCenterForUser(auth.user);

        const soRows = await queryRawSafe(`SELECT * FROM "EquipmentStockTransfer" WHERE id = $1`, [data.soId]);
        const so = soRows[0];
        if (!so) return { success: false, error: "Stock transfer not found." };

        if (matchedCenter && so.targetFacility !== matchedCenter.name) {
            return { success: false, error: `Access Denied: This stock transfer is for ${so.targetFacility}, not ${matchedCenter.name}.` };
        }

        const items = await queryRawSafe(`SELECT * FROM "EquipmentSOItem" WHERE "soId" = $1`, [data.soId]);

        if (data.acceptedFull) {
            await executeRawSafe(`
                UPDATE "EquipmentStockTransfer"
                SET "status" = 'ACCEPTED_FULL', "receivedAt" = NOW(), "receivedBy" = $1
                WHERE id = $2
            `, [data.receivedBy, so.id]);

            for (const item of items) {
                if (item.assetId) {
                    await executeRawSafe(`
                        UPDATE "MedicalAsset"
                        SET "currentStatus" = 'DEPLOYED_SERVICEABLE'::"MedicalAssetStatus",
                            "currentFacility" = $1,
                            "assignedRoom" = $2,
                            "accountablePerson" = $3,
                            "updatedAt" = NOW()
                        WHERE id = $4
                    `, [so.targetFacility, so.targetRoom, data.receivedBy, item.assetId]);
                }
            }

            await logActivity({
                action: "UPDATE",
                entityType: "EquipmentSO",
                entityId: so.id,
                entityName: so.soNumber,
                description: `${so.targetFacility} accepted full delivery on SO ${so.soNumber}.`
            });
        } else {
            const missing = Number(data.missingCount) || 0;
            const defective = Number(data.defectiveCount) || 0;
            const actualReceived = Number(data.actualReceivedCount) || 0;

            const now = new Date();
            const rand = Math.floor(1000 + Math.random() * 9000);
            const ticketNumber = `SRT-${now.getFullYear()}-${rand}`;
            const ticketId = randomUUID();

            await executeRawSafe(`
                UPDATE "EquipmentStockTransfer"
                SET "status" = 'ACCEPTED_WITH_RETURN', "receivedAt" = NOW(), "receivedBy" = $1
                WHERE id = $2
            `, [data.receivedBy, so.id]);

            await executeRawSafe(`
                INSERT INTO "EquipmentStockReturnTicket" (
                    id, "ticketNumber", "soNumber", "bhsFacility", "returnedBy",
                    "missingQuantity", "defectiveQuantity", "reasonNotes", "status",
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, 'OPEN_INVESTIGATION',
                    NOW(), NOW()
                )
            `, [
                ticketId, ticketNumber, so.soNumber, so.targetFacility, data.receivedBy,
                missing, defective, data.reasonNotes?.trim() || "Shipment receiving discrepancy logged."
            ]);

            let receivedCounter = 0;
            for (const item of items) {
                if (item.assetId) {
                    if (receivedCounter < actualReceived) {
                        await executeRawSafe(`
                            UPDATE "MedicalAsset"
                            SET "currentStatus" = 'DEPLOYED_SERVICEABLE'::"MedicalAssetStatus",
                                "currentFacility" = $1,
                                "assignedRoom" = $2,
                                "accountablePerson" = $3,
                                "updatedAt" = NOW()
                            WHERE id = $4
                        `, [so.targetFacility, so.targetRoom, data.receivedBy, item.assetId]);
                        receivedCounter++;
                    } else {
                        await executeRawSafe(`
                            UPDATE "MedicalAsset"
                            SET "currentStatus" = 'STOCK_RETURN_DISCREPANCY'::"MedicalAssetStatus",
                                "discrepancyNotes" = $1,
                                "updatedAt" = NOW()
                            WHERE id = $2
                        `, [`Ticket ${ticketNumber}: ${data.reasonNotes}`, item.assetId]);
                    }
                }
            }

            await logActivity({
                action: "CREATE",
                entityType: "StockReturnTicket",
                entityId: ticketId,
                entityName: ticketNumber,
                description: `Created Stock Return Ticket ${ticketNumber} for SO ${so.soNumber}.`
            });
        }

        revalidatePath("/admin/rhu/equipment");
        return { success: true };
    } catch (error: any) {
        console.error("[receiveStockTransfer] Error:", error);
        return { success: false, error: error.message || "Failed to process transfer receiving" };
    }
}

export async function createDirectStockReturnTicket(data: {
    soNumber?: string;
    bhsFacility: string;
    returnedBy: string;
    missingQuantity: number;
    defectiveQuantity: number;
    reasonNotes: string;
    affectedAssetId?: string;
}) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.allowed) {
            return { success: false, error: "Access Denied: You do not have permission to file return tickets." };
        }

        const now = new Date();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const ticketNumber = `SRT-${now.getFullYear()}-${rand}`;
        const ticketId = randomUUID();

        const soNumber = data.soNumber?.trim() || `SO-MANUAL-${now.getFullYear()}-${rand}`;
        const missing = Number(data.missingQuantity) || 0;
        const defective = Number(data.defectiveQuantity) || 0;

        await executeRawSafe(`
            INSERT INTO "EquipmentStockReturnTicket" (
                id, "ticketNumber", "soNumber", "bhsFacility", "returnedBy",
                "missingQuantity", "defectiveQuantity", "reasonNotes", "status",
                "createdAt", "updatedAt"
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, 'OPEN_INVESTIGATION',
                NOW(), NOW()
            )
        `, [
            ticketId,
            ticketNumber,
            soNumber,
            data.bhsFacility.trim(),
            data.returnedBy.trim(),
            missing,
            defective,
            data.reasonNotes.trim()
        ]);

        if (data.affectedAssetId) {
            await executeRawSafe(`
                UPDATE "MedicalAsset"
                SET "currentStatus" = 'STOCK_RETURN_DISCREPANCY'::"MedicalAssetStatus",
                    "discrepancyNotes" = $1,
                    "updatedAt" = NOW()
                WHERE id = $2
            `, [`Ticket ${ticketNumber}: ${data.reasonNotes}`, data.affectedAssetId]);
        }

        const insertedRows = await queryRawSafe(`SELECT * FROM "EquipmentStockReturnTicket" WHERE id = $1`, [ticketId]);
        const ticket = insertedRows[0];

        await logActivity({
            action: "CREATE",
            entityType: "StockReturnTicket",
            entityId: ticketId,
            entityName: ticketNumber,
            description: `Logged Stock Return / Discrepancy Ticket ${ticketNumber} for ${ticket.bhsFacility} (Missing: ${missing}, Defective: ${defective}).`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, ticket };
    } catch (error: any) {
        console.error("[createDirectStockReturnTicket] Error:", error);
        return { success: false, error: error.message || "Failed to create return ticket" };
    }
}

export async function condemnEquipmentAsset(assetId: string, notes?: string, coaAuditor?: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.canCondemnAsset) {
            return { success: false, error: "Access Denied: Condemning and writing off assets is restricted to RHU Central Supply Administrators." };
        }

        const existing = await queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE id = $1`, [assetId]);
        if (!existing[0]) return { success: false, error: "Asset not found." };

        const condemnationText = [
            notes ? `COA IIRUP: ${notes}` : "Officially inspected and condemned under COA IIRUP.",
            coaAuditor ? `Auditor/Inspector: ${coaAuditor}` : null
        ].filter(Boolean).join(" | ");

        const updated = await queryRawSafe(`
            UPDATE "MedicalAsset"
            SET "currentStatus" = 'CONDEMNED_DISPOSED'::"MedicalAssetStatus",
                "defectDetails" = $1,
                "availableQty" = 0,
                "updatedAt" = NOW()
            WHERE id = $2
            RETURNING *
        `, [condemnationText, assetId]);

        const asset = updated[0];

        await logActivity({
            action: "UPDATE",
            entityType: "MedicalAsset",
            entityId: assetId,
            entityName: asset?.assetTagNo || "Asset",
            description: `Asset "${asset?.equipmentName}" (${asset?.assetTagNo}) officially condemned and disposed under COA IIRUP.`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, asset };
    } catch (error: any) {
        console.error("[condemnEquipmentAsset] Error:", error);
        return { success: false, error: error.message || "Failed to condemn asset" };
    }
}

export async function resolveStockReturnTicket(ticketId: string, resolution: "REPLACED_RESOLVED" | "WRITTEN_OFF", notes?: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.allowed) {
            return { success: false, error: "Access Denied: Health center staff accounts have read-only access. Resolving discrepancy tickets is restricted to RHU Supply Administrators." };
        }

        const ticketRows = await queryRawSafe(`SELECT * FROM "EquipmentStockReturnTicket" WHERE id = $1`, [ticketId]);
        const origTicket = ticketRows[0];

        const updated = await queryRawSafe(`
            UPDATE "EquipmentStockReturnTicket"
            SET "status" = $1,
                "resolutionNotes" = $2,
                "resolvedAt" = NOW(),
                "updatedAt" = NOW()
            WHERE id = $3
            RETURNING *
        `, [resolution, notes?.trim() || null, ticketId]);

        const ticket = updated[0];

        // Also update any MedicalAsset records linked to this ticket/SO
        if (origTicket?.soNumber) {
            if (resolution === "REPLACED_RESOLVED") {
                await executeRawSafe(`
                    UPDATE "MedicalAsset"
                    SET "currentStatus" = 'DEPLOYED_SERVICEABLE'::"MedicalAssetStatus",
                        "discrepancyNotes" = $1,
                        "updatedAt" = NOW()
                    WHERE "soReferenceNo" = $2 AND "currentStatus" = 'STOCK_RETURN_DISCREPANCY'::"MedicalAssetStatus"
                `, [`Resolved Ticket ${origTicket.ticketNumber}: Replaced & Deployed`, origTicket.soNumber]);
            } else {
                await executeRawSafe(`
                    UPDATE "MedicalAsset"
                    SET "currentStatus" = 'CONDEMNED_DISPOSED'::"MedicalAssetStatus",
                        "discrepancyNotes" = $1,
                        "updatedAt" = NOW()
                    WHERE "soReferenceNo" = $2 AND "currentStatus" = 'STOCK_RETURN_DISCREPANCY'::"MedicalAssetStatus"
                `, [`Written Off Ticket ${origTicket.ticketNumber}: ${notes || "Transit Loss"}`, origTicket.soNumber]);
            }
        }

        await logActivity({
            action: "UPDATE",
            entityType: "StockReturnTicket",
            entityId: ticketId,
            entityName: ticket?.ticketNumber || "Ticket",
            description: `Resolved Stock Return Ticket ${ticket?.ticketNumber} as ${resolution}.`
        });

        revalidatePath("/admin/rhu/equipment");
        return { success: true, ticket };
    } catch (error: any) {
        console.error("[resolveStockReturnTicket] Error:", error);
        return { success: false, error: error.message || "Failed to resolve return ticket" };
    }
}

// =========================================================================
// 8. SIDEBAR NOTIFICATION COUNTER
// =========================================================================

export async function getRHUEquipmentNotificationCount() {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized || !auth.user) {
            return { success: false, count: 0 };
        }

        const perm = await checkWritePermission(auth.user);
        const matchedCenter = perm.matchedCenter;

        if (matchedCenter) {
            // Health Center / BHS Account:
            // Count incoming stock transfers awaiting receiving inspection for this clinic
            const res = await queryRawSafe(`
                SELECT COUNT(*)::int as count 
                FROM "EquipmentStockTransfer" 
                WHERE LOWER(TRIM("targetFacility")) = LOWER(TRIM($1)) 
                  AND "status" = 'DISPATCHED'
            `, [matchedCenter.name]);
            return { success: true, count: Number(res?.[0]?.count || 0) };
        } else {
            // Central RHU Admin / Municipality-wide Admin:
            // Count pending / submitted RO requisitions awaiting action + open discrepancy return tickets
            const [roRes, ticketRes] = await Promise.all([
                queryRawSafe(`SELECT COUNT(*)::int as count FROM "EquipmentRequestOrder" WHERE UPPER("status") IN ('SUBMITTED', 'PENDING', 'PENDING_APPROVAL')`),
                queryRawSafe(`SELECT COUNT(*)::int as count FROM "EquipmentStockReturnTicket" WHERE UPPER("status") IN ('OPEN_INVESTIGATION', 'OPEN', 'PENDING')`)
            ]);
            const pendingROs = Number(roRes?.[0]?.count || 0);
            const openTickets = Number(ticketRes?.[0]?.count || 0);
            return { success: true, count: pendingROs + openTickets };
        }
    } catch (error) {
        console.error("[getRHUEquipmentNotificationCount] Error:", error);
        return { success: false, count: 0 };
    }
}

