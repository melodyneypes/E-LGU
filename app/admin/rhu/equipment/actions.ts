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
        // Operational privileges granted to both Global Admins & BHS Center Staff:
        canFileRO: isGlobalAdmin || hasBHSLocalAccess,
        canReceiveSO: isGlobalAdmin || hasBHSLocalAccess,
        canRegisterLocalAsset: isGlobalAdmin || hasBHSLocalAccess,
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

// =========================================================================
// 1. MASTER LEDGER & STATS
// =========================================================================

export async function getRHUEquipmentData(facilityFilter?: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error, assets: [], pos: [], ros: [], sos: [], returns: [], matchedCenter: null, isReadOnly: true };
        }

        const perm = await checkWritePermission(auth.user);
        const matchedCenter = perm.matchedCenter;

        let assetQuery = `SELECT * FROM "MedicalAsset"`;
        const params: any[] = [];

        // Apply facility filter if explicitly specified
        if (facilityFilter && facilityFilter !== "ALL") {
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

        const [assets, stockroomAssets, rawPOs, poItems, rawROs, roItems, rawSOs, soItems, returns, rawCenters] = await Promise.all([
            queryRawSafe(assetQuery, params),
            queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE "currentStatus" = 'IN_STOCKROOM' ORDER BY "equipmentName" ASC`),
            queryRawSafe(poQuery),
            queryRawSafe(`SELECT * FROM "EquipmentPOItem"`),
            queryRawSafe(roQuery, roParams),
            queryRawSafe(`SELECT * FROM "EquipmentROItem"`),
            queryRawSafe(soQuery, soParams),
            queryRawSafe(`SELECT * FROM "EquipmentSOItem"`),
            queryRawSafe(returnsQuery, returnsParams),
            queryRawSafe(`SELECT id, name, code, barangay, status FROM "RHUHealthCenter" WHERE status = 'ACTIVE' OR status IS NULL ORDER BY name ASC`)
        ]);

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
            assets,
            stockroomAssets,
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
            canDispatchSO: Boolean(perm.canDispatchSO)
        };
    } catch (error: any) {
        console.error("[getRHUEquipmentData] Error:", error);
        return { success: false, error: error.message, assets: [], stockroomAssets: [], pos: [], ros: [], sos: [], returns: [], matchedCenter: null, isReadOnly: true, isGlobalAdmin: false, canDispatchSO: false };
    }
}

// =========================================================================
// 2. ASSET CRUD & ONBOARDING GATE
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
        let currentFacility = sanitize(formData.get("currentFacility") as string) || "Main Rural Health Unit (RHU)";
        const assignedRoom = sanitize(formData.get("assignedRoom") as string) || "Central Stockroom";
        const accountablePerson = sanitize(formData.get("accountablePerson") as string) || "Unassigned";
        const accountableEmployeeId = sanitize(formData.get("accountableEmployeeId") as string) || null;
        const acquisitionSource = (formData.get("acquisitionSource") as string) || "STOCKROOM_ISSUANCE";
        const isLegacyBHS = acquisitionSource === "LEGACY_BHS_EXISTING" || acquisitionSource === "DIRECT_DONATION";

        const matchedCenter = await getMatchedCenterForUser(auth.user);
        if (matchedCenter) {
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

        // COA Property Classification Threshold: > 50,000 = PPE (PAR), <= 50,000 = SEMI_EXPENDABLE (ICS)
        const category = unitCost > 50000 ? "PPE" : "SEMI_EXPENDABLE";
        const docPrefix = category === "PPE" ? "PAR" : "ICS";
        const year = new Date().getFullYear();

        // Photo Upload
        let photoUrl: string | null = null;
        const photoFile = formData.get("photoFile") as File | null;
        if (photoFile && photoFile.size > 0) {
            const buffer = Buffer.from(await photoFile.arrayBuffer());
            const fileName = `rhu-equipment/asset_${Date.now()}_${photoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const uploaded = await uploadFile(buffer, fileName, "system-assets", photoFile.type);
            if (uploaded) photoUrl = uploaded;
        }

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
                acquisitionSource
            ];

            if (photoUrl) {
                updateQuery += `, "photoUrl" = $11 WHERE id = $12 RETURNING *`;
                params.push(photoUrl, id);
            } else {
                updateQuery += ` WHERE id = $11 RETURNING *`;
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
                    "category", "acquisitionSource", "unitCost", "currentStatus",
                    "currentFacility", "assignedRoom", "accountablePerson",
                    "accountableEmployeeId", "documentReference", "photoUrl",
                    "createdAt", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6::"PropertyCategory", $7::"AcquisitionSource", $8, $9::"MedicalAssetStatus",
                    $10, $11, $12,
                    $13, $14, $15,
                    NOW(), NOW()
                ) RETURNING *
            `, [
                newId, assetTagNo, equipmentName, brand, serialNo,
                category, acquisitionSource, unitCost, currentStatus,
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

        const updated = await queryRawSafe(`
            UPDATE "MedicalAsset"
            SET "currentStatus" = 'DEFECTIVE_FOR_REPAIR'::"MedicalAssetStatus",
                "defectDetails" = $1,
                "updatedAt" = NOW()
            WHERE id = $2
            RETURNING *
        `, [defectDetails, assetId]);

        const asset = updated[0];

        await logActivity({
            action: "UPDATE",
            entityType: "MedicalAsset",
            entityId: assetId,
            entityName: asset?.assetTagNo || "Asset",
            description: `Reported defect on "${asset?.equipmentName}" (${asset?.assetTagNo}): ${defectDetails}.`
        });

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
        if (!perm.canCondemnAsset) {
            return { success: false, error: "Access Denied: Resolving repairs and condemning equipment is restricted to RHU Central Supply Administrators." };
        }

        const existing = await queryRawSafe(`SELECT * FROM "MedicalAsset" WHERE id = $1`, [assetId]);
        if (!existing[0]) return { success: false, error: "Asset not found." };

        const currentStatus = isRepaired ? "DEPLOYED_SERVICEABLE" : "UNSERVICEABLE_FOR_CONDEMNATION";
        const defectDetails = notes ? `Repair Note: ${notes}` : null;

        const updated = await queryRawSafe(`
            UPDATE "MedicalAsset"
            SET "currentStatus" = $1::"MedicalAssetStatus",
                "lastRepairDate" = NOW(),
                "defectDetails" = $2,
                "updatedAt" = NOW()
            WHERE id = $3
            RETURNING *
        `, [currentStatus, defectDetails, assetId]);

        const asset = updated[0];

        await logActivity({
            action: "UPDATE",
            entityType: "MedicalAsset",
            entityId: assetId,
            entityName: asset?.assetTagNo || "Asset",
            description: isRepaired 
                ? `Repaired asset "${asset?.equipmentName}" returned to active service.`
                : `Asset "${asset?.equipmentName}" marked UNSERVICEABLE_FOR_CONDEMNATION for COA disposal.`
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
            return { success: false, error: "Access Denied: You do not have permission to file request orders." };
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

        for (const a of assets) {
            const itemId = randomUUID();
            const cost = Number(a.unitCost) || 0;

            const insertedItem = await queryRawSafe(`
                INSERT INTO "EquipmentSOItem" (
                    id, "soId", "assetId", "equipmentName", "brand",
                    "serialNo", "quantity", "unitCost", "totalCost", "status"
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, 1, $7, $8, 'DISPATCHED'
                ) RETURNING *
            `, [
                itemId, soId, a.id, a.equipmentName, a.brand,
                a.serialNo, cost, cost
            ]);
            formattedItems.push(insertedItem[0]);

            // Auto-deduct asset from Central Stockroom
            await executeRawSafe(`
                UPDATE "MedicalAsset"
                SET "currentStatus" = 'SO_DISPATCHED'::"MedicalAssetStatus",
                    "soReferenceNo" = $1,
                    "documentReference" = $2,
                    "updatedAt" = NOW()
                WHERE id = $3
            `, [soNumber, documentReference, a.id]);
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
            description: `Dispatched Stock Transfer ${so.soNumber} (${assets.length} items) to ${so.targetFacility}.`
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

export async function resolveStockReturnTicket(ticketId: string, resolution: "REPLACED_RESOLVED" | "WRITTEN_OFF", notes?: string) {
    try {
        const auth = await verifyRHUAccess();
        if (!auth.authorized) return { success: false, error: auth.error };

        const perm = await checkWritePermission(auth.user);
        if (!perm.allowed) {
            return { success: false, error: "Access Denied: Health center staff accounts have read-only access. Resolving discrepancy tickets is restricted to RHU Supply Administrators." };
        }

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
