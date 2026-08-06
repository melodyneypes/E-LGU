"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

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
        email === "rhu@mapandan.gov.ph" || 
        email === "main.rhu@mapandan.gov.ph" ||
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

export async function ensureInventoryTablesExist() {
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
    } catch (e) {
        console.error("Error in ensureInventoryTablesExist:", e);
    }
}

export async function getRHUInventoryItems(params?: {
    category?: string;
    search?: string;
    stockStatus?: string;
    healthCenterId?: string;
}) {
    try {
        const session = await checkAuth();
        await ensureInventoryTablesExist();

        const currentUser = session?.user as any;
        const matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;
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

export async function dispenseRHUMedicines(dispensedItems: { itemId: string; quantity: number }[]) {
    try {
        await checkPharmacyAuth();
        await ensureInventoryTablesExist();

        for (const item of dispensedItems) {
            if (!item.itemId || item.quantity <= 0) continue;

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
                    } catch {}
                    remainingToDeduct -= deduct;
                }

                // Sync master item total quantity from batches
                try {
                    const sumResult: any[] = await prisma.$queryRaw`
                        SELECT COALESCE(SUM(quantity), 0) as total FROM "RHUInventoryBatch" WHERE "itemId" = ${item.itemId}
                    `;
                    const newTotalQty = Number(sumResult[0]?.total || 0);
                    await prisma.$executeRaw`
                        UPDATE "RHUInventoryItem" 
                        SET "quantity" = ${newTotalQty}, "updatedAt" = NOW() 
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
                } catch {}
            }
        }

        revalidatePath("/admin/rhu/inventory");
        revalidatePath("/admin/rhu/consultations");
        revalidatePath("/admin/rhu");
        return { success: true };
    } catch (error: any) {
        console.error("Error dispensing RHU medicines:", error);
        return { success: false, error: error?.message || "Failed to dispense medicines" };
    }
}
