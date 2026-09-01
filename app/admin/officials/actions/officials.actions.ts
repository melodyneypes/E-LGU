"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

interface SessionUser {
    id?: string;
    email?: string;
    role?: string;
    department?: string;
    managedBarangay?: string;
    accessiblePages?: string[];
}

/**
 * 1. SECURITY & PERMISSIONS GUARD
 * Enforces role clearances: ADMIN (LGU), CONTENT_ADMIN, BARANGAY_ADMIN (scoped), or custom accessiblePages
 */
export async function verifyOfficialAccess(): Promise<{
    user: SessionUser;
    isBarangayAdmin: boolean;
    managedBarangay: string | null;
}> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        throw new Error("Unauthorized access. Please sign in.");
    }

    const user = session.user as SessionUser;
    const role = user.role;
    const department = (user.department || "").toUpperCase();
    const accessiblePages = user.accessiblePages || [];

    const isLguAdmin = role === "ADMIN" && (department === "LGU" || !department);
    const isContentAdmin = role === "CONTENT_ADMIN";
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const hasPageAccess = accessiblePages.includes("/admin/officials");

    if (!isLguAdmin && !isContentAdmin && !isBarangayAdmin && !hasPageAccess) {
        throw new Error("Forbidden: You do not have permissions to manage municipal or barangay officials.");
    }

    return {
        user,
        isBarangayAdmin,
        managedBarangay: user.managedBarangay || null
    };
}

/**
 * 2. GET ALL OFFICIALS (LEAN SELECT WITH BARANGAY SCOPING)
 */
export async function getAdminOfficials(params?: { barangay?: string; category?: string }) {
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyOfficialAccess();

        const whereClause: any = {};
        if (isBarangayAdmin && managedBarangay) {
            whereClause.barangay = managedBarangay;
        } else if (params?.barangay && params.barangay !== "All") {
            if (params.barangay === "LGU") {
                whereClause.OR = [{ category: "LGU" }, { barangay: null }];
            } else {
                whereClause.barangay = params.barangay;
            }
        }

        if (params?.category && params.category !== "All") {
            whereClause.category = params.category;
        }

        const officials = await (prisma as any).official.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                position: true,
                email: true,
                contactNumber: true,
                bio: true,
                education: true,
                motto: true,
                achievements: true,
                termStart: true,
                termEnd: true,
                links: true,
                order: true,
                imageUrl: true,
                isActive: true,
                barangay: true,
                category: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: [{ order: "asc" }, { createdAt: "desc" }]
        });

        return { success: true, data: officials, officials };
    } catch (error: any) {
        console.error("[getAdminOfficials] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch government officials." };
    }
}

/**
 * 3. GET OFFICIAL BY ID (FAST MODAL SYNC)
 */
export async function getOfficialById(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Official ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyOfficialAccess();

        const official = await (prisma as any).official.findUnique({
            where: { id }
        });

        if (!official) {
            return { success: false, error: "Official profile not found." };
        }

        if (isBarangayAdmin && official.barangay && official.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized access to official profile from another barangay." };
        }

        return { success: true, data: official, official };
    } catch (error: any) {
        console.error("[getOfficialById] Error:", error);
        return { success: false, error: error?.message || "Failed to fetch official profile." };
    }
}

/**
 * 4. ADD OFFICIAL PROFILE + IMAGE UPLOAD + AUDIT LOGGING
 */
export async function addOfficial(formData: FormData) {
    let uploadedImageUrl: string | null = null;
    try {
        const { isBarangayAdmin, managedBarangay } = await verifyOfficialAccess();

        const name = (formData.get("name") as string)?.trim();
        const position = (formData.get("position") as string)?.trim();
        const email = (formData.get("email") as string)?.trim() || null;
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || null;
        const bio = (formData.get("bio") as string)?.trim() || null;
        const education = (formData.get("education") as string)?.trim() || null;
        const motto = (formData.get("motto") as string)?.trim() || null;
        const achievements = (formData.get("achievements") as string)?.trim() || null;

        const termStartStr = formData.get("termStart") as string;
        const termStart = termStartStr ? new Date(termStartStr) : null;
        const termEndStr = formData.get("termEnd") as string;
        const termEnd = termEndStr ? new Date(termEndStr) : null;

        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : 0;
        const order = isNaN(parsedOrder) ? 99 : parsedOrder;

        let category = (formData.get("category") as string)?.trim() || "LGU";
        let barangay = (formData.get("barangay") as string)?.trim() || null;

        if (isBarangayAdmin) {
            category = "Barangay Council";
            barangay = managedBarangay;
        }

        if (!name || !position) {
            return { success: false, error: "Official name and position are required." };
        }

        // Parse Links
        const linksJson = formData.get("links") as string;
        let links: any[] = [];
        try {
            links = linksJson ? JSON.parse(linksJson) : [];
        } catch {
            links = [];
        }

        // Handle Image Upload (Checking both 'image' and 'imageFile' form keys)
        const imageFile = (formData.get("image") || formData.get("imageFile")) as File | null;
        if (imageFile && imageFile.size > 0 && typeof imageFile.name === "string" && imageFile.name !== "undefined") {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const fileName = `officials/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const publicUrl = await uploadFile(buffer, fileName, "system-assets", imageFile.type);
            if (publicUrl) {
                uploadedImageUrl = publicUrl;
            }
        }

        const newOfficial = await (prisma as any).official.create({
            data: {
                name,
                position,
                email,
                contactNumber,
                bio,
                education,
                motto,
                achievements,
                termStart,
                termEnd,
                links,
                order,
                imageUrl: uploadedImageUrl,
                isActive: true,
                barangay: barangay || null,
                category
            }
        });

        revalidatePath("/");
        revalidatePath("/admin/officials");
        revalidatePath("/about/officials");

        // Audit Logging
        try {
            await logActivity({
                action: "CREATE",
                entityType: "Official",
                entityId: newOfficial.id,
                entityName: name,
                description: `Added government official profile: "${name}" (${position} - ${category})`,
                metadata: {
                    name,
                    position,
                    category,
                    barangay: barangay || "LGU Wide",
                    order
                }
            });
        } catch (auditErr) {
            console.warn("[addOfficial] Audit log warning:", auditErr);
        }

        return { success: true, data: newOfficial, official: newOfficial };
    } catch (error: any) {
        // Rollback uploaded image if database save failed
        if (uploadedImageUrl) {
            try {
                await deleteFileByUrl(uploadedImageUrl);
            } catch (rollbackErr) {
                console.warn("[addOfficial] Storage rollback warning:", rollbackErr);
            }
        }
        console.error("[addOfficial] Error:", error);
        return { success: false, error: error?.message || "Failed to create official profile." };
    }
}

/**
 * 5. UPDATE OFFICIAL PROFILE + STORAGE CLEANUP + AUDIT DIFFS
 */
export async function updateOfficial(id: string, formData: FormData) {
    let uploadedImageUrl: string | null = null;
    try {
        if (!id) {
            return { success: false, error: "Official ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyOfficialAccess();

        const existing = await (prisma as any).official.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Official profile not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized to modify official profile from another barangay." };
        }

        const name = (formData.get("name") as string)?.trim() || existing.name;
        const position = (formData.get("position") as string)?.trim() || existing.position;
        const email = (formData.get("email") as string)?.trim() || null;
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || null;
        const bio = (formData.get("bio") as string)?.trim() || null;
        const education = (formData.get("education") as string)?.trim() || null;
        const motto = (formData.get("motto") as string)?.trim() || null;
        const achievements = (formData.get("achievements") as string)?.trim() || null;

        const termStartStr = formData.get("termStart") as string;
        const termStart = termStartStr ? new Date(termStartStr) : null;
        const termEndStr = formData.get("termEnd") as string;
        const termEnd = termEndStr ? new Date(termEndStr) : null;

        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : existing.order;
        const order = isNaN(parsedOrder) ? existing.order : parsedOrder;

        let category = (formData.get("category") as string)?.trim() || existing.category;
        let barangay = (formData.get("barangay") as string)?.trim() || existing.barangay;

        if (isBarangayAdmin) {
            category = "Barangay Council";
            barangay = managedBarangay;
        }

        // Parse Links
        const linksJson = formData.get("links") as string;
        let links: any[] = existing.links || [];
        if (linksJson !== undefined) {
            try {
                links = linksJson ? JSON.parse(linksJson) : [];
            } catch {
                links = existing.links;
            }
        }

        // Handle Image Upload & Removal (Checking both 'image' and 'imageFile' keys)
        const imageFile = (formData.get("image") || formData.get("imageFile")) as File | null;
        const imageRemoved = formData.get("imageRemoved") === "true";
        let finalImageUrl = existing.imageUrl;

        if (imageFile && imageFile.size > 0 && typeof imageFile.name === "string" && imageFile.name !== "undefined") {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const fileName = `officials/${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const publicUrl = await uploadFile(buffer, fileName, "system-assets", imageFile.type);
            if (publicUrl) {
                uploadedImageUrl = publicUrl;
                finalImageUrl = publicUrl;
            }
        } else if (imageRemoved) {
            finalImageUrl = null;
        }

        const updatedOfficial = await (prisma as any).official.update({
            where: { id },
            data: {
                name,
                position,
                email,
                contactNumber,
                bio,
                education,
                motto,
                achievements,
                termStart,
                termEnd,
                links,
                order,
                imageUrl: finalImageUrl,
                category,
                barangay: barangay || null
            }
        });

        // Cleanup old image in bucket if updated or removed
        if (existing.imageUrl && (uploadedImageUrl || imageRemoved) && existing.imageUrl !== finalImageUrl) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (cleanupErr) {
                console.warn("[updateOfficial] Old image cleanup warning:", cleanupErr);
            }
        }

        revalidatePath("/");
        revalidatePath("/admin/officials");
        revalidatePath("/about/officials");

        // Audit Logging with Precise Field Diffs
        try {
            const changes: Record<string, { old: any; new: any }> = {};
            if ((existing.name || "") !== (name || "")) changes["name"] = { old: existing.name, new: name };
            if ((existing.position || "") !== (position || "")) changes["position"] = { old: existing.position, new: position };
            if ((existing.email || "") !== (email || "")) changes["email"] = { old: existing.email || "None", new: email || "None" };
            if ((existing.contactNumber || "") !== (contactNumber || "")) changes["contactNumber"] = { old: existing.contactNumber || "None", new: contactNumber || "None" };
            if (existing.order !== order) changes["order"] = { old: existing.order, new: order };
            if ((existing.category || "") !== (category || "")) changes["category"] = { old: existing.category, new: category };
            if ((existing.barangay || "") !== (barangay || "")) changes["barangay"] = { old: existing.barangay || "LGU", new: barangay || "LGU" };
            if ((existing.bio || "") !== (bio || "")) changes["bio"] = { old: existing.bio || "", new: bio || "" };
            if ((existing.education || "") !== (education || "")) changes["education"] = { old: existing.education || "", new: education || "" };
            if ((existing.motto || "") !== (motto || "")) changes["motto"] = { old: existing.motto || "", new: motto || "" };
            if ((existing.achievements || "") !== (achievements || "")) changes["achievements"] = { old: existing.achievements || "", new: achievements || "" };

            // Term Start & End Comparison (Calendar Date YYYY-MM-DD Comparison)
            const getCalendarDateStr = (d: any) => {
                if (!d) return null;
                const parsed = new Date(d);
                if (isNaN(parsed.getTime())) return null;
                return parsed.toISOString().slice(0, 10);
            };

            const oldStartDateStr = getCalendarDateStr(existing.termStart);
            const newStartDateStr = getCalendarDateStr(termStart);
            if (oldStartDateStr !== newStartDateStr) {
                const oldStartDisplay = existing.termStart ? new Date(existing.termStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None";
                const newStartDisplay = termStart ? termStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None";
                changes["termStart"] = { old: oldStartDisplay, new: newStartDisplay };
            }

            const oldEndDateStr = getCalendarDateStr(existing.termEnd);
            const newEndDateStr = getCalendarDateStr(termEnd);
            if (oldEndDateStr !== newEndDateStr) {
                const oldEndDisplay = existing.termEnd ? new Date(existing.termEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None";
                const newEndDisplay = termEnd ? termEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "None";
                changes["termEnd"] = { old: oldEndDisplay, new: newEndDisplay };
            }

            // Links Comparison (Formatted text)
            const oldLinksStr = JSON.stringify(existing.links || []);
            const newLinksStr = JSON.stringify(links || []);
            if (oldLinksStr !== newLinksStr) {
                const formatLinksToText = (items: any[]) => {
                    if (!items || !Array.isArray(items) || items.length === 0) return "No links attached";
                    return items.map((l: any) => `• ${l.label || "Link"}: ${l.url || "No URL"}`).join("\n");
                };
                changes["links"] = { old: formatLinksToText(existing.links), new: formatLinksToText(links) };
            }

            // Image URL Comparison (Shows actual URL path or None/Removed)
            if (existing.imageUrl !== finalImageUrl) {
                changes["image"] = { 
                    old: existing.imageUrl || "No Image", 
                    new: finalImageUrl || "Removed" 
                };
            }

            const modifiedFieldNames = Object.keys(changes);
            const descriptionSummary = modifiedFieldNames.length > 0
                ? `Updated official profile "${updatedOfficial.name}" (Modified: ${modifiedFieldNames.join(", ")})`
                : `Updated official profile "${updatedOfficial.name}"`;

            await logActivity({
                action: "UPDATE",
                entityType: "Official",
                entityId: id,
                entityName: updatedOfficial.name,
                description: descriptionSummary,
                metadata: {
                    name: updatedOfficial.name,
                    changes,
                    previousName: existing.name
                }
            });
        } catch (auditErr) {
            console.warn("[updateOfficial] Audit log warning:", auditErr);
        }

        return { success: true, data: updatedOfficial, official: updatedOfficial };
    } catch (error: any) {
        // Rollback newly uploaded image on failure
        if (uploadedImageUrl) {
            try {
                await deleteFileByUrl(uploadedImageUrl);
            } catch (rollbackErr) {
                console.warn("[updateOfficial] Storage rollback warning:", rollbackErr);
            }
        }
        console.error("[updateOfficial] Error:", error);
        return { success: false, error: error?.message || "Failed to update official profile." };
    }
}

/**
 * 6. TOGGLE OFFICIAL ACTIVE STATUS + AUDIT LOGGING
 */
export async function toggleOfficialStatus(id: string, isActive: boolean) {
    try {
        if (!id) {
            return { success: false, error: "Official ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyOfficialAccess();

        const existing = await (prisma as any).official.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Official profile not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized to update status of official from another barangay." };
        }

        const updated = await (prisma as any).official.update({
            where: { id },
            data: { isActive }
        });

        revalidatePath("/admin/officials");
        revalidatePath("/about/officials");

        // Audit Logging
        try {
            await logActivity({
                action: "UPDATE",
                entityType: "Official",
                entityId: id,
                entityName: existing.name,
                description: `Changed status of official "${existing.name}" to ${isActive ? "Active" : "Inactive"}`,
                metadata: {
                    name: existing.name,
                    changes: { isActive: { old: existing.isActive, new: isActive } }
                }
            });
        } catch (auditErr) {
            console.warn("[toggleOfficialStatus] Audit log warning:", auditErr);
        }

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("[toggleOfficialStatus] Error:", error);
        return { success: false, error: error?.message || "Failed to update official status." };
    }
}

/**
 * 7. DELETE OFFICIAL PROFILE + STORAGE CLEANUP + AUDIT SNAPSHOT
 */
export async function deleteOfficial(id: string) {
    try {
        if (!id) {
            return { success: false, error: "Official ID is required." };
        }

        const { isBarangayAdmin, managedBarangay } = await verifyOfficialAccess();

        const existing = await (prisma as any).official.findUnique({
            where: { id }
        });

        if (!existing) {
            return { success: false, error: "Official profile not found." };
        }

        if (isBarangayAdmin && existing.barangay && existing.barangay !== managedBarangay) {
            return { success: false, error: "Unauthorized to delete official profile from another barangay." };
        }

        // Delete profile photo from storage bucket
        if (existing.imageUrl) {
            try {
                await deleteFileByUrl(existing.imageUrl);
            } catch (storageErr) {
                console.warn("[deleteOfficial] Photo deletion warning:", storageErr);
            }
        }

        await (prisma as any).official.delete({
            where: { id }
        });

        revalidatePath("/");
        revalidatePath("/admin/officials");
        revalidatePath("/about/officials");

        // Audit Logging with Recovery Snapshot
        try {
            await logActivity({
                action: "DELETE",
                entityType: "Official",
                entityId: id,
                entityName: existing.name,
                description: `Deleted official profile: "${existing.name}" (${existing.position})`,
                metadata: {
                    deletedRecordSnapshot: existing
                }
            });
        } catch (auditErr) {
            console.warn("[deleteOfficial] Audit log warning:", auditErr);
        }

        return { success: true };
    } catch (error: any) {
        console.error("[deleteOfficial] Error:", error);
        return { success: false, error: error?.message || "Failed to delete official profile." };
    }
}
