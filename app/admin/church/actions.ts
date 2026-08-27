"use server";

 
import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { processFileUpload, deleteUploadedFile } from "@/app/admin/settings/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

async function verifyAdminOrBarangayAdmin() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "BARANGAY_ADMIN")) {
        throw new Error("Unauthorized: Access denied.");
    }
    return session.user;
}

export async function updateChurchInfo(id: string, formData: FormData) {
    try {
        await verifyAdminOrBarangayAdmin();
        const existing = await (prisma as any).churchInfo.findUnique({ where: { id } });
        
        // Handle Flyer Upload
        let flyerUrl = formData.get("flyerUrl")?.toString() || "";
        const uploadedFlyerUrl = await processFileUpload(formData, "flyerFile");

        if (uploadedFlyerUrl) {
            flyerUrl = uploadedFlyerUrl;
        }

        // Delete old file if new one was uploaded
        if (existing?.flyerUrl && existing.flyerUrl !== flyerUrl) {
            await deleteUploadedFile(existing.flyerUrl);
        }

        const updated = await (prisma as any).churchInfo.update({
            where: { id },
            data: {
                name: formData.get("name")?.toString() || "",
                address: formData.get("address")?.toString() || "",
                locationUrl: formData.get("locationUrl")?.toString() || "",
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                flyerUrl: flyerUrl || null,
            }
        });
        revalidatePath("/admin/church");
        revalidatePath("/");

        // Log Church Info Update
        await logActivity({
            action: "UPDATE",
            entityType: "ChurchInfo",
            entityId: id,
            entityName: updated.name || "Church Info",
            description: `Updated church profile: "${updated.name}"`,
            metadata: { name: updated.name, address: updated.address }
        });

        return updated;
    } catch (error) {
        console.error("Error updating church info:", error);
        throw error;
    }
}

export async function addMassSchedule(data: any) {
    await verifyAdminOrBarangayAdmin();
    const created = await (prisma as any).churchSchedule.create({
        data: {
            churchInfoId: data.churchInfoId,
            day: data.day,
            time: data.time,
            language: data.language,
            type: data.type,
            date: data.date ? new Date(data.date) : null,
            prio: Number(data.prio || 0),
            description: data.description || null
        }
    });
    revalidatePath("/admin/church");
    revalidatePath("/");

    // Log Mass Schedule Creation
    await logActivity({
        action: "CREATE",
        entityType: "ChurchSchedule",
        entityId: created.id,
        entityName: `${data.day} ${data.time}`,
        description: `Added mass schedule: ${data.day} at ${data.time} (${data.language})`,
        metadata: { day: data.day, time: data.time, language: data.language }
    });

    return created;
}

export async function updateMassSchedule(id: string, data: any) {
    await verifyAdminOrBarangayAdmin();
    const updated = await (prisma as any).churchSchedule.update({
        where: { id },
        data: {
            day: data.day,
            time: data.time,
            language: data.language,
            type: data.type,
            date: data.date ? new Date(data.date) : null,
            prio: Number(data.prio || 0),
            description: data.description || null
        }
    });
    revalidatePath("/admin/church");
    revalidatePath("/");

    // Log Mass Schedule Update
    await logActivity({
        action: "UPDATE",
        entityType: "ChurchSchedule",
        entityId: id,
        entityName: `${data.day} ${data.time}`,
        description: `Updated mass schedule: ${data.day} at ${data.time}`,
        metadata: { day: data.day, time: data.time }
    });

    return updated;
}

export async function deleteMassSchedule(id: string) {
    await verifyAdminOrBarangayAdmin();
    await (prisma as any).churchSchedule.delete({ where: { id } });
    revalidatePath("/admin/church");
    revalidatePath("/");

    // Log Mass Schedule Deletion
    await logActivity({
        action: "DELETE",
        entityType: "ChurchSchedule",
        entityId: id,
        entityName: "Mass Schedule",
        description: `Deleted mass schedule (ID: ${id})`,
        metadata: { scheduleId: id }
    });
}

export async function saveChurchCollection(data: any) {
    await verifyAdminOrBarangayAdmin();
    // Generate total amount
    let total = Number(data.secondBasket || 0) + Number(data.weekdays || 0) + Number(data.envelopes || 0);
    
    // Add sunday mass amounts if present
    if (data.sundayMassJson) {
        data.sundayMassJson.forEach((item: any) => {
            total += Number(item.amount || 0);
        });
    }
    
    // Add donations
    if (data.donationsJson) {
        data.donationsJson.forEach((item: any) => {
            total += Number(item.amount || 0);
        });
    }

    const payload = {
        churchInfoId: data.churchInfoId,
        date: new Date(data.date),
        sundayMassJson: data.sundayMassJson,
        secondBasket: Number(data.secondBasket || 0),
        weekdays: Number(data.weekdays || 0),
        envelopes: Number(data.envelopes || 0),
        donationsJson: data.donationsJson,
        totalAmount: total
    };

    let result;
    if (data.id) {
        result = await (prisma as any).churchCollection.update({
            where: { id: data.id },
            data: payload
        });
    } else {
        result = await (prisma as any).churchCollection.create({
            data: payload
        });
    }
    
    revalidatePath("/admin/church");
    revalidatePath("/");

    // Log Church Collection
    await logActivity({
        action: data.id ? "UPDATE" : "CREATE",
        entityType: "ChurchCollection",
        entityId: result.id,
        entityName: `₱${total.toLocaleString()}`,
        description: `${data.id ? "Updated" : "Recorded"} church collection of ₱${total.toLocaleString()} for ${new Date(data.date).toLocaleDateString()}`,
        metadata: { totalAmount: total, date: data.date }
    });

    return result;
}

export async function deleteCollectionEntry(id: string) {
    await verifyAdminOrBarangayAdmin();
    await (prisma as any).churchCollection.delete({ where: { id } });
    revalidatePath("/admin/church");
    revalidatePath("/");

    // Log Church Collection Deletion
    await logActivity({
        action: "DELETE",
        entityType: "ChurchCollection",
        entityId: id,
        entityName: "Church Collection Record",
        description: `Deleted church collection entry (ID: ${id})`,
        metadata: { collectionId: id }
    });
}
