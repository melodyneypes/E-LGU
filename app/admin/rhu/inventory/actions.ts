"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type InventoryCategory = "MEDICINE" | "MEDICAL_SUPPLY";

async function checkAuth() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized");
    }
    return session;
}

export interface RHUInventoryInput {
    name: string;
    genericName?: string;
    brandName?: string;
    category: InventoryCategory;
    dosage?: string;
    unit: string;
    quantity: number;
    reorderLevel: number;
    expirationDate?: string;
    batchNumber?: string;
    remarks?: string;
}

export interface RHUStockBatchInput {
    itemId: string;
    batchNumber: string;
    expirationDate?: string;
    quantity: number;
    remarks?: string;
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

export async function getRHUInventoryItems(params?: {
    category?: string;
    search?: string;
    stockStatus?: string;
}) {
    try {
        await checkAuth();

        const categoryFilter = params?.category && params.category !== "ALL" 
            ? (params.category as InventoryCategory) 
            : undefined;

        const search = params?.search?.trim() || "";

        const whereClause: any = {};

        if (categoryFilter) {
            whereClause.category = categoryFilter;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { genericName: { contains: search, mode: "insensitive" } },
                { brandName: { contains: search, mode: "insensitive" } },
                { batchNumber: { contains: search, mode: "insensitive" } },
            ];
        }

        const batchModel = getBatchModel();
        const findOptions: any = {
            where: whereClause,
            orderBy: { name: "asc" }
        };

        if (batchModel) {
            findOptions.include = {
                batches: {
                    orderBy: { expirationDate: "asc" }
                }
            };
        }

        const items = await getInventoryModel().findMany(findOptions);

        // Process items to calculate total stock quantity and FEFO earliest expiration date
        const processedItems = items.map((item: any) => {
            const batches: RHUBatchData[] = item.batches || [];
            let totalQuantity = item.quantity || 0;
            let earliestExpiration = item.expirationDate ? new Date(item.expirationDate) : null;

            if (batches.length > 0) {
                totalQuantity = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
                
                // Find earliest non-expired/active batch with stock for FEFO
                const activeBatchesWithExpiry = batches
                    .filter(b => (b.quantity || 0) > 0 && b.expirationDate)
                    .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
                
                if (activeBatchesWithExpiry.length > 0) {
                    earliestExpiration = new Date(activeBatchesWithExpiry[0].expirationDate!);
                } else if (batches.some(b => b.expirationDate)) {
                    // Fallback to earliest batch expiry even if stock 0
                    const allExpiries = batches
                        .filter(b => b.expirationDate)
                        .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
                    if (allExpiries.length > 0) {
                        earliestExpiration = new Date(allExpiries[0].expirationDate!);
                    }
                }
            }

            return {
                ...item,
                quantity: totalQuantity,
                expirationDate: earliestExpiration,
                batches
            };
        });

        // Filter stock status
        let filteredItems = processedItems;
        if (params?.stockStatus && params.stockStatus !== "ALL") {
            filteredItems = processedItems.filter((item: any) => {
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
        await checkAuth();

        if (!input.name || !input.name.trim()) {
            return { success: false, error: "Item name is required" };
        }

        const quantityNum = Number(input.quantity) || 0;
        const expDate = input.expirationDate ? new Date(input.expirationDate) : null;
        const batchNo = input.batchNumber?.trim() || null;

        const newItem = await getInventoryModel().create({
            data: {
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
            }
        });

        // If batch model exists and initial stock/batch details were provided, create batch record
        const batchModel = getBatchModel();
        if (batchModel && (quantityNum > 0 || batchNo)) {
            await batchModel.create({
                data: {
                    itemId: newItem.id,
                    batchNumber: batchNo || `BATCH-${Date.now().toString().slice(-6)}`,
                    expirationDate: expDate,
                    quantity: quantityNum,
                    initialQuantity: quantityNum,
                    receivedDate: new Date(),
                    remarks: input.remarks?.trim() || "Initial Batch Creation"
                }
            });
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
        await checkAuth();

        if (!input.itemId) {
            return { success: false, error: "Target item ID is required" };
        }

        if (!input.batchNumber || !input.batchNumber.trim()) {
            return { success: false, error: "Batch / Lot Number is required" };
        }

        const quantityNum = Math.max(1, Number(input.quantity) || 0);
        const expDate = input.expirationDate ? new Date(input.expirationDate) : null;
        const batchNo = input.batchNumber.trim();

        const batchModel = getBatchModel();
        if (batchModel) {
            await batchModel.create({
                data: {
                    itemId: input.itemId,
                    batchNumber: batchNo,
                    expirationDate: expDate,
                    quantity: quantityNum,
                    initialQuantity: quantityNum,
                    receivedDate: new Date(),
                    remarks: input.remarks?.trim() || "Stock In Delivery"
                }
            });
        }

        // Also update master item summary fields
        const currentItem = await getInventoryModel().findUnique({ 
            where: { id: input.itemId },
            include: batchModel ? { batches: true } : undefined
        });

        if (currentItem) {
            const batches: any[] = currentItem.batches || [];
            const newTotalQty = batches.length > 0 
                ? batches.reduce((sum, b) => sum + (b.quantity || 0), 0)
                : currentItem.quantity + quantityNum;

            const updatePayload: any = {
                quantity: newTotalQty,
                batchNumber: batchNo
            };
            if (expDate) {
                updatePayload.expirationDate = expDate;
            }

            await getInventoryModel().update({
                where: { id: input.itemId },
                data: updatePayload
            });
        }

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error receiving RHU stock batch:", error);
        return { success: false, error: error?.message || "Failed to log stock delivery batch" };
    }
}

export async function updateRHUInventoryItem(id: string, input: Partial<RHUInventoryInput>) {
    try {
        await checkAuth();

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
        await checkAuth();

        const batchModel = getBatchModel();
        if (!batchModel) {
            return { success: false, error: "Batch model unavailable" };
        }

        const currentBatch = await batchModel.findUnique({ where: { id: batchId } });
        if (!currentBatch) {
            return { success: false, error: "Batch record not found" };
        }

        const newQty = Math.max(0, currentBatch.quantity + delta);
        await batchModel.update({
            where: { id: batchId },
            data: { quantity: newQty }
        });

        // Sync master item total
        const allBatches = await batchModel.findMany({ where: { itemId: currentBatch.itemId } });
        const totalQty = allBatches.reduce((sum: number, b: any) => sum + b.quantity, 0);

        await getInventoryModel().update({
            where: { id: currentBatch.itemId },
            data: { quantity: totalQty }
        });

        revalidatePath("/admin/rhu/inventory");
        return { success: true };
    } catch (error: any) {
        console.error("Error adjusting batch quantity:", error);
        return { success: false, error: error?.message || "Failed to adjust batch quantity" };
    }
}

export async function deleteRHUInventoryBatch(batchId: string) {
    try {
        await checkAuth();

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

export async function adjustRHUStockQuantity(id: string, delta: number) {
    try {
        await checkAuth();

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
        await checkAuth();

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
