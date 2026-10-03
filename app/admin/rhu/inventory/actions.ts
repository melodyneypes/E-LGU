"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";
import lguConfig from "@/config/lgu.config.json";

export type InventoryCategory = "MEDICINE" | "MEDICAL_SUPPLY";

function isExpiredDate(dateStrOrObj?: string | Date | null): boolean {
    if (!dateStrOrObj) return false;
    const exp = new Date(dateStrOrObj);
    if (isNaN(exp.getTime())) return false;
    exp.setHours(23, 59, 59, 999);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp.getTime() < today.getTime();
}

async function checkAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    return session;
}

async function checkPharmacyAuth() {
    const session = await checkAuth();
    const user = session.user as any;
    const role = user?.role || "";
    const email = (user?.email || "").toLowerCase();
    const department = (user?.department || "").toUpperCase();

    if (role === "RHU_STAFF" || role === "RHU_DOCTOR" || role === "ADMIN_AIDE") {
        throw new Error("Forbidden: RHU Staff accounts have read-only access to inventory.");
    }

    const matchedCenter = await getMatchedCenterForUser(user);

    const isGlobalAdmin = role === "ADMIN" || 
        role === "RHU_ADMIN" || 
        email === lguConfig.seedAccounts.rhuEmail.toLowerCase() ||
        email === lguConfig.seedAccounts.mainRhuEmail.toLowerCase() ||
        department.includes("LGU");

    const isPharmacyUser = role === "RHU_PHARMACY" || 
        role === "RHU_CENTER_ADMIN" || 
        email.includes("pharmacy") || 
        department.includes("PHARMACY");

    if (!isGlobalAdmin && !isPharmacyUser) {
        throw new Error("Only authorized RHU / Pharmacy personnel can modify inventory items and stock.");
    }
    return { session, user, matchedCenter, isGlobalAdmin };
}

export interface RHUInventoryInput {
    name: string;
    genericName?: string;
    brandName?: string;
    category?: InventoryCategory | "";
    dosage?: string;
    unit: string;
    quantity: number;
    reorderLevel: number;
    expirationDate?: string;
    batchNumber?: string;
    remarks?: string;
    healthCenterId?: string | null;
}

export interface RHUStockBatchInput {
    itemId: string;
    batchNumber: string;
    expirationDate?: string;
    quantity: number;
    remarks?: string;
    healthCenterId?: string | null;
}

export interface RHUBatchData {
    id: string;
    itemId: string;
    batchNumber: string;
    expirationDate?: Date | string | null;
    quantity: number;
    initialQuantity: number;
    receivedDate: Date | string;
    remarks?: string | null;
    healthCenterId?: string | null;
    healthCenterName?: string | null;
}

function getInventoryModel() {
    const p = prisma as any;
    const model = p.rHUInventoryItem || p.rHUInventoryItem || p.rhuInventoryItem || p.RHUInventoryItem;
    if (!model) {
        throw new Error("RHUInventoryItem model is not available on Prisma client. Please restart dev server.");
    }
    return model;
}

function getBatchModel() {
    const p = prisma as any;
    return p.rHUInventoryBatch || p.rHUInventoryBatch || p.rhuInventoryBatch || p.RHUInventoryBatch || null;
}

let inventoryTablesInitialized = true;

export async function ensureInventoryTablesExist() {
    if (inventoryTablesInitialized) return;
    try {
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUInventoryItem" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "genericName" TEXT,
                "brandName" TEXT,
                "category" TEXT NOT NULL DEFAULT 'MEDICINE',
                "dosage" TEXT,
                "unit" TEXT NOT NULL DEFAULT 'pcs',
                "quantity" INTEGER NOT NULL DEFAULT 0,
                "reorderLevel" INTEGER NOT NULL DEFAULT 10,
                "expirationDate" TIMESTAMP(3),
                "batchNumber" TEXT,
                "remarks" TEXT,
                "healthCenterId" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUInventoryBatch" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "itemId" TEXT NOT NULL,
                "batchNumber" TEXT NOT NULL,
                "expirationDate" TIMESTAMP(3),
                "quantity" INTEGER NOT NULL DEFAULT 0,
                "initialQuantity" INTEGER NOT NULL DEFAULT 0,
                "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "healthCenterId" TEXT,
                "remarks" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;
        await prisma.$executeRaw`ALTER TABLE "RHUInventoryItem" ADD COLUMN IF NOT EXISTS "healthCenterId" TEXT;`;
        await prisma.$executeRaw`ALTER TABLE "RHUInventoryBatch" ADD COLUMN IF NOT EXISTS "healthCenterId" TEXT;`;

        try {
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhu_batch_itemid" ON "RHUInventoryBatch"("itemId");`);
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhu_batch_center" ON "RHUInventoryBatch"("healthCenterId");`);
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhu_item_center" ON "RHUInventoryItem"("healthCenterId");`);
        } catch { }

        inventoryTablesInitialized = true;
    } catch (e) {
        console.error("Error in ensureInventoryTablesExist:", e);
    }
}

export async function getRHUInventoryItems(params?: {
    category?: string;
    search?: string;
    stockStatus?: string;
    healthCenterId?: string;
    sessionUser?: any;
    matchedCenter?: any;
}) {
    try {
        let currentUser = params?.sessionUser;
        let matchedCenter = params?.matchedCenter;

        if (!currentUser) {
            const session = await checkAuth();
            currentUser = session?.user as any;
            matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;
        }

        await ensureInventoryTablesExist();

        const targetCenterId = matchedCenter ? matchedCenter.id : params?.healthCenterId;

        const categoryFilter = params?.category && params.category !== "ALL" 
            ? (params.category as InventoryCategory) 
            : undefined;

        const search = params?.search?.trim() || "";

        let items: any[] = [];
        try {
            items = await prisma.$queryRaw`
                SELECT i.*, 
                    hc."name" as "healthCenterName",
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'id', b.id,
                                'itemId', b."itemId",
                                'batchNumber', b."batchNumber",
                                'expirationDate', b."expirationDate",
                                'quantity', b.quantity,
                                'initialQuantity', b."initialQuantity",
                                'receivedDate', b."receivedDate",
                                'remarks', b.remarks,
                                'healthCenterId', b."healthCenterId",
                                'healthCenterName', bhc."name"
                            )
                        ) FILTER (WHERE b.id IS NOT NULL), '[]'
                    ) as batches
                FROM "RHUInventoryItem" i
                LEFT JOIN "RHUHealthCenter" hc ON hc.id = i."healthCenterId"
                LEFT JOIN "RHUInventoryBatch" b ON b."itemId" = i.id
                LEFT JOIN "RHUHealthCenter" bhc ON bhc.id = b."healthCenterId"
                GROUP BY i.id, hc."name"
                ORDER BY i.name ASC
            `;
        } catch {
            const model = getInventoryModel();
            items = await model.findMany({ orderBy: { name: "asc" } });
        }

        // Process items to calculate total stock quantity and FEFO earliest expiration date per health center scope
        const processedItems = items.map((item: any) => {
            let batches: RHUBatchData[] = item.batches || [];

            if (targetCenterId && targetCenterId !== "ALL") {
                batches = batches.filter((b: any) => b.healthCenterId === targetCenterId);
            }

            let totalQuantity = 0;
            let earliestExpiration = null;

            if (batches.length > 0) {
                totalQuantity = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
                
                const activeUnexpiredBatches = batches
                    .filter(b => (b.quantity || 0) > 0 && b.expirationDate && !isExpiredDate(b.expirationDate))
                    .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
                
                if (activeUnexpiredBatches.length > 0) {
                    earliestExpiration = new Date(activeUnexpiredBatches[0].expirationDate!);
                } else if (batches.some(b => b.expirationDate)) {
                    const allExpiries = batches
                        .filter(b => b.expirationDate)
                        .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
                    if (allExpiries.length > 0) {
                        earliestExpiration = new Date(allExpiries[0].expirationDate!);
                    }
                }
            } else if (targetCenterId && targetCenterId !== "ALL") {
                totalQuantity = 0;
                earliestExpiration = null;
            } else {
                totalQuantity = item.quantity || 0;
                earliestExpiration = item.expirationDate ? new Date(item.expirationDate) : null;
            }

            return {
                ...item,
                quantity: totalQuantity,
                expirationDate: earliestExpiration,
                batches
            };
        });

        let filteredItems = processedItems;

        if (targetCenterId && targetCenterId !== "ALL") {
            filteredItems = filteredItems.filter((item: any) => 
                (item.healthCenterId === targetCenterId) ||
                (item.batches && item.batches.length > 0)
            );
        }

        if (categoryFilter) {
            filteredItems = filteredItems.filter((item: any) => item.category === categoryFilter);
        }

        if (search) {
            const sLower = search.toLowerCase();
            filteredItems = filteredItems.filter((item: any) =>
                item.name?.toLowerCase().includes(sLower) ||
                item.genericName?.toLowerCase().includes(sLower) ||
                item.brandName?.toLowerCase().includes(sLower) ||
                item.batchNumber?.toLowerCase().includes(sLower) ||
                item.healthCenterName?.toLowerCase().includes(sLower)
            );
        }

        if (params?.stockStatus && params.stockStatus !== "ALL") {
            filteredItems = filteredItems.filter((item: any) => {
                if (params.stockStatus === "OUT_OF_STOCK") return item.quantity <= 0;
                if (params.stockStatus === "LOW_STOCK") return item.quantity > 0 && item.quantity <= item.reorderLevel;
                if (params.stockStatus === "IN_STOCK") return item.quantity > item.reorderLevel;
                return true;
            });
        }

        return { success: true, data: filteredItems };
    } catch (error: any) {
        console.error("Error fetching RHU inventory items:", error);
        return { success: false, error: error?.message || "Failed to fetch inventory items" };
    }
}

export async function createRHUInventoryItem(input: RHUInventoryInput) {
    try {
        const { matchedCenter, isGlobalAdmin } = await checkPharmacyAuth();
        await ensureInventoryTablesExist();

        if (!isGlobalAdmin && matchedCenter) {
            input.healthCenterId = matchedCenter.id;
        }

        if (!input.name || !input.name.trim()) {
            return { success: false, error: "Item name is required" };
        }

        if (input.expirationDate) {
            const expDateCheck = new Date(input.expirationDate);
            expDateCheck.setHours(23, 59, 59, 999);
            const todayCheck = new Date();
            todayCheck.setHours(0, 0, 0, 0);
            if (expDateCheck.getTime() < todayCheck.getTime()) {
                return { success: false, error: "Cannot add an expired product to stock" };
            }
        }

        const quantityNum = Number(input.quantity) || 0;
        const expDate = input.expirationDate ? new Date(input.expirationDate) : null;
        const batchNo = input.batchNumber?.trim() || null;
        const hcId = input.healthCenterId?.trim() || null;
        const itemId = `cmr${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

        let newItem: any = null;
        try {
            newItem = await getInventoryModel().create({
                data: {
                    id: itemId,
                    name: input.name.trim(),
                    genericName: input.genericName?.trim() || null,
                    brandName: input.brandName?.trim() || null,
                    category: input.category || "MEDICINE",
                    dosage: input.dosage?.trim() || null,
                    unit: input.unit?.trim() || "pcs",
                    quantity: quantityNum,
                    reorderLevel: Number(input.reorderLevel) || 10,
                    expirationDate: expDate,
                    batchNumber: batchNo,
                    remarks: input.remarks?.trim() || null,
                    healthCenterId: hcId
                }
            });
        } catch {
            await prisma.$executeRaw`
                INSERT INTO "RHUInventoryItem" (
                    "id", "name", "genericName", "brandName", "category", "dosage", "unit", "quantity", "reorderLevel", "expirationDate", "batchNumber", "remarks", "healthCenterId", "createdAt", "updatedAt"
                ) VALUES (
                    ${itemId}, ${input.name.trim()}, ${input.genericName?.trim() || null}, ${input.brandName?.trim() || null}, ${input.category || "MEDICINE"}::"InventoryCategory", ${input.dosage?.trim() || null}, ${input.unit?.trim() || "pcs"}, ${quantityNum}, ${Number(input.reorderLevel) || 10}, ${expDate}, ${batchNo}, ${input.remarks?.trim() || null}, ${hcId}, NOW(), NOW()
                )
            `;
            newItem = { id: itemId };
        }

        // If initial stock/batch details were provided, create batch record
        if (quantityNum > 0 || batchNo) {
            const batchId = `cmr${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
            const bNo = batchNo || `BATCH-${Date.now().toString().slice(-6)}`;
            const batchModel = getBatchModel();

            let batchCreated = false;
            if (batchModel) {
                try {
                    await batchModel.create({
                        data: {
                            id: batchId,
                            itemId: newItem.id,
                            batchNumber: bNo,
                            expirationDate: expDate,
                            quantity: quantityNum,
                            initialQuantity: quantityNum,
                            receivedDate: new Date(),
                            remarks: input.remarks?.trim() || "Initial Batch Creation",
                            healthCenterId: hcId
                        }
                    });
                    batchCreated = true;
                } catch {
                    batchCreated = false;
                }
            }

            if (!batchCreated) {
                await prisma.$executeRaw`
                    INSERT INTO "RHUInventoryBatch" (
                        "id", "itemId", "batchNumber", "expirationDate", "quantity", "initialQuantity", "receivedDate", "remarks", "healthCenterId", "createdAt", "updatedAt"
                    ) VALUES (
                        ${batchId}, ${newItem.id}, ${bNo}, ${expDate}, ${quantityNum}, ${quantityNum}, NOW(), ${input.remarks?.trim() || "Initial Batch Creation"}, ${hcId}, NOW(), NOW()
                    )
                `;
            }
        }

        revalidatePath("/admin/rhu/inventory");
        return { success: true, data: newItem };
    } catch (error: any) {
        console.error("Error creating RHU inventory item:", error);
        return { success: false, error: error?.message || "Failed to create inventory item" };
    }
}

export async function receiveRHUStockBatch(input: RHUStockBatchInput) {
    try {
        const { matchedCenter, isGlobalAdmin } = await checkPharmacyAuth();
        await ensureInventoryTablesExist();

        if (!isGlobalAdmin && matchedCenter) {
            input.healthCenterId = matchedCenter.id;
        }

        if (!input.itemId) {
            return { success: false, error: "Target item ID is required" };
        }

        if (!input.batchNumber || !input.batchNumber.trim()) {
            return { success: false, error: "Batch / Lot Number is required" };
        }

        if (input.expirationDate) {
            const expDateCheck = new Date(input.expirationDate);
            expDateCheck.setHours(23, 59, 59, 999);
            const todayCheck = new Date();
            todayCheck.setHours(0, 0, 0, 0);
            if (expDateCheck.getTime() < todayCheck.getTime()) {
                return { success: false, error: "Cannot add an expired product to stock" };
            }
        }

        const quantityNum = Math.max(1, Number(input.quantity) || 0);
        const expDate = input.expirationDate ? new Date(input.expirationDate) : null;
        const batchNo = input.batchNumber.trim();
        const hcId = input.healthCenterId?.trim() || null;
        const batchId = `cmr${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;

        let createdSuccess = false;
        const batchModel = getBatchModel();
        if (batchModel) {
            try {
                await batchModel.create({
                    data: {
                        id: batchId,
                        itemId: input.itemId,
                        batchNumber: batchNo,
                        expirationDate: expDate,
                        quantity: quantityNum,
                        initialQuantity: quantityNum,
                        receivedDate: new Date(),
                        remarks: input.remarks?.trim() || "Stock In Delivery",
                        healthCenterId: hcId
                    }
                });
                createdSuccess = true;
            } catch (err) {
                console.warn("Prisma batchModel create failed, falling back to raw SQL:", err);
            }
        }

        if (!createdSuccess) {
            await prisma.$executeRaw`
                INSERT INTO "RHUInventoryBatch" (
                    "id", "itemId", "batchNumber", "expirationDate", "quantity", "initialQuantity", "receivedDate", "remarks", "healthCenterId", "createdAt", "updatedAt"
                ) VALUES (
                    ${batchId}, ${input.itemId}, ${batchNo}, ${expDate}, ${quantityNum}, ${quantityNum}, NOW(), ${input.remarks?.trim() || "Stock In Delivery"}, ${hcId}, NOW(), NOW()
                )
            `;
        }

        // Always sync total quantity accurately using raw SQL sum
        const sumResult: any[] = await prisma.$queryRaw`
            SELECT COALESCE(SUM(quantity), 0) as total 
            FROM "RHUInventoryBatch" 
            WHERE "itemId" = ${input.itemId}
        `;
        const totalQty = Number(sumResult[0]?.total || quantityNum);

        await prisma.$executeRaw`
            UPDATE "RHUInventoryItem" 
            SET "quantity" = ${totalQty}, 
                "batchNumber" = ${batchNo}, 
                "expirationDate" = COALESCE(${expDate}, "expirationDate"),
                "updatedAt" = NOW() 
            WHERE "id" = ${input.itemId}
        `;

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error receiving RHU stock batch:", error);
        return { success: false, error: error?.message || "Failed to log stock delivery batch" };
    }
}

export async function updateRHUInventoryItem(id: string, input: Partial<RHUInventoryInput>) {
    try {
        await checkPharmacyAuth();

        if (!id) {
            return { success: false, error: "Item ID is required" };
        }

        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name.trim();
        if (input.genericName !== undefined) updateData.genericName = input.genericName ? input.genericName.trim() : null;
        if (input.brandName !== undefined) updateData.brandName = input.brandName ? input.brandName.trim() : null;
        if (input.category !== undefined) updateData.category = input.category;
        if (input.dosage !== undefined) updateData.dosage = input.dosage ? input.dosage.trim() : null;
        if (input.unit !== undefined) updateData.unit = input.unit.trim();
        if (input.quantity !== undefined) updateData.quantity = Number(input.quantity);
        if (input.reorderLevel !== undefined) updateData.reorderLevel = Number(input.reorderLevel);
        if (input.expirationDate !== undefined) updateData.expirationDate = input.expirationDate ? new Date(input.expirationDate) : null;
        if (input.batchNumber !== undefined) updateData.batchNumber = input.batchNumber ? input.batchNumber.trim() : null;
        if (input.remarks !== undefined) updateData.remarks = input.remarks ? input.remarks.trim() : null;

        const updatedItem = await getInventoryModel().update({
            where: { id },
            data: updateData
        });

        revalidatePath("/admin/rhu/inventory");
        return { success: true, data: updatedItem };
    } catch (error: any) {
        console.error("Error updating RHU inventory item:", error);
        return { success: false, error: error?.message || "Failed to update inventory item" };
    }
}

export async function adjustRHUBatchQuantity(batchId: string, delta: number) {
    try {
        await checkPharmacyAuth();

        const batchModel = getBatchModel();
        if (batchModel) {
            const currentBatch = await batchModel.findUnique({ where: { id: batchId } });
            if (currentBatch) {
                const newQty = Math.max(0, currentBatch.quantity + delta);
                await batchModel.update({
                    where: { id: batchId },
                    data: { quantity: newQty }
                });

                const allBatches = await batchModel.findMany({ where: { itemId: currentBatch.itemId } });
                const totalQty = allBatches.reduce((sum: number, b: any) => sum + b.quantity, 0);

                await getInventoryModel().update({
                    where: { id: currentBatch.itemId },
                    data: { quantity: totalQty }
                });

                revalidatePath("/admin/rhu/inventory");
                return { success: true };
            }
        }

        // Fallback using raw SQL
        const batches: any[] = await prisma.$queryRaw`SELECT * FROM "RHUInventoryBatch" WHERE id = ${batchId} LIMIT 1`;
        if (!batches || batches.length === 0) {
            return { success: false, error: "Batch record not found" };
        }

        const b = batches[0];
        const newQty = Math.max(0, b.quantity + delta);

        await prisma.$executeRaw`UPDATE "RHUInventoryBatch" SET quantity = ${newQty}, "updatedAt" = NOW() WHERE id = ${batchId}`;

        const sumResult: any[] = await prisma.$queryRaw`SELECT COALESCE(SUM(quantity), 0) as total FROM "RHUInventoryBatch" WHERE "itemId" = ${b.itemId}`;
        const totalQty = Number(sumResult[0]?.total || 0);

        await prisma.$executeRaw`UPDATE "RHUInventoryItem" SET quantity = ${totalQty}, "updatedAt" = NOW() WHERE id = ${b.itemId}`;

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error adjusting batch quantity:", error);
        return { success: false, error: error?.message || "Failed to adjust batch quantity" };
    }
}

export async function deleteRHUInventoryBatch(batchId: string) {
    try {
        await checkPharmacyAuth();

        const batchModel = getBatchModel();
        if (!batchModel) {
            return { success: false, error: "Batch model unavailable" };
        }

        const batch = await batchModel.findUnique({ where: { id: batchId } });
        if (!batch) {
            return { success: false, error: "Batch record not found" };
        }

        await batchModel.delete({ where: { id: batchId } });

        // Sync master item total
        const remainingBatches = await batchModel.findMany({ where: { itemId: batch.itemId } });
        const totalQty = remainingBatches.reduce((sum: number, b: any) => sum + b.quantity, 0);

        await getInventoryModel().update({
            where: { id: batch.itemId },
            data: { quantity: totalQty }
        });

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting batch:", error);
        return { success: false, error: error?.message || "Failed to delete batch" };
    }
}

export async function updateRHUInventoryBatch(
    batchId: string,
    input: { healthCenterId?: string | null; batchNumber?: string; expirationDate?: string | Date | null; remarks?: string }
) {
    try {
        await checkPharmacyAuth();
        await ensureInventoryTablesExist();

        if (!batchId) {
            return { success: false, error: "Batch ID is required" };
        }

        const hcId = input.healthCenterId !== undefined ? (input.healthCenterId?.trim() || null) : undefined;
        const batchModel = getBatchModel();

        if (batchModel) {
            try {
                const updateData: any = {};
                if (hcId !== undefined) updateData.healthCenterId = hcId;
                if (input.batchNumber !== undefined) updateData.batchNumber = input.batchNumber.trim();
                if (input.expirationDate !== undefined) updateData.expirationDate = input.expirationDate ? new Date(input.expirationDate) : null;
                if (input.remarks !== undefined) updateData.remarks = input.remarks.trim();

                await batchModel.update({
                    where: { id: batchId },
                    data: updateData
                });

                revalidatePath("/admin/rhu/inventory");
                return { success: true };
            } catch (err) {
                console.warn("Prisma batchModel update failed, using raw SQL:", err);
            }
        }

        // Raw SQL fallback
        if (hcId !== undefined) {
            await prisma.$executeRaw`UPDATE "RHUInventoryBatch" SET "healthCenterId" = ${hcId}, "updatedAt" = NOW() WHERE "id" = ${batchId}`;
        }
        if (input.batchNumber !== undefined) {
            await prisma.$executeRaw`UPDATE "RHUInventoryBatch" SET "batchNumber" = ${input.batchNumber.trim()}, "updatedAt" = NOW() WHERE "id" = ${batchId}`;
        }
        if (input.expirationDate !== undefined) {
            const expDate = input.expirationDate ? new Date(input.expirationDate) : null;
            await prisma.$executeRaw`UPDATE "RHUInventoryBatch" SET "expirationDate" = ${expDate}, "updatedAt" = NOW() WHERE "id" = ${batchId}`;
        }

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating batch:", error);
        return { success: false, error: error?.message || "Failed to update batch details" };
    }
}


export async function adjustRHUStockQuantity(id: string, delta: number) {
    try {
        await checkPharmacyAuth();

        const currentItem = await getInventoryModel().findUnique({ where: { id } });
        if (!currentItem) {
            return { success: false, error: "Item not found" };
        }

        const newQuantity = Math.max(0, currentItem.quantity + delta);

        const updatedItem = await getInventoryModel().update({
            where: { id },
            data: { quantity: newQuantity }
        });

        revalidatePath("/admin/rhu/inventory");
        return { success: true, data: updatedItem };
    } catch (error: any) {
        console.error("Error adjusting RHU stock quantity:", error);
        return { success: false, error: error?.message || "Failed to adjust stock quantity" };
    }
}

export async function deleteRHUInventoryItem(id: string) {
    try {
        await checkPharmacyAuth();

        await getInventoryModel().delete({
            where: { id }
        });

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting RHU inventory item:", error);
        return { success: false, error: error?.message || "Failed to delete inventory item" };
    }
}

export async function dispenseRHUMedicines(
    dispensedItems: { itemId: string; quantity: number }[],
    options?: {
        patientName?: string;
        referenceNo?: string;
        remarks?: string;
        facilityName?: string;
        healthCenterId?: string | null;
    }
) {
    try {
        await checkPharmacyAuth();
        await ensureInventoryTablesExist();
        await ensureInventoryMovementTableExist();

        for (const item of dispensedItems) {
            if (!item.itemId || item.quantity <= 0) continue;

            // Fetch master item details for ledger record
            let itemRecord: any = null;
            try {
                const itemRows: any[] = await prisma.$queryRaw`
                    SELECT * FROM "RHUInventoryItem" WHERE id = ${item.itemId} LIMIT 1
                `;
                itemRecord = itemRows[0] || null;
            } catch {}

            // Deduct from batches using FEFO (First Expired, First Out) for non-expired stock only
            let itemBatches: any[] = [];
            try {
                itemBatches = await prisma.$queryRaw`
                    SELECT * FROM "RHUInventoryBatch" 
                    WHERE "itemId" = ${item.itemId} 
                      AND "quantity" > 0 
                      AND ("expirationDate" IS NULL OR "expirationDate" >= CURRENT_DATE)
                    ORDER BY "expirationDate" ASC NULLS LAST, "createdAt" ASC
                `;
            } catch {
                itemBatches = [];
            }

            const unexpiredStock = itemBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
            if (itemBatches.length > 0 && unexpiredStock < item.quantity) {
                return { success: false, error: "Cannot dispense stock from expired batches. Insufficient non-expired stock available." };
            }

            let remainingToDeduct = item.quantity;
            let finalTotalQty = 0;
            const deductedBatches: { batchNumber: string | null; quantity: number }[] = [];

            if (itemBatches && itemBatches.length > 0) {
                for (const batch of itemBatches) {
                    if (remainingToDeduct <= 0) break;
                    const deduct = Math.min(batch.quantity, remainingToDeduct);
                    const newBatchQty = batch.quantity - deduct;
                    try {
                        await prisma.$executeRaw`
                            UPDATE "RHUInventoryBatch" 
                            SET "quantity" = ${newBatchQty}, "updatedAt" = NOW() 
                            WHERE "id" = ${batch.id}
                        `;
                        deductedBatches.push({ batchNumber: batch.batchNumber, quantity: deduct });
                    } catch {}
                    remainingToDeduct -= deduct;
                }

                // Sync master item total quantity from batches
                try {
                    const sumResult: any[] = await prisma.$queryRaw`
                        SELECT COALESCE(SUM(quantity), 0) as total FROM "RHUInventoryBatch" WHERE "itemId" = ${item.itemId}
                    `;
                    finalTotalQty = Number(sumResult[0]?.total || 0);
                    await prisma.$executeRaw`
                        UPDATE "RHUInventoryItem" 
                        SET "quantity" = ${finalTotalQty}, "updatedAt" = NOW() 
                        WHERE "id" = ${item.itemId}
                    `;
                } catch {}
            } else {
                // Direct update on item master if no batch records exist
                try {
                    await prisma.$executeRaw`
                        UPDATE "RHUInventoryItem" 
                        SET "quantity" = GREATEST(0, "quantity" - ${item.quantity}), "updatedAt" = NOW() 
                        WHERE "id" = ${item.itemId}
                    `;
                    const updatedRows: any[] = await prisma.$queryRaw`
                        SELECT "quantity" FROM "RHUInventoryItem" WHERE "id" = ${item.itemId} LIMIT 1
                    `;
                    finalTotalQty = Number(updatedRows[0]?.quantity || 0);
                } catch {}
            }

            // Automatically record the Issuance in the Medicine Ledger
            if (itemRecord) {
                const batchNum = deductedBatches.length > 0
                    ? deductedBatches.map(b => b.batchNumber).filter(Boolean).join(", ")
                    : itemRecord.batchNumber;
                const remarks = options?.remarks || (options?.patientName ? `Prescription Dispensed to ${options.patientName}` : "Prescription Dispense");

                await recordRHUInventoryMovement({
                    transactionType: "Issuance",
                    medicineName: itemRecord.name,
                    genericName: itemRecord.genericName,
                    category: itemRecord.genericName || (itemRecord.category === "MEDICINE" ? "Pharmaceutical" : "Medical Supply"),
                    quantity: -item.quantity,
                    unit: itemRecord.unit || "pcs",
                    batchNumber: batchNum || null,
                    balanceAfter: finalTotalQty,
                    personRemarks: remarks,
                    facilityName: options?.facilityName || "Main Rural Health Unit (RHU)",
                    healthCenterId: options?.healthCenterId || itemRecord.healthCenterId || null,
                    referenceNo: options?.referenceNo || `DISP-${Date.now().toString().slice(-6)}`
                });
            }
        }

        revalidatePath("/admin/rhu/inventory");
        revalidatePath("/admin/rhu/inventory/ledger");
        revalidatePath("/admin/rhu/consultations");
        revalidatePath("/admin/rhu");
        return { success: true };
    } catch (error: any) {
        console.error("Error dispensing RHU medicines:", error);
        return { success: false, error: error?.message || "Failed to dispense medicines" };
    }
}

export interface RHUInventoryMovementData {
    id: string;
    timestamp: Date | string;
    transactionType: "Stock In" | "Issuance" | "Adjustment";
    medicineName: string;
    genericName?: string | null;
    category?: string | null;
    quantity: number;
    unit: string;
    batchNumber?: string | null;
    balanceAfter?: number;
    personRemarks?: string | null;
    healthCenterId?: string | null;
    facilityName?: string | null;
    referenceNo?: string | null;
    createdAt?: Date | string;
}

let movementTableInitialized = true;

export async function ensureInventoryMovementTableExist() {
    if (movementTableInitialized) return;
    try {
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "RHUInventoryMovement" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "transactionType" TEXT NOT NULL DEFAULT 'Stock In',
                "medicineName" TEXT NOT NULL,
                "genericName" TEXT,
                "category" TEXT,
                "quantity" INTEGER NOT NULL DEFAULT 0,
                "unit" TEXT NOT NULL DEFAULT 'pcs',
                "batchNumber" TEXT,
                "balanceAfter" INTEGER NOT NULL DEFAULT 0,
                "personRemarks" TEXT,
                "healthCenterId" TEXT,
                "facilityName" TEXT,
                "referenceNo" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `;
        try {
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhu_movement_timestamp" ON "RHUInventoryMovement"("timestamp" DESC);`);
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_rhu_movement_center" ON "RHUInventoryMovement"("healthCenterId");`);
        } catch { }
        movementTableInitialized = true;
    } catch (e) {
        console.error("Error in ensureInventoryMovementTableExist:", e);
    }
}

export async function recordRHUInventoryMovement(data: {
    transactionType: "Stock In" | "Issuance" | "Adjustment";
    medicineName: string;
    genericName?: string | null;
    category?: string | null;
    quantity: number;
    unit: string;
    batchNumber?: string | null;
    balanceAfter?: number;
    personRemarks?: string | null;
    healthCenterId?: string | null;
    facilityName?: string | null;
    referenceNo?: string | null;
    timestamp?: Date;
}) {
    try {
        await ensureInventoryMovementTableExist();
        const id = `mov_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
        const ts = data.timestamp || new Date();

        await prisma.$executeRaw`
            INSERT INTO "RHUInventoryMovement" (
                "id", "timestamp", "transactionType", "medicineName", "genericName", "category",
                "quantity", "unit", "batchNumber", "balanceAfter", "personRemarks", "healthCenterId",
                "facilityName", "referenceNo", "createdAt"
            ) VALUES (
                ${id}, ${ts}, ${data.transactionType}, ${data.medicineName}, ${data.genericName || null},
                ${data.category || null}, ${data.quantity}, ${data.unit}, ${data.batchNumber || null},
                ${data.balanceAfter || 0}, ${data.personRemarks || null}, ${data.healthCenterId || null},
                ${data.facilityName || null}, ${data.referenceNo || null}, NOW()
            )
        `;
        return { success: true, id };
    } catch (error: any) {
        console.error("Error recording movement:", error);
        return { success: false, error: error?.message };
    }
}

export async function getRHUInventoryMovements(params?: {
    search?: string;
    category?: string;
    transactionType?: string;
    healthCenterId?: string;
    startDate?: string;
    endDate?: string;
    sessionUser?: any;
}): Promise<{ success: boolean; data: RHUInventoryMovementData[]; error?: string }> {
    try {
        if (!params?.sessionUser) {
            await checkAuth();
        }
        await ensureInventoryMovementTableExist();

        // Query movements directly using indexed SQL
        let rows: any[] = [];
        if (params?.healthCenterId && params.healthCenterId !== "ALL") {
            rows = await prisma.$queryRaw`
                SELECT * FROM "RHUInventoryMovement"
                WHERE "healthCenterId" = ${params.healthCenterId}
                ORDER BY "timestamp" DESC, "createdAt" DESC
            `;
        } else {
            rows = await prisma.$queryRaw`
                SELECT * FROM "RHUInventoryMovement"
                ORDER BY "timestamp" DESC, "createdAt" DESC
            `;
        }

        // If table is completely empty, lazily seed initial movements
        if (rows.length === 0 && (!params?.healthCenterId || params.healthCenterId === "ALL")) {
            const countRes: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM "RHUInventoryMovement"`;
            const count = Number(countRes[0]?.count || 0);

            if (count === 0) {
                const itemsRes = await getRHUInventoryItems();
                const items = itemsRes.success && itemsRes.data ? itemsRes.data : [];
                const sampleMovements: any[] = [];
                const now = new Date();

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    const itemBatches = item.batches || [];
                    const cat = item.genericName || (item.category === "MEDICINE" ? "Antibiotic" : "Consumable");

                    if (itemBatches.length > 0) {
                        for (const b of itemBatches) {
                            const initQty = b.initialQuantity || b.quantity || 100;
                            const inTimestamp = b.receivedDate ? new Date(b.receivedDate) : new Date(now.getTime() - (i + 1) * 86400000 * 2);
                            sampleMovements.push({
                                id: `mov_init_in_${b.id}`,
                                timestamp: inTimestamp,
                                transactionType: "Stock In",
                                medicineName: item.name,
                                genericName: item.genericName,
                                category: cat,
                                quantity: initQty,
                                unit: item.unit || "pcs",
                                batchNumber: b.batchNumber,
                                balanceAfter: initQty,
                                personRemarks: `Municipal Purchase Order #2026-${String(i + 10).padStart(3, "0")}`,
                                healthCenterId: b.healthCenterId || item.healthCenterId,
                                facilityName: b.healthCenterName || item.healthCenterName || "Main Rural Health Unit (RHU)",
                                referenceNo: `PO-2026-${String(i + 10).padStart(3, "0")}`
                            });

                            if (typeof b.quantity === "number" && b.quantity < initQty) {
                                const issuedQty = initQty - b.quantity;
                                const issTimestamp = new Date(inTimestamp.getTime() + 38 * 60000);
                                sampleMovements.push({
                                    id: `mov_init_iss_${b.id}`,
                                    timestamp: issTimestamp,
                                    transactionType: "Issuance",
                                    medicineName: item.name,
                                    genericName: item.genericName,
                                    category: cat,
                                    quantity: -issuedQty,
                                    unit: item.unit || "pcs",
                                    batchNumber: b.batchNumber,
                                    balanceAfter: b.quantity,
                                    personRemarks: `Prescription Dispense - RHU Central Clinic`,
                                    healthCenterId: b.healthCenterId || item.healthCenterId,
                                    facilityName: b.healthCenterName || item.healthCenterName || "Main Rural Health Unit (RHU)",
                                    referenceNo: `RX-2026-${String(i + 10).padStart(3, "0")}`
                                });
                            }
                        }
                    } else if (item.quantity > 0) {
                        sampleMovements.push({
                            id: `mov_init_cat_${item.id}`,
                            timestamp: new Date(now.getTime() - (i + 1) * 86400000 * 3),
                            transactionType: "Stock In",
                            medicineName: item.name,
                            genericName: item.genericName,
                            category: cat,
                            quantity: item.quantity,
                            unit: item.unit || "pcs",
                            batchNumber: item.batchNumber || `BAT-2026-${100 + i}`,
                            balanceAfter: item.quantity,
                            personRemarks: `Initial Warehouse Stock Intake`,
                            healthCenterId: item.healthCenterId,
                            facilityName: item.healthCenterName || "Main Rural Health Unit (RHU)",
                            referenceNo: `INIT-${100 + i}`
                        });
                    }

                    if (item.quantity > 10) {
                        sampleMovements.push({
                            id: `mov_init_iss_${item.id}`,
                            timestamp: new Date(now.getTime() - (i + 1) * 86400000),
                            transactionType: "Issuance",
                            medicineName: item.name,
                            genericName: item.genericName,
                            category: cat,
                            quantity: -Math.min(20, Math.floor(item.quantity * 0.2)),
                            unit: item.unit || "pcs",
                            batchNumber: item.batchNumber || null,
                            balanceAfter: item.quantity,
                            personRemarks: `Prescription Dispense - RHU Central Clinic`,
                            healthCenterId: item.healthCenterId,
                            facilityName: item.healthCenterName || "Main Rural Health Unit (RHU)",
                            referenceNo: `RX-2026-${200 + i}`
                        });
                    }
                }

                for (const m of sampleMovements) {
                    try {
                        await prisma.$executeRaw`
                            INSERT INTO "RHUInventoryMovement" (
                                "id", "timestamp", "transactionType", "medicineName", "genericName", "category",
                                "quantity", "unit", "batchNumber", "balanceAfter", "personRemarks", "healthCenterId",
                                "facilityName", "referenceNo", "createdAt"
                            ) VALUES (
                                ${m.id}, ${m.timestamp}, ${m.transactionType}, ${m.medicineName}, ${m.genericName || null},
                                ${m.category || null}, ${m.quantity}, ${m.unit}, ${m.batchNumber || null},
                                ${m.balanceAfter || 0}, ${m.personRemarks || null}, ${m.healthCenterId || null},
                                ${m.facilityName || null}, ${m.referenceNo || null}, NOW()
                            ) ON CONFLICT ("id") DO NOTHING;
                        `;
                    } catch {}
                }

                rows = await prisma.$queryRaw`
                    SELECT * FROM "RHUInventoryMovement"
                    ORDER BY "timestamp" DESC, "createdAt" DESC
                `;
            }
        }

        if (params?.search && params.search.trim()) {
            const q = params.search.trim().toLowerCase();
            rows = rows.filter(r =>
                r.medicineName?.toLowerCase().includes(q) ||
                r.genericName?.toLowerCase().includes(q) ||
                r.batchNumber?.toLowerCase().includes(q) ||
                r.personRemarks?.toLowerCase().includes(q) ||
                r.facilityName?.toLowerCase().includes(q) ||
                r.referenceNo?.toLowerCase().includes(q)
            );
        }

        if (params?.transactionType && params.transactionType !== "ALL") {
            rows = rows.filter(r => r.transactionType?.toLowerCase() === params.transactionType?.toLowerCase());
        }

        if (params?.category && params.category !== "ALL") {
            const cat = params.category.toLowerCase();
            rows = rows.filter(r => r.category?.toLowerCase().includes(cat) || r.genericName?.toLowerCase().includes(cat));
        }

        if (params?.healthCenterId && params.healthCenterId !== "ALL") {
            rows = rows.filter(r => r.healthCenterId === params.healthCenterId);
        }

        return {
            success: true,
            data: rows.map(r => ({
                id: r.id,
                timestamp: r.timestamp,
                transactionType: r.transactionType as any,
                medicineName: r.medicineName,
                genericName: r.genericName,
                category: r.category,
                quantity: Number(r.quantity),
                unit: r.unit,
                batchNumber: r.batchNumber,
                balanceAfter: Number(r.balanceAfter || 0),
                personRemarks: r.personRemarks,
                healthCenterId: r.healthCenterId,
                facilityName: r.facilityName || "Main Rural Health Unit (RHU)",
                referenceNo: r.referenceNo,
                createdAt: r.createdAt
            }))
        };
    } catch (error: any) {
        console.error("Error fetching inventory movements:", error);
        return { success: false, data: [], error: error?.message || "Failed to fetch movements" };
    }
}
