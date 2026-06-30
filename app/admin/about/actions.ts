"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { processImageUpload, deleteUploadedFile } from "@/app/admin/settings/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
        if (targetBarangay) {
            const existing = await (prisma as any).barangayInfo.findUnique({ where: { name: targetBarangay } });
            const logoUrl = await processImageUpload(formData, "logo");
            const coverImageUrl = await processImageUpload(formData, "coverImage");
            const captainImageUrl = await processImageUpload(formData, "captain-image");

            // Auto-delete old images if replaced
            if (logoUrl && existing?.logoUrl && existing.logoUrl !== logoUrl) await deleteUploadedFile(existing.logoUrl);
            if (coverImageUrl && existing?.coverImageUrl && existing.coverImageUrl !== coverImageUrl) await deleteUploadedFile(existing.coverImageUrl);
            if (captainImageUrl && existing?.captainImageUrl && existing.captainImageUrl !== captainImageUrl) await deleteUploadedFile(existing.captainImageUrl);

            await (prisma as any).barangayInfo.upsert({
                where: { name: targetBarangay },
                update: {
                    description: formData.get("description") as string,
                    logoUrl: logoUrl || (formData.get("logoUrl") as string),
                    coverImageUrl: coverImageUrl || (formData.get("coverImageUrl") as string),
                    captainName: formData.get("captainName") as string,
                    captainMessage: formData.get("captainMessage") as string,
                    captainImageUrl: captainImageUrl || (formData.get("captainImageUrl") as string),
                    history: formData.get("history") as string,
                    mission: formData.get("mission") as string,
                    vision: formData.get("vision") as string,
                    coreValues: formData.get("coreValues") as string,
                    geographyOrDemographics: formData.get("geographyOrDemographics") as string,
                } as any,
                create: {
                    name: targetBarangay,
                    description: formData.get("description") as string,
                    logoUrl: logoUrl || (formData.get("logoUrl") as string),
                    coverImageUrl: coverImageUrl || (formData.get("coverImageUrl") as string),
                    captainName: formData.get("captainName") as string,
                    captainMessage: formData.get("captainMessage") as string,
                    captainImageUrl: captainImageUrl || (formData.get("captainImageUrl") as string),
                    history: formData.get("history") as string,
                    mission: formData.get("mission") as string,
                    vision: formData.get("vision") as string,
                    coreValues: formData.get("coreValues") as string,
                    geographyOrDemographics: formData.get("geographyOrDemographics") as string,
                } as any
            });
        } else {
            const mayorImageUrl = await processImageUpload(formData, "mayor-image");
            const existing = await (prisma as any).aboutPage.findFirst();

            // Auto-delete old mayor image if replaced
            if (mayorImageUrl && existing?.mayorImageUrl && existing.mayorImageUrl !== mayorImageUrl) {
                await deleteUploadedFile(existing.mayorImageUrl);
            }

            const data = {
                history: formData.get("history") as string,
                mission: formData.get("mission") as string,
                vision: formData.get("vision") as string,
                coreValues: formData.get("coreValues") as string,
                geographyOrDemographics: formData.get("geographyOrDemographics") as string,
                mayorName: formData.get("mayorName") as string,
                mayorMessage: formData.get("mayorMessage") as string,
                mayorImageUrl: mayorImageUrl || (formData.get("mayorImageUrl") as string),
            };

            if (existing) {
                await (prisma as any).aboutPage.update({
                    where: { id: existing.id },
                    data
                });
            } else {
                await (prisma as any).aboutPage.create({ data });
            }
        }

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
        revalidatePath("/about");
        revalidatePath("/admin/about");
        revalidatePath("/admin/about/past-mayors");
        return { success: true };
    } catch {
        return { success: false };
    }
}
