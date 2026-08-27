"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { processImageUpload, deleteUploadedFile } from "@/app/admin/settings/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/audit";

export async function getAboutData(barangayName?: string | null) {
    if (barangayName) {
        return await (prisma as any).barangayInfo.findUnique({
            where: { name: barangayName }
        });
    }
    return await (prisma as any).aboutPage.findFirst();
}

export async function getLeaders(barangayName?: string | null) {
    return await (prisma as any).pastMayor.findMany({
        where: {
            barangay: barangayName || null
        },
        orderBy: { order: 'asc' }
    });
}

export async function upsertAboutData(formData: FormData) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "BARANGAY_ADMIN")) {
        throw new Error("Unauthorized: Access denied.");
    }
    const managedBarangay = (session?.user as any)?.managedBarangay;
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const targetBarangay = isBarangayAdmin ? managedBarangay : formData.get("barangayName") as string;

    try {
        // Compute granular changes for accurate audit trail
        const changes: Record<string, { old: any; new: any }> = {};
        const changedFieldNames: string[] = [];

        const fieldsToTrack: { key: string; label: string }[] = targetBarangay
            ? [
                  { key: "history", label: "Historical Narrative" },
                  { key: "geographyOrDemographics", label: "Geography & Demographics" },
                  { key: "mission", label: "Mission Statement" },
                  { key: "vision", label: "Vision Statement" },
                  { key: "coreValues", label: "Core Values" },
                  { key: "captainName", label: "Barangay Captain Name" },
                  { key: "captainMessage", label: "Captain's Message" },
                  { key: "description", label: "Brief Overview" },
              ]
            : [
                  { key: "history", label: "Historical Narrative" },
                  { key: "geographyOrDemographics", label: "Geography & Fact Sheet" },
                  { key: "mission", label: "Mission Statement" },
                  { key: "vision", label: "Vision Statement" },
                  { key: "coreValues", label: "Core Values" },
                  { key: "mayorName", label: "Mayor Name" },
                  { key: "mayorMessage", label: "Mayor's Message" },
              ];

        const targetData: Record<string, any> = targetBarangay
            ? {
                  description: formData.get("description") as string,
                  captainName: formData.get("captainName") as string,
                  captainMessage: formData.get("captainMessage") as string,
                  history: formData.get("history") as string,
                  mission: formData.get("mission") as string,
                  vision: formData.get("vision") as string,
                  coreValues: formData.get("coreValues") as string,
                  geographyOrDemographics: formData.get("geographyOrDemographics") as string,
              }
            : {
                  history: formData.get("history") as string,
                  mission: formData.get("mission") as string,
                  vision: formData.get("vision") as string,
                  coreValues: formData.get("coreValues") as string,
                  geographyOrDemographics: formData.get("geographyOrDemographics") as string,
                  mayorName: formData.get("mayorName") as string,
                  mayorMessage: formData.get("mayorMessage") as string,
              };

        const existingRecord = targetBarangay
            ? await (prisma as any).barangayInfo.findUnique({ where: { name: targetBarangay } })
            : await (prisma as any).aboutPage.findFirst();

        for (const field of fieldsToTrack) {
            const oldVal = existingRecord ? existingRecord[field.key] ?? "" : "";
            const newVal = targetData[field.key] ?? "";

            if (oldVal !== newVal) {
                changes[field.key] = {
                    old: oldVal || null,
                    new: newVal || null,
                };
                changedFieldNames.push(field.label);
            }
        }

        if (targetBarangay) {
            const logoUrl = await processImageUpload(formData, "logo");
            const coverImageUrl = await processImageUpload(formData, "coverImage");
            const captainImageUrl = await processImageUpload(formData, "captain-image");

            // Auto-delete old images if replaced
            if (logoUrl && existingRecord?.logoUrl && existingRecord.logoUrl !== logoUrl) await deleteUploadedFile(existingRecord.logoUrl);
            if (coverImageUrl && existingRecord?.coverImageUrl && existingRecord.coverImageUrl !== coverImageUrl) await deleteUploadedFile(existingRecord.coverImageUrl);
            if (captainImageUrl && existingRecord?.captainImageUrl && existingRecord.captainImageUrl !== captainImageUrl) await deleteUploadedFile(existingRecord.captainImageUrl);

            if (logoUrl && existingRecord?.logoUrl !== logoUrl) {
                changes["logoUrl"] = { old: existingRecord?.logoUrl || null, new: logoUrl };
                changedFieldNames.push("Official Logo");
            }
            if (coverImageUrl && existingRecord?.coverImageUrl !== coverImageUrl) {
                changes["coverImageUrl"] = { old: existingRecord?.coverImageUrl || null, new: coverImageUrl };
                changedFieldNames.push("Cover Banner Image");
            }
            if (captainImageUrl && existingRecord?.captainImageUrl !== captainImageUrl) {
                changes["captainImageUrl"] = { old: existingRecord?.captainImageUrl || null, new: captainImageUrl };
                changedFieldNames.push("Captain Portrait");
            }

            await (prisma as any).barangayInfo.upsert({
                where: { name: targetBarangay },
                update: {
                    ...targetData,
                    logoUrl: logoUrl || (formData.get("logoUrl") as string),
                    coverImageUrl: coverImageUrl || (formData.get("coverImageUrl") as string),
                    captainImageUrl: captainImageUrl || (formData.get("captainImageUrl") as string),
                } as any,
                create: {
                    name: targetBarangay,
                    ...targetData,
                    logoUrl: logoUrl || (formData.get("logoUrl") as string),
                    coverImageUrl: coverImageUrl || (formData.get("coverImageUrl") as string),
                    captainImageUrl: captainImageUrl || (formData.get("captainImageUrl") as string),
                } as any
            });
        } else {
            const mayorImageUrl = await processImageUpload(formData, "mayor-image");

            // Auto-delete old mayor image if replaced
            if (mayorImageUrl && existingRecord?.mayorImageUrl && existingRecord.mayorImageUrl !== mayorImageUrl) {
                await deleteUploadedFile(existingRecord.mayorImageUrl);
            }

            if (mayorImageUrl && existingRecord?.mayorImageUrl !== mayorImageUrl) {
                changes["mayorImageUrl"] = { old: existingRecord?.mayorImageUrl || null, new: mayorImageUrl };
                changedFieldNames.push("Mayor Official Portrait");
            }

            const data = {
                ...targetData,
                mayorImageUrl: mayorImageUrl || (formData.get("mayorImageUrl") as string),
            };

            if (existingRecord) {
                await (prisma as any).aboutPage.update({
                    where: { id: existingRecord.id },
                    data
                });
            } else {
                await (prisma as any).aboutPage.create({ data });
            }
        }

        // Build clear, human-readable audit description
        let dynamicDesc = "";
        if (changedFieldNames.length > 0) {
            dynamicDesc = `Updated ${changedFieldNames.join(", ")} for ${targetBarangay ? `Brgy. ${targetBarangay}` : "Municipal Overview"}`;
        } else {
            dynamicDesc = `Saved ${targetBarangay ? `Barangay ${targetBarangay} profile` : "Municipal About page"} (no content altered)`;
        }

        // Log About Update with exact state diffs
        await logActivity({
            action: "UPDATE",
            entityType: "AboutPage",
            entityName: targetBarangay ? `Brgy. ${targetBarangay}` : "Municipal Overview",
            description: dynamicDesc,
            metadata: {
                barangay: targetBarangay || null,
                changedFields: changedFieldNames,
                changes: Object.keys(changes).length > 0 ? changes : null
            }
        });

        revalidatePath("/about");
        revalidatePath("/admin/about");
        revalidatePath("/admin/about/past-mayors");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating about:", error);
        return { success: false, error: error.message };
    }
}

export async function getPastMayors(barangayName?: string | null) {
    return await getLeaders(barangayName);
}

export async function upsertPastMayor(id: string | null, formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role;
        if (!session || (role !== "ADMIN" && role !== "BARANGAY_ADMIN")) {
            throw new Error("Unauthorized: Access denied.");
        }

        const oldMayor = id ? await (prisma as any).pastMayor.findUnique({ where: { id } }) : null;
        const imageUrl = await processImageUpload(formData, "past-mayor");

        // Auto-delete old image if replaced
        if (imageUrl && oldMayor?.imageUrl && oldMayor.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldMayor.imageUrl);
        }
        const managedBarangay = (session?.user as any)?.managedBarangay;

        const data = {
            name: formData.get("name") as string,
            termStart: formData.get("termStart") as string,
            termEnd: formData.get("termEnd") as string,
            description: formData.get("description") as string,
            order: parseInt(formData.get("order") as string) || 0,
            imageUrl: imageUrl || (formData.get("imageUrl") as string) || "",
            barangay: role === "BARANGAY_ADMIN" ? managedBarangay : null,
        };

        if (id) {
            await (prisma as any).pastMayor.update({
                where: { id },
                data: data as any
            });
        } else {
            await (prisma as any).pastMayor.create({
                data: data as any
            });
        }

        // Log Past Mayor Action
        await logActivity({
            action: id ? "UPDATE" : "CREATE",
            entityType: "PastMayor",
            entityId: id || undefined,
            entityName: data.name,
            description: `${id ? "Updated" : "Added"} historical leader: "${data.name}" (${data.termStart} - ${data.termEnd})`,
            metadata: { name: data.name, term: `${data.termStart} - ${data.termEnd}` }
        });

        revalidatePath("/about");
        revalidatePath("/admin/about");
        revalidatePath("/admin/about/past-mayors");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deletePastMayor(id: string) {
    try {
        const item = await (prisma as any).pastMayor.findUnique({ where: { id } });
        if (item?.imageUrl) await deleteUploadedFile(item.imageUrl);
        await (prisma as any).pastMayor.delete({ where: { id } });

        // Log Past Mayor Deletion
        await logActivity({
            action: "DELETE",
            entityType: "PastMayor",
            entityId: id,
            entityName: item?.name || "Past Mayor",
            description: `Deleted historical leader entry: "${item?.name || id}"`,
            metadata: { name: item?.name }
        });

        revalidatePath("/about");
        revalidatePath("/admin/about");
        revalidatePath("/admin/about/past-mayors");
        return { success: true };
    } catch {
        return { success: false };
    }
}
