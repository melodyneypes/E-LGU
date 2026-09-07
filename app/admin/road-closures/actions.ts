"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { RoadClosureStatus, RoadClosureSeverity } from "@prisma/client";

// =========================================================================
// SECURITY & PERMISSION VERIFIER
// Strictly allows:
// 1. role === "ADMIN" with department === "LGU" (or superadmin without department)
// 2. role === "BARANGAY_ADMIN"
// 3. Any user whose accessiblePages includes "/admin/road-closures"
// =========================================================================

export async function verifyRoadClosureAccess() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { authorized: false, error: "Unauthorized. Please sign in.", session: null };
    }

    const user = session.user as {
        id?: string;
        name?: string | null;
        email?: string | null;
        role?: string;
        department?: string | null;
        managedBarangay?: string | null;
        accessiblePages?: string[];
    };

    const role = (user.role || "").toUpperCase();
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const hasCustomAccess = accessiblePages.includes("/admin/road-closures");

    if (!isLguAdmin && !isBarangayAdmin && !hasCustomAccess) {
        return {
            authorized: false,
            error: "Access Denied: You do not have clearance for Road Closures & Traffic Advisories.",
            session
        };
    }

    return {
        authorized: true,
        error: null,
        session,
        isLguAdmin,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null,
        userId: user.id || null,
        userRole: role
    };
}

export interface RoadClosureInput {
    title: string;
    description?: string;
    status: RoadClosureStatus;
    severity: RoadClosureSeverity;
    barangay?: string;
    roadName?: string;
    startLocation: {
        lat: number;
        lng: number;
        address?: string;
    };
    endLocation: {
        lat: number;
        lng: number;
        address?: string;
    };
    routeCoordinates?: [number, number][] | null;
    detourAdvice?: string;
    startDate?: Date | string;
    endDate?: Date | string | null;
}

// =========================================================================
// READ: Fetch all road closures
// =========================================================================
export async function getRoadClosuresAction() {
    try {
        const auth = await verifyRoadClosureAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error, data: [] };
        }

        const closures = await prisma.roadClosure.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                severity: true,
                barangay: true,
                roadName: true,
                startLocation: true,
                endLocation: true,
                routeCoordinates: true,
                detourAdvice: true,
                startDate: true,
                endDate: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: [
                { isActive: "desc" },
                { startDate: "desc" }
            ]
        });

        return { success: true, data: closures };
    } catch (error: any) {
        console.error("[getRoadClosuresAction] Error:", error);
        return { success: false, error: error.message || "Failed to load road closures", data: [] };
    }
}

// =========================================================================
// CREATE: Add new road closure
// =========================================================================
export async function createRoadClosureAction(input: RoadClosureInput) {
    try {
        const auth = await verifyRoadClosureAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        if (!input.title || !input.title.trim()) {
            return { success: false, error: "Title or advisory notice is required." };
        }

        if (!input.startLocation?.lat || !input.endLocation?.lat) {
            return { success: false, error: "Please click both start and end points on the map." };
        }

        const barangayToSet = auth.isBarangayAdmin && auth.managedBarangay 
            ? auth.managedBarangay 
            : input.barangay?.trim() || null;

        const newClosure = await prisma.roadClosure.create({
            data: {
                title: input.title.trim(),
                description: input.description?.trim() || null,
                status: input.status || RoadClosureStatus.CLOSED,
                severity: input.severity || RoadClosureSeverity.HIGH,
                barangay: barangayToSet,
                roadName: input.roadName?.trim() || null,
                startLocation: input.startLocation,
                endLocation: input.endLocation,
                routeCoordinates: input.routeCoordinates || null,
                detourAdvice: input.detourAdvice?.trim() || null,
                startDate: input.startDate ? new Date(input.startDate) : new Date(),
                endDate: input.endDate ? new Date(input.endDate) : null,
                isActive: input.status !== RoadClosureStatus.REOPENED,
                createdById: auth.userId,
                createdByRole: auth.userRole
            }
        });

        revalidatePath("/admin/road-closures");
        revalidatePath("/");
        return { success: true, data: newClosure };
    } catch (error: any) {
        console.error("[createRoadClosureAction] Error:", error);
        return { success: false, error: error.message || "Failed to create road closure" };
    }
}

// =========================================================================
// UPDATE: Modify closure details
// =========================================================================
export async function updateRoadClosureAction(id: string, input: Partial<RoadClosureInput>) {
    try {
        const auth = await verifyRoadClosureAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const existing = await prisma.roadClosure.findUnique({ where: { id } });
        if (!existing) {
            return { success: false, error: "Road closure record not found." };
        }

        const updateData: any = {
            updatedAt: new Date()
        };

        if (input.title !== undefined) updateData.title = input.title.trim();
        if (input.description !== undefined) updateData.description = input.description?.trim() || null;
        if (input.status !== undefined) {
            updateData.status = input.status;
            if (input.status === RoadClosureStatus.REOPENED) {
                updateData.isActive = false;
            } else {
                updateData.isActive = true;
            }
        }
        if (input.severity !== undefined) updateData.severity = input.severity;
        if (input.barangay !== undefined) updateData.barangay = input.barangay?.trim() || null;
        if (input.roadName !== undefined) updateData.roadName = input.roadName?.trim() || null;
        if (input.startLocation !== undefined) updateData.startLocation = input.startLocation;
        if (input.endLocation !== undefined) updateData.endLocation = input.endLocation;
        if (input.routeCoordinates !== undefined) updateData.routeCoordinates = input.routeCoordinates;
        if (input.detourAdvice !== undefined) updateData.detourAdvice = input.detourAdvice?.trim() || null;
        if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
        if (input.endDate !== undefined) updateData.endDate = input.endDate ? new Date(input.endDate) : null;

        const updated = await prisma.roadClosure.update({
            where: { id },
            data: updateData
        });

        revalidatePath("/admin/road-closures");
        revalidatePath("/");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[updateRoadClosureAction] Error:", error);
        return { success: false, error: error.message || "Failed to update road closure" };
    }
}

// =========================================================================
// TOGGLE STATUS: Quick update (e.g. Reopen or Close)
// =========================================================================
export async function toggleRoadClosureStatusAction(id: string, newStatus: RoadClosureStatus) {
    try {
        const auth = await verifyRoadClosureAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const isActive = newStatus !== RoadClosureStatus.REOPENED;

        const updated = await prisma.roadClosure.update({
            where: { id },
            data: {
                status: newStatus,
                isActive,
                endDate: newStatus === RoadClosureStatus.REOPENED ? new Date() : undefined
            }
        });

        revalidatePath("/admin/road-closures");
        revalidatePath("/");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[toggleRoadClosureStatusAction] Error:", error);
        return { success: false, error: error.message || "Failed to change road status" };
    }
}

// =========================================================================
// DELETE: Delete record
// =========================================================================
export async function deleteRoadClosureAction(id: string) {
    try {
        const auth = await verifyRoadClosureAccess();
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        await prisma.roadClosure.delete({
            where: { id }
        });

        revalidatePath("/admin/road-closures");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteRoadClosureAction] Error:", error);
        return { success: false, error: error.message || "Failed to delete road closure" };
    }
}
