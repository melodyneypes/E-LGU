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

function getInventoryModel() {
    const p = prisma as any;
    const model = p.rHUInventoryItem || p.rHUInventoryItem || p.rhuInventoryItem || p.RHUInventoryItem;
    if (!model) {
        throw new Error("RHUInventoryItem model is not available on Prisma client. Please restart dev server.");
    }
    return model;
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

        const items = await getInventoryModel().findMany({
            where: whereClause,
            orderBy: { name: "asc" }
        });

        // Map status or filter in-memory if stockStatus requested
        let filteredItems = items;
        if (params?.stockStatus && params.stockStatus !== "ALL") {
            filteredItems = items.filter((item: any) => {
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

        const newItem = await getInventoryModel().create({
            data: {
                name: input.name.trim(),
                genericName: input.genericName?.trim() || null,
                brandName: input.brandName?.trim() || null,
                category: input.category || "MEDICINE",
                dosage: input.dosage?.trim() || null,
                unit: input.unit?.trim() || "pcs",
                quantity: Number(input.quantity) || 0,
                reorderLevel: Number(input.reorderLevel) || 10,
                expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
                batchNumber: input.batchNumber?.trim() || null,
                remarks: input.remarks?.trim() || null,
            }
        });

        revalidatePath("/admin/rhu/inventory");
        return { success: true, data: newItem };
    } catch (error: any) {
        console.error("Error creating RHU inventory item:", error);
        return { success: false, error: error?.message || "Failed to create inventory item" };
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
