
/* eslint-disable @typescript-eslint/no-unused-vars */
"use server";

import prisma from "@/lib/db/prisma";
import * as faceapi from "face-api.js";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { unlink } from "fs/promises";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

async function getSessionBarangay(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    const user = session.user as any;
    if (user.role === "BARANGAY_ADMIN" && user.managedBarangay) {
        return user.managedBarangay;
    }
    return null;
}

async function deleteUploadedFile(imageUrl: string | null | undefined) {
    if (!imageUrl) return;

    // Supabase Deletion
    if (imageUrl.includes("supabase.co")) {
        await deleteFileByUrl(imageUrl);
        return;
    }

    // Local Deletion (Legacy)
    if (!imageUrl.startsWith("/uploads/")) return;

    try {
        const filepath = path.join(process.cwd(), "public", imageUrl);
        if (fs.existsSync(filepath)) {
            await unlink(filepath);
        }
    } catch (error) {
        console.error("Error deleting file:", error);
    }
}

async function processImageUpload(formData: FormData, fieldName: string = "imageFile"): Promise<string | null> {
    const fileItem = formData.get(fieldName);
    const fileItemAlt = formData.get(`${fieldName}File`);

    let file: File | null = null;
    let existingUrl: string | null = null;

    // Determine if we have a new file upload
    if (fileItem instanceof File && fileItem.size > 0) {
        file = fileItem;
    } else if (fileItemAlt instanceof File && fileItemAlt.size > 0) {
        file = fileItemAlt;
    }

    // Determine existing URL (if any)
    const urlValue = formData.get(`${fieldName}Url`) || formData.get(fieldName) || formData.get("imageUrl");
    if (typeof urlValue === "string" && urlValue.trim() !== "" && !urlValue.startsWith("[object")) {
        existingUrl = urlValue;
    }

    if (file && file.size > 0 && file.name !== "undefined") {
        try {
            // Determine folder based on fieldName or category
            let folder = formData.get("storageFolder")?.toString().toLowerCase() || "uploads";
            const category = formData.get("category")?.toString().toLowerCase() || "";
            const position = formData.get("position")?.toString().toLowerCase() || "";

            if (folder === "uploads") {
                if (fieldName.toLowerCase().includes("logo")) folder = "logos";
                else if (fieldName.toLowerCase().includes("hero") || fieldName.toLowerCase().includes("slide")) folder = "banners";
                else if (category.includes("official") || category.includes("council") || category.includes("lgu") || category.includes("sk") || position.includes("mayor") || position.includes("captain") || fieldName.toLowerCase().includes("official")) folder = "officials";
                else if (category.includes("news")) folder = "news";
                else if (category.includes("event")) folder = "events";
                else if (category.includes("tourism")) folder = "tourism";
                else if (category.includes("dining")) folder = "dining";
                else if (category.includes("accommodation")) folder = "accommodations";
                else if (category.includes("service")) folder = "services";
                else if (category.includes("report")) folder = "reports";
                else if (fieldName.toLowerCase().includes("liveness") || fieldName.toLowerCase().includes("idfront") || fieldName.toLowerCase().includes("idback")) folder = "residents";
            }

            const filename = `${Date.now()}_${(file.name || "upload").replaceAll(" ", "_")}`;
            const storagePath = `${folder}/${filename}`;

            const buffer = Buffer.from(await file.arrayBuffer());
            const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);

            if (!publicUrl) throw new Error("Upload failed");

            // Auto-delete old file if it exists and we have a new upload
            if (existingUrl) {
                await deleteUploadedFile(existingUrl);
            }

            return publicUrl;
        } catch (error) {
            console.error("Error processing image upload to Supabase:", error);
            return existingUrl;
        }
    }
    return existingUrl;
}

/**
 * Enhanced image processing for multiple files
 */
async function processMultipleImages(formData: FormData, fieldName: string = "images"): Promise<string[]> {
    const files = formData.getAll(fieldName);
    const uploadedPaths: string[] = [];

    for (const fileItem of files) {
        if (fileItem instanceof File && fileItem.size > 0 && fileItem.name !== "undefined") {
            try {
                const buffer = Buffer.from(await fileItem.arrayBuffer());
                const filename = `${Date.now()}_${(fileItem.name || "upload").replaceAll(" ", "_")}`;
                const storagePath = `reports/${filename}`;

                const publicUrl = await uploadFile(buffer, storagePath, undefined, fileItem.type);
                if (publicUrl) uploadedPaths.push(publicUrl);
            } catch (error) {
                console.error("Error processing file in multiple upload to Supabase:", error);
            }
        } else if (typeof fileItem === "string" && (fileItem.startsWith("http") || fileItem.startsWith("/uploads/"))) {
            // Keep existing paths (Supabase URLs or legacy local paths)
            uploadedPaths.push(fileItem);
        }
    }

    return uploadedPaths;
}

// ----------------------------------------
// SEARCH & DISCOVERY ACTIONS
// ----------------------------------------

export async function getResidentCategories() {
    try {
        let categories = await (prisma as any).residentCategory.findMany({
            orderBy: { name: "asc" }
        });

        if (categories.length === 0) {
            const defaults = ["Citizen", "Business Owner", "Guests"];
            for (const name of defaults) {
                await (prisma as any).residentCategory.create({
                    data: { name }
                }).catch(() => { });
            }
            categories = await (prisma as any).residentCategory.findMany({ orderBy: { name: "asc" } });
        }

        return { success: true, categories };
    } catch (error) {
        console.error("Failed to fetch resident categories:", error);
        return { success: false, error: "Failed to fetch categories" };
    }
}


export async function searchHeads(query: string, page: number = 1, limit: number = 10) {
    try {
        const managedBarangay = await getSessionBarangay();
        const where: any = {
            isHead: true
        };

        if (query && query.trim()) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
            ];
        }

        if (managedBarangay) {
            where.barangay = managedBarangay;
        }

        const residents = await (prisma as any).resident.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                barangay: true
            }
        });
        return { success: true, data: residents };
    } catch (error) {
        console.error("Search head error:", error);
        return { success: false, error: "Failed to search residents" };
    }
}

export async function searchResidents(query: string, page: number = 1, limit: number = 10) {
    try {
        const managedBarangay = await getSessionBarangay();
        const where: any = {};

        if (query && query.trim()) {
            where.OR = [
                { firstName: { contains: query, mode: 'insensitive' } },
                { lastName: { contains: query, mode: 'insensitive' } },
            ];
        }

        if (managedBarangay) {
            where.barangay = managedBarangay;
        }

        const residents = await (prisma as any).resident.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                barangay: true,
                age: true
            }
        });
        return { success: true, data: residents };
    } catch (error) {
        console.error("Search resident error:", error);
        return { success: false, error: "Failed to search residents" };
    }
}

export async function getResidentDataById(id: string) {
    try {
        const resident = await (prisma as any).resident.findUnique({
            where: { id }
        });
        return { success: true, data: resident };
    } catch (error) {
        console.error("Get resident data error:", error);
        return { success: false, error: "Failed to fetch resident data" };
    }
}

export async function getResidentFamilyContext(residentId: string) {
    try {
        const resident = await (prisma as any).resident.findUnique({
            where: { id: residentId },
            include: {
                household: {
                    include: {
                        head: true,
                        members: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                ownedHousehold: {
                    include: {
                        head: true,
                        members: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        if (!resident) return { success: false, error: "Resident not found" };

        const household = resident.ownedHousehold || resident.household;

        if (!household) {
            // If resident has no household links yet, just return their own address as fallback
            return {
                success: true,
                type: 'individual',
                address: {
                    barangay: resident.barangay,
                    street: resident.street,
                    houseNumber: resident.houseNumber,
                    sitio: resident.sitio,
                    purok: resident.purok,
                    contactNumber: resident.contactNumber
                }
            };
        }

        return {
            success: true,
            type: 'household',
            householdId: household.id,
            head: household.head ? {
                id: household.head.id,
                name: `${household.head.firstName} ${household.head.lastName}`
            } : null,
            address: {
                barangay: household.barangay || resident.barangay,
                street: resident.street || household.street,
                houseNumber: resident.houseNumber || household.houseNumber,
                sitio: resident.sitio || household.sitio,
                purok: resident.purok || household.purok,
                contactNumber: household.contactNumber || resident.contactNumber,
            },
            members: household.members
        };
    } catch (error) {
        console.error("Get resident context error:", error);
        return { success: false, error: "Failed to get family context" };
    }
}

export async function getHeadDetails(id: string) {
    try {
        const head = await (prisma as any).resident.findUnique({
            where: { id },
            include: {
                familyMembers: true
            }
        });

        if (!head) return { success: false, error: "Head not found" };

        return {
            success: true,
            data: {
                barangay: head.barangay,
                contactNumber: head.contactNumber,
                familyCount: 1 + (head.familyMembers?.length || 0)
            }
        };
    } catch (error) {
        console.error("Get head details error:", error);
        return { success: false, error: "Failed to fetch head details" };
    }
}

// ----------------------------------------
// DINING (KAINAN) ACTIONS
// ----------------------------------------

export async function addDining(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newDining = await prisma.dining.create({
            data: {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                cuisineType: formData.get("cuisineType") as string,
                openingHours: formData.get("openingHours") as string,
                contactNumber: formData.get("contactNumber") as string,
                facebookUrl: formData.get("facebookUrl") as string,
                imageUrl: imageUrl,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                isPublished: true,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/dining");
        return { success: true, dining: newDining };
    } catch (error) {
        console.error("Failed to add dining:", error);
        return { success: false, error: "Failed to create dining entry." };
    }
}

export async function deleteDining(id: string) {
    try {
        const item = await prisma.dining.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await prisma.dining.delete({
            where: { id }
        });
        revalidatePath("/admin/dining");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete dining:", error);
        return { success: false, error: "Failed to delete dining entry." };
    }
}

export async function updateDining(id: string, formData: FormData) {
    try {
        const oldItem = await prisma.dining.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const updatedDining = await prisma.dining.update({
            where: { id },
            data: {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                cuisineType: formData.get("cuisineType") as string,
                openingHours: formData.get("openingHours") as string,
                contactNumber: formData.get("contactNumber") as string,
                facebookUrl: formData.get("facebookUrl") as string,
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/dining");
        return { success: true, dining: updatedDining };
    } catch (error) {
        console.error("Failed to update dining:", error);
        return { success: false, error: "Failed to update dining entry." };
    }
}

export async function toggleDiningStatus(id: string, isPublished: boolean) {
    try {
        await prisma.dining.update({
            where: { id },
            data: { isPublished }
        });
        revalidatePath("/admin/dining");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update dining status." };
    }
}

// ----------------------------------------
// ACCOMMODATION (TULUYAN) ACTIONS
// ----------------------------------------

export async function addAccommodation(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newAccommodation = await prisma.accommodation.create({
            data: {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                type: formData.get("type") as string,
                priceRange: formData.get("priceRange") as string,
                amenities: formData.get("amenities") as string,
                contactNumber: formData.get("contactNumber") as string,
                websiteUrl: formData.get("websiteUrl") as string,
                imageUrl: imageUrl,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                isPublished: true,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/accommodation");
        return { success: true, accommodation: newAccommodation };
    } catch (error) {
        console.error("Failed to add accommodation:", error);
        return { success: false, error: "Failed to create accommodation entry." };
    }
}

export async function deleteAccommodation(id: string) {
    try {
        const item = await prisma.accommodation.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await prisma.accommodation.delete({
            where: { id }
        });
        revalidatePath("/admin/accommodation");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete accommodation:", error);
        return { success: false, error: "Failed to delete accommodation entry." };
    }
}

export async function updateAccommodation(id: string, formData: FormData) {
    try {
        const oldItem = await prisma.accommodation.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const updatedAccommodation = await prisma.accommodation.update({
            where: { id },
            data: {
                name: formData.get("name") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                type: formData.get("type") as string,
                priceRange: formData.get("priceRange") as string,
                amenities: formData.get("amenities") as string,
                contactNumber: formData.get("contactNumber") as string,
                websiteUrl: formData.get("websiteUrl") as string,
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/accommodation");
        return { success: true, accommodation: updatedAccommodation };
    } catch (error) {
        console.error("Failed to update accommodation:", error);
        return { success: false, error: "Failed to update accommodation entry." };
    }
}

export async function toggleAccommodationStatus(id: string, isPublished: boolean) {
    try {
        await prisma.accommodation.update({
            where: { id },
            data: { isPublished }
        });
        revalidatePath("/admin/accommodation");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update accommodation status." };
    }
}

// ----------------------------------------
// TOURISM SPOT (PLACE TO VISIT) ACTIONS
// ----------------------------------------

export async function addTourismSpot(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newSpot = await prisma.tourismSpot.create({
            data: {
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                entranceFee: formData.get("entranceFee") as string,
                bestTimeToVisit: formData.get("bestTimeToVisit") as string,
                contactNumber: formData.get("contactNumber") as string,
                imageUrl: imageUrl,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                isPublished: true,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/tourism");
        return { success: true, tourismSpot: newSpot };
    } catch (error) {
        console.error("Failed to add tourism spot:", error);
        return { success: false, error: "Failed to create tourism spot entry." };
    }
}

export async function deleteTourismSpot(id: string) {
    try {
        const item = await prisma.tourismSpot.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await prisma.tourismSpot.delete({
            where: { id }
        });
        revalidatePath("/admin/tourism");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete tourism spot:", error);
        return { success: false, error: "Failed to delete tourism spot entry." };
    }
}

export async function updateTourismSpot(id: string, formData: FormData) {
    try {
        const oldItem = await prisma.tourismSpot.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const updatedSpot = await prisma.tourismSpot.update({
            where: { id },
            data: {
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                description: formData.get("description") as string,
                address: formData.get("address") as string,
                entranceFee: formData.get("entranceFee") as string,
                bestTimeToVisit: formData.get("bestTimeToVisit") as string,
                contactNumber: formData.get("contactNumber") as string,
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                barangay: barangay || null,
            },
        });

        revalidatePath("/admin/tourism");
        return { success: true, tourismSpot: updatedSpot };
    } catch (error) {
        console.error("Failed to update tourism spot:", error);
        return { success: false, error: "Failed to update tourism spot entry." };
    }
}

export async function toggleTourismSpotStatus(id: string, isPublished: boolean) {
    try {
        await prisma.tourismSpot.update({
            where: { id },
            data: { isPublished }
        });
        revalidatePath("/admin/tourism");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update tourism spot status." };
    }
}

// ----------------------------------------
// EVENT ACTIONS
// ----------------------------------------

export async function addEvent(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);

        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newEvent = await (prisma as any).event.create({
            data: {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                category: formData.get("category") as string,
                startDate: new Date(formData.get("startDate") as string),
                endDate: new Date(formData.get("endDate") as string),
                venueName: formData.get("venueName") as string,
                address: formData.get("address") as string,
                contactNumber: formData.get("contactNumber") as string,
                imageUrl: imageUrl,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                reminders: (formData.get("reminders") as string)?.split("\n").map(r => r.trim()).filter(r => r !== "") || [],
                isPublished: true,
                barangay: barangay || null,
            } as any,
        });

        revalidatePath("/admin/events");
        return { success: true, event: newEvent };
    } catch (error) {
        console.error("Failed to add event:", error);
        return { success: false, error: "Failed to create event entry." };
    }
}

export async function updateEvent(id: string, formData: FormData) {
    try {
        const oldItem = await (prisma as any).event.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const updatedEvent = await (prisma as any).event.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                category: formData.get("category") as string,
                startDate: new Date(formData.get("startDate") as string),
                endDate: new Date(formData.get("endDate") as string),
                venueName: formData.get("venueName") as string,
                address: formData.get("address") as string,
                contactNumber: formData.get("contactNumber") as string,
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
                latitude: formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null,
                longitude: formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null,
                googleMapsUrl: formData.get("googleMapsUrl") as string,
                reminders: (formData.get("reminders") as string)?.split("\n").map(r => r.trim()).filter(r => r !== "") || [],
            } as any,
        });

        revalidatePath("/admin/events");
        return { success: true, event: updatedEvent };
    } catch (error) {
        console.error("Failed to update event:", error);
        return { success: false, error: "Failed to update event entry." };
    }
}

export async function deleteEvent(id: string) {
    try {
        const item = await prisma.event.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await prisma.event.delete({
            where: { id }
        });
        revalidatePath("/admin/events");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete event:", error);
        return { success: false, error: "Failed to delete event entry." };
    }
}

export async function toggleEventStatus(id: string, isPublished: boolean) {
    try {
        await (prisma as any).event.update({
            where: { id },
            data: { isPublished } as any
        });
        revalidatePath("/admin/events");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update event status." };
    }
}

// ----------------------------------------
// NEWS ACTIONS
// ----------------------------------------

export async function addNews(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newNews = await (prisma as any).news.create({
            data: {
                title: formData.get("title") as string,
                content: formData.get("content") as string,
                author: formData.get("author") as string | null,
                category: formData.get("category") as string,
                publishDate: new Date(formData.get("publishDate") as string || Date.now()),
                imageUrl: imageUrl,
                isPublished: true,
                barangay: barangay || null,
            } as any,
        });

        revalidatePath("/admin/news");
        return { success: true, news: newNews };
    } catch (error) {
        console.error("Failed to add news:", error);
        return { success: false, error: "Failed to create news entry." };
    }
}

export async function updateNews(id: string, formData: FormData) {
    try {
        const oldItem = await (prisma as any).news.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const updatedNews = await (prisma as any).news.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                content: formData.get("content") as string,
                author: formData.get("author") as string | null,
                category: formData.get("category") as string,
                publishDate: new Date(formData.get("publishDate") as string || Date.now()),
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
            } as any,
        });

        revalidatePath("/admin/news");
        return { success: true, news: updatedNews };
    } catch (error) {
        console.error("Failed to update news:", error);
        return { success: false, error: "Failed to update news entry." };
    }
}

export async function deleteNews(id: string) {
    try {
        const item = await prisma.news.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await prisma.news.delete({
            where: { id }
        });
        revalidatePath("/admin/news");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete news:", error);
        return { success: false, error: "Failed to delete news entry." };
    }
}

export async function toggleNewsStatus(id: string, isPublished: boolean) {
    try {
        await prisma.news.update({
            where: { id },
            data: { isPublished }
        });
        revalidatePath("/admin/news");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update news status." };
    }
}

// ----------------------------------------
// JOB POSTING ACTIONS
// ----------------------------------------

export async function addJob(formData: FormData) {
    try {
        const linksJson = formData.get("linksJson") as string;
        const links = linksJson ? JSON.parse(linksJson) : [];

        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newJob = await (prisma as any).job.create({
            data: {
                title: formData.get("title") as string,
                department: formData.get("department") as string,
                location: formData.get("location") as string || null,
                description: formData.get("description") as string,
                qualifications: formData.get("qualifications") as string,
                requirements: formData.get("requirements") as string,
                salary: formData.get("salary") as string | null,
                employmentType: formData.get("employmentType") as string,
                deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
                links: links,
                mapUrl: formData.get("mapUrl") as string || null,
                isActive: true,
                barangay: barangay || null,
            } as any,
        });

        revalidatePath("/");
        revalidatePath("/admin/jobs");
        return { success: true, job: newJob };
    } catch (error) {
        console.error("Failed to add job:", error);
        return { success: false, error: "Failed to create job entry." };
    }
}

export async function updateJob(id: string, formData: FormData) {
    try {
        const linksJson = formData.get("linksJson") as string;
        const links = linksJson ? JSON.parse(linksJson) : [];
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const updatedJob = await (prisma as any).job.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                department: formData.get("department") as string,
                location: formData.get("location") as string || null,
                description: formData.get("description") as string,
                qualifications: formData.get("qualifications") as string,
                requirements: formData.get("requirements") as string,
                salary: formData.get("salary") as string | null,
                employmentType: formData.get("employmentType") as string,
                deadline: formData.get("deadline") ? new Date(formData.get("deadline") as string) : null,
                links: links,
                mapUrl: formData.get("mapUrl") as string || null,
                barangay: barangay || null,
            } as any,
        });

        revalidatePath("/");
        revalidatePath("/admin/jobs");
        return { success: true, job: updatedJob };
    } catch (error) {
        console.error("Failed to update job:", error);
        return { success: false, error: "Failed to update job entry." };
    }
}

export async function deleteJob(id: string) {
    try {
        await prisma.job.delete({
            where: { id }
        });
        revalidatePath("/admin/jobs");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete job:", error);
        return { success: false, error: "Failed to delete job entry." };
    }
}

export async function toggleJobStatus(id: string, isActive: boolean) {
    try {
        await (prisma as any).job.update({
            where: { id },
            data: { isActive } as any
        });
        revalidatePath("/admin/jobs");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update job status." };
    }
}

// ----------------------------------------
// COUNCIL MEMBERS (OFFICIALS) ACTIONS
// ----------------------------------------

export async function addOfficial(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);
        const linksJson = formData.get("links") as string;
        const links = linksJson ? JSON.parse(linksJson) : [];

        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : 0;

        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newOfficial = await (prisma as any).official.create({
            data: {
                name: formData.get("name") as string,
                position: formData.get("position") as string,
                email: formData.get("email") as string | null,
                contactNumber: formData.get("contactNumber") as string | null,
                links: links,
                bio: formData.get("bio") as string | null,
                education: formData.get("education") as string | null,
                motto: formData.get("motto") as string | null,
                achievements: formData.get("achievements") as string | null,
                termStart: formData.get("termStart") ? new Date(formData.get("termStart") as string) : null,
                termEnd: formData.get("termEnd") ? new Date(formData.get("termEnd") as string) : null,
                order: isNaN(parsedOrder) ? 99 : parsedOrder,
                imageUrl: imageUrl,
                isActive: true,
                barangay: barangay || null,
                category: formData.get("category") as string || "LGU",
            } as any,
        });

        revalidatePath("/");
        revalidatePath("/admin/officials");
        return { success: true, official: newOfficial };
    } catch (error) {
        console.error("Failed to add official:", error);
        return { success: false, error: "Failed to create official entry." };
    }
}

export async function updateOfficial(id: string, formData: FormData) {
    try {
        const oldItem = await (prisma as any).official.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const linksJson = formData.get("links") as string;
        const links = linksJson ? JSON.parse(linksJson) : [];

        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : 0;

        const updatedOfficial = await (prisma as any).official.update({
            where: { id },
            data: {
                name: formData.get("name") as string,
                position: formData.get("position") as string,
                email: formData.get("email") as string | null,
                contactNumber: formData.get("contactNumber") as string | null,
                links: links,
                bio: formData.get("bio") as string | null,
                education: formData.get("education") as string | null,
                motto: formData.get("motto") as string | null,
                achievements: formData.get("achievements") as string | null,
                termStart: formData.get("termStart") ? new Date(formData.get("termStart") as string) : null,
                termEnd: formData.get("termEnd") ? new Date(formData.get("termEnd") as string) : null,
                order: isNaN(parsedOrder) ? 99 : parsedOrder,
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
                category: formData.get("category") as string || "LGU",
            } as any,
        });

        revalidatePath("/");
        revalidatePath("/admin/officials");
        return { success: true, official: updatedOfficial };
    } catch (error) {
        console.error("Failed to update official:", error);
        return { success: false, error: "Failed to update official entry." };
    }
}

export async function deleteOfficial(id: string) {
    try {
        const item = await (prisma as any).official.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await prisma.official.delete({ where: { id } });
        revalidatePath("/admin/officials");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete official:", error);
        return { success: false, error: "Failed to delete official entry." };
    }
}

export async function toggleOfficialStatus(id: string, isActive: boolean) {
    try {
        await prisma.official.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/officials");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update official status." };
    }
}

// ----------------------------------------
// HOTLINE DIRECTORY ACTIONS
// ----------------------------------------

export async function addHotline(formData: FormData) {
    try {
        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : 0;

        const newHotline = await (prisma as any).hotline.create({
            data: {
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                mobileNumber: formData.get("mobileNumber") as string | null,
                telephone: formData.get("telephone") as string | null,
                address: formData.get("address") as string | null,
                order: isNaN(parsedOrder) ? 0 : parsedOrder,
                isActive: true,
            } as any,
        });

        revalidatePath("/admin/hotlines");
        return { success: true, hotline: newHotline };
    } catch (error) {
        console.error("Failed to add hotline:", error);
        return { success: false, error: "Failed to create hotline entry." };
    }
}

export async function updateHotline(id: string, formData: FormData) {
    try {
        const orderValue = formData.get("order") as string;
        const parsedOrder = orderValue ? parseInt(orderValue, 10) : 0;

        const updatedHotline = await (prisma as any).hotline.update({
            where: { id },
            data: {
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                mobileNumber: formData.get("mobileNumber") as string | null,
                telephone: formData.get("telephone") as string | null,
                address: formData.get("address") as string | null,
                order: isNaN(parsedOrder) ? 0 : parsedOrder,
            } as any,
        });

        revalidatePath("/admin/hotlines");
        return { success: true, hotline: updatedHotline };
    } catch (error) {
        console.error("Failed to update hotline:", error);
        return { success: false, error: "Failed to update hotline entry." };
    }
}

export async function deleteHotline(id: string) {
    try {
        await prisma.hotline.delete({ where: { id } });
        revalidatePath("/admin/hotlines");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete hotline:", error);
        return { success: false, error: "Failed to delete hotline entry." };
    }
}

export async function toggleHotlineStatus(id: string, isActive: boolean) {
    try {
        await prisma.hotline.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/hotlines");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update hotline status." };
    }
}

// ----------------------------------------
// PROJECTS MODULE ACTIONS
// ----------------------------------------

export async function addProject(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);

        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const project = await (prisma as any).project.create({
            data: {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                category: formData.get("category") as string,
                status: formData.get("status") as string,
                location: formData.get("location") as string,
                budget: (formData.get("budget") as string) || null,
                contractor: (formData.get("contractor") as string) || null,
                startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
                endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
                progress: parseInt(formData.get("progress") as string || "0", 10),
                imageUrl: imageUrl,
                isPublished: true,
                barangay: barangay || null,
            } as any
        });

        revalidatePath("/admin/projects");
        return { success: true, project };
    } catch (error) {
        console.error("Failed to add project:", error);
        return { success: false, error: "Failed to create project entry." };
    }
}

export async function updateProject(id: string, formData: FormData) {
    try {
        const oldItem = await (prisma as any).project.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);

        if (imageUrl && oldItem?.imageUrl && oldItem.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldItem.imageUrl);
        }

        const project = await (prisma as any).project.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                category: formData.get("category") as string,
                status: formData.get("status") as string,
                location: formData.get("location") as string,
                budget: (formData.get("budget") as string) || null,
                contractor: (formData.get("contractor") as string) || null,
                startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : null,
                endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
                progress: parseInt(formData.get("progress") as string || "0", 10),
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || null,
            } as any
        });

        revalidatePath("/admin/projects");
        return { success: true, project };
    } catch (error) {
        console.error("Failed to update project:", error);
        return { success: false, error: "Failed to update project entry." };
    }
}

export async function deleteProject(id: string) {
    try {
        const item = await (prisma as any).project.findUnique({ where: { id } });
        if (item?.imageUrl) {
            await deleteUploadedFile(item.imageUrl);
        }
        await (prisma as any).project.delete({ where: { id } });
        revalidatePath("/admin/projects");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete project:", error);
        return { success: false, error: "Failed to delete project entry." };
    }
}

export async function toggleProjectStatus(id: string, isPublished: boolean) {
    try {
        await (prisma as any).project.update({ where: { id }, data: { isPublished } as any });
        revalidatePath("/admin/projects");
        return { success: true };
    } catch (error) {
        console.error("Failed to update status:", error);
        return { success: false, error: "Failed to update project publication status." };
    }
}

// ==========================================
// HOUSEHOLD ACTIONS
// ==========================================

export async function addHousehold(formData: FormData) {
    try {
        const headId = formData.get("headId") as string;
        const lat = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
        const lng = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;

        if (headId) {
            const existing = await (prisma as any).household.findUnique({
                where: { headId }
            });
            if (existing) {
                return {
                    success: false,
                    error: "This person is already a head of another household."
                };
            }
        }

        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const household = await (prisma as any).household.create({
            data: {
                headId: headId || null,
                barangay: barangay || null,
                latitude: lat,
                longitude: lng,
                householdSize: parseInt(formData.get("householdSize") as string || "1", 10),
                contactNumber: (formData.get("contactNumber") as string) || null,
            } as any,
            include: {
                head: true
            }
        });

        // Cascade coordinates to all associated residents (Head + Members)
        await (prisma as any).resident.updateMany({
            where: {
                OR: [
                    { id: headId || "none" },
                    { householdId: household.id }
                ]
            },
            data: { latitude: lat, longitude: lng }
        });

        revalidatePath("/admin/households");
        revalidatePath("/admin/residents");
        return { success: true, household };
    } catch (error) {
        console.error("Failed to add household:", error);
        return { success: false, error: "Failed to create household entry." };
    }
}

export async function updateHousehold(id: string, formData: FormData) {
    try {
        const headId = formData.get("headId") as string;

        if (headId) {
            const existing = await (prisma as any).household.findFirst({
                where: {
                    headId,
                    id: { not: id }
                }
            });
            if (existing) {
                return {
                    success: false,
                    error: "This person is already a head of another household."
                };
            }
        }

        const lat = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
        const lng = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;

        const household = await (prisma as any).household.update({
            where: { id },
            data: {
                headId: headId || null,
                barangay: (formData.get("barangay") as string) || (await getSessionBarangay()),
                latitude: lat,
                longitude: lng,
                householdSize: parseInt(formData.get("householdSize") as string || "1", 10),
                contactNumber: (formData.get("contactNumber") as string) || null,
                riskLevel: (formData.get("riskLevel") as string) || "Safe",
                notes: (formData.get("notes") as string) || null,
            } as any,
            include: {
                head: true
            }
        });

        // Cascade coordinates to all associated residents
        await (prisma as any).resident.updateMany({
            where: {
                OR: [
                    { id: headId || "none" },
                    { householdId: household.id }
                ]
            },
            data: { latitude: lat, longitude: lng }
        });

        revalidatePath("/admin/households");
        revalidatePath("/admin/residents");
        return { success: true, household };
    } catch (error) {
        console.error("Failed to update household:", error);
        return { success: false, error: "Failed to update household entry." };
    }
}

export async function deleteHousehold(id: string) {
    try {
        await prisma.household.delete({ where: { id } });
        revalidatePath("/admin/households");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete household:", error);
        return { success: false, error: "Failed to delete household entry." };
    }
}

// ==========================================
// RESIDENT REGISTRATION ACTIONS
// ==========================================

export async function addResident(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        const activeUserName = session?.user?.name || "System Admin";
        const activeUserRole = (session?.user as any)?.role || "ADMIN";

        const livenessUrl = await processImageUpload(formData, "livenessUrl");
        const idFrontUrl = await processImageUpload(formData, "idFrontUrl");
        const idBackUrl = await processImageUpload(formData, "idBackUrl");

        const familyMembersData = formData.get("familyMembers") as string;
        const familyMembers = familyMembersData ? JSON.parse(familyMembersData) : [];

        const isHead = formData.get("isHead") === "true" || formData.get("isHead") === "on";
        const headIdFromForm = formData.get("headId") as string || null;
        let householdId = (formData.get("householdId") as string) || null;

        // If not head and selected a head, get their householdId
        if (!isHead && headIdFromForm) {
            const head = await (prisma.resident as any).findUnique({
                where: { id: headIdFromForm },
                select: { householdId: true }
            });
            if (head && head.householdId) {
                householdId = head.householdId;
            }
        }

        // If this is a head registration and no householdId provided, create a new household
        if (isHead && !householdId) {
            try {
                const newHousehold = await (prisma as any).household.create({
                    data: {
                        barangay: formData.get("barangay") as string,
                        householdSize: 1, // Start with head
                        contactNumber: formData.get("contactNumber") as string || null,
                        notes: "Automatically created during head registration"
                    } as any
                });
                householdId = newHousehold.id;
            } catch (err) {
                console.error("Failed to create automatic household:", err);
            }
        }

        const linkedMembers = familyMembers.filter((fm: any) => !!fm.id);
        const manualMembers = familyMembers.filter((fm: any) => !fm.id);

        const emails = formData.getAll("email") as string[];
        const emailRaw = emails.find(e => e.trim() !== "") || null;
        const email = emailRaw ? emailRaw.trim().toLowerCase() : null;
        const password = formData.get("password") as string | null;
        let createdUserId: string | null = null;

        if (email) {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return { success: false, error: "This email is already registered to another resident." };
            }

            const name = `${formData.get("firstName")} ${formData.get("lastName")}`;
            // Use provided password or default to email
            const rawPassword = password || email;
            const hashedPassword = await bcrypt.hash(rawPassword, 10);

            console.log(`[AccountSync] Creating user account for ${email}...`);
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role: "USER",
                    emailVerified: new Date(),
                    isEmailVerified: true,
                    isPasswordChanged: false // Residents added by admin must change password on first login
                } as any
            });
            createdUserId = user.id;
        }

        const categoryIds = formData.getAll("categories") as string[];

        // FIX 3: REGISTRATION DUPLICATE GUARD
        // const faceDataRaw = formData.get("facialRecognition");
        // if (faceDataRaw) {
        //     const faceData = JSON.parse(faceDataRaw as string);
        //     const descriptorToSave = faceData.descriptor || (Array.isArray(faceData) ? faceData : null);
        //     
        //     if (descriptorToSave) {
        //          const duplicateCheck = await checkDuplicateFace(descriptorToSave);
        //          if (duplicateCheck.success && duplicateCheck.match) {
        //              return { 
        //                  success: false, 
        //                  error: `DUPLICATE FACE DETECTED: This identity matches ${duplicateCheck.match.name}.` 
        //              };
        //          }
        //     }
        // }

        const resident = await (prisma as any).resident.create({
            data: {
                firstName: formData.get("firstName") as string,
                lastName: formData.get("lastName") as string,
                middleName: formData.get("middleName") as string || null,
                suffix: formData.get("suffix") as string || null,
                gender: formData.get("gender") as string,
                dateOfBirth: new Date(formData.get("dateOfBirth") as string),
                age: formData.get("age") ? parseInt(formData.get("age") as string, 10) : null,
                placeOfBirth: formData.get("placeOfBirth") as string || null,
                civilStatus: formData.get("civilStatus") as string,
                citizenship: formData.get("citizenship") as string || "Filipino",
                height: formData.get("height") as string || null,
                weight: formData.get("weight") as string || null,
                religion: formData.get("religion") as string || null,
                bloodType: formData.get("bloodType") as string || null,
                houseNumber: formData.get("houseNumber") as string || null,
                street: formData.get("street") as string || null,
                sitio: formData.get("sitio") as string || null,
                purok: formData.get("purok") as string || null,
                municipality: formData.get("municipality") as string || "Mapandan",
                province: formData.get("province") as string || "Pangasinan",
                contactNumber: formData.get("contactNumber") as string || null,
                isHead: isHead,
                relationshipToHead: formData.get("relationshipToHead") as string || null,
                householdId: householdId,
                familyHeadId: headIdFromForm,
                tin: formData.get("tin") as string || null,
                gsis: formData.get("gsis") as string || null,
                sss: formData.get("sss") as string || null,
                philhealthNumber: formData.get("philhealthNumber") as string || null,
                occupation: formData.get("occupation") as string || null,
                employer: formData.get("employer") as string || null,
                motherFirstName: formData.get("motherFirstName") as string || null,
                motherMiddleName: formData.get("motherMiddleName") as string || null,
                motherLastName: formData.get("motherLastName") as string || null,
                fatherFirstName: formData.get("fatherFirstName") as string || null,
                fatherMiddleName: formData.get("fatherMiddleName") as string || null,
                fatherLastName: formData.get("fatherLastName") as string || null,
                idType: formData.get("idType") as string || null,
                idFrontUrl,
                idBackUrl,
                educationalAttainment: formData.get("educationalAttainment") as string || null,
                degreeProgram: formData.get("degreeProgram") as string || null,
                employmentStatus: formData.get("employmentStatus") as string || null,
                monthlyIncome: formData.get("monthlyIncome") as string || null,
                isSenior: formData.get("isSenior") === "true" || formData.get("isSenior") === "on",
                isPWD: formData.get("isPWD") === "true" || formData.get("isPWD") === "on",
                isSoloParent: formData.get("isSoloParent") === "true" || formData.get("isSoloParent") === "on",
                isIndigenous: formData.get("isIndigenous") === "true" || formData.get("isIndigenous") === "on",
                is4Ps: formData.get("is4Ps") === "true" || formData.get("is4Ps") === "on",
                otherSector: formData.get("otherSector") as string || null,
                dataPrivacyConsent: true,
                consentTimestamp: new Date(),
                receivedBy: activeUserName,
                officialPosition: activeUserRole,
                dateReceived: new Date(),
                livenessUrl,
                registrationStatus: "APPROVED",
                registrationType: "HEAD",
                isDead: false,
                rfid: null,
                facialRecognition: formData.get("facialRecognition")
                    ? JSON.parse(formData.get("facialRecognition") as string)
                    : null,
                userId: createdUserId,
                email: email,
                categoryId: categoryIds.length > 0 ? categoryIds[0] : null,
                barangay: formData.get("barangay") as string || await getSessionBarangay() || null,
            } as any
        });

        // Post-creation steps
        if (householdId) {
            // 1. If this person is the head, update the household's headId
            if (isHead) {
                await (prisma as any).household.update({
                    where: { id: householdId },
                    data: { headId: resident.id } as any
                });
            }

            // 2. Link existing residents who were added as family members
            if (linkedMembers.length > 0) {
                for (const member of linkedMembers) {
                    // Only link if they don't have a household yet
                    const target = await (prisma.resident as any).findUnique({
                        where: { id: member.id },
                        select: { householdId: true }
                    });

                    if (target) {
                        await (prisma as any).resident.update({
                            where: { id: member.id },
                            data: {
                                householdId: householdId,
                                familyHeadId: resident.id,
                                relationshipToHead: member.relationship || "Member"
                            } as any
                        });
                    }
                }
            }

            // 3. Update final household size
            const totalSize = 1 + familyMembers.length; // 1 (new resident) + family members
            await (prisma as any).household.update({
                where: { id: householdId },
                data: { householdSize: totalSize } as any
            });
        }

        // Fetch full resident data with relations for the frontend
        const finalResidentAdd = await (prisma.resident as any).findUnique({
            where: { id: resident.id },
            include: {
                category: true,
                household: {
                    include: {
                        members: true,
                        head: true
                    }
                }
            }
        });

        const mappedAdd = finalResidentAdd ? {
            ...finalResidentAdd,
            headId: finalResidentAdd.household?.headId || null,
            headName: finalResidentAdd.household?.head ? `${finalResidentAdd.household.head.firstName} ${finalResidentAdd.household.head.lastName}` : null
        } : resident;

        revalidatePath("/admin/residents");
        revalidatePath("/admin/households");
        return { success: true, data: mappedAdd };
    } catch (error) {
        console.error("Error adding resident:", error);
        return { success: false, error: "Failed to add resident" };
    }
}

export async function updateResident(id: string, formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        const activeUserName = session?.user?.name || "System Admin";
        const activeUserRole = (session?.user as any)?.role || "ADMIN";

        const livenessUrl = await processImageUpload(formData, "livenessUrl");
        const idFrontUrl = await processImageUpload(formData, "idFrontUrl");
        const idBackUrl = await processImageUpload(formData, "idBackUrl");

        const emails = formData.getAll("email") as string[];
        const emailRaw = emails.find(e => e.trim() !== "") || null;
        const email = emailRaw ? emailRaw.trim().toLowerCase() : null;
        const password = formData.get("password") as string | null;

        const currentResident = await (prisma.resident as any).findUnique({
            where: { id },
            select: { userId: true }
        });

        const categoryIds = formData.getAll("categories") as string[];

        // FIX 3: REGISTRATION DUPLICATE GUARD (UPDATE)
        // const faceDataRaw = formData.get("facialRecognition");
        // if (faceDataRaw) {
        //     const faceData = JSON.parse(faceDataRaw as string);
        //     const descriptorToSave = faceData.descriptor || (Array.isArray(faceData) ? faceData : null);
        //     
        //     if (descriptorToSave) {
        //          const duplicateCheck = await checkDuplicateFace(descriptorToSave, id);
        //          if (duplicateCheck.success && duplicateCheck.match) {
        //              return { 
        //                  success: false, 
        //                  error: `DUPLICATE FACE DETECTED: This identity matches ${duplicateCheck.match.name}. Update blocked.` 
        //              };
        //          }
        //     }
        // }

        const dataToUpdate: any = {
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            middleName: formData.get("middleName") as string || null,
            suffix: formData.get("suffix") as string || null,
            gender: formData.get("gender") as string,
            dateOfBirth: new Date(formData.get("dateOfBirth") as string),
            age: formData.get("age") ? parseInt(formData.get("age") as string, 10) : null,
            placeOfBirth: formData.get("placeOfBirth") as string || null,
            civilStatus: formData.get("civilStatus") as string,
            citizenship: formData.get("citizenship") as string || "Filipino",
            height: formData.get("height") as string || null,
            weight: formData.get("weight") as string || null,
            religion: formData.get("religion") as string || null,
            bloodType: formData.get("bloodType") as string || null,
            houseNumber: formData.get("houseNumber") as string || null,
            street: formData.get("street") as string || null,
            sitio: formData.get("sitio") as string || null,
            purok: formData.get("purok") as string || null,
            barangay: formData.get("barangay") as string,
            contactNumber: formData.get("contactNumber") as string || null,
            isHead: formData.get("isHead") === "true" || formData.get("isHead") === "on",
            relationshipToHead: formData.get("relationshipToHead") as string || null,
            householdId: formData.get("householdId") as string || null,
            familyHeadId: formData.get("headId") as string || null,
            tin: formData.get("tin") as string || null,
            gsis: formData.get("gsis") as string || null,
            sss: formData.get("sss") as string || null,
            philhealthNumber: formData.get("philhealthNumber") as string || null,
            occupation: formData.get("occupation") as string || null,
            employer: formData.get("employer") as string || null,
            motherFirstName: formData.get("motherFirstName") as string || null,
            motherMiddleName: formData.get("motherMiddleName") as string || null,
            motherLastName: formData.get("motherLastName") as string || null,
            fatherFirstName: formData.get("fatherFirstName") as string || null,
            fatherMiddleName: formData.get("fatherMiddleName") as string || null,
            fatherLastName: formData.get("fatherLastName") as string || null,
            idType: formData.get("idType") as string || null,
            educationalAttainment: formData.get("educationalAttainment") as string || null,
            degreeProgram: formData.get("degreeProgram") as string || null,
            employmentStatus: formData.get("employmentStatus") as string || null,
            monthlyIncome: formData.get("monthlyIncome") as string || null,
            isSenior: formData.get("isSenior") === "true" || formData.get("isSenior") === "on",
            isPWD: formData.get("isPWD") === "true" || formData.get("isPWD") === "on",
            isSoloParent: formData.get("isSoloParent") === "true" || formData.get("isSoloParent") === "on",
            isIndigenous: formData.get("isIndigenous") === "true" || formData.get("isIndigenous") === "on",
            is4Ps: formData.get("is4Ps") === "true" || formData.get("is4Ps") === "on",
            otherSector: formData.get("otherSector") as string || null,
            dataPrivacyConsent: true,
            receivedBy: activeUserName,
            officialPosition: activeUserRole,
            dateReceived: new Date(),
            facialRecognition: formData.get("facialRecognition")
                ? JSON.parse(formData.get("facialRecognition") as string)
                : undefined,
            registrationStatus: "APPROVED",
            categoryId: categoryIds.length > 0 ? categoryIds[0] : null
        };

        if (email) {
            const name = `${formData.get("firstName")} ${formData.get("lastName")}`;

            if (currentResident?.userId) {
                // Check if email taken by ANOTHER person
                const existingUser = await prisma.user.findFirst({
                    where: { email, NOT: { id: currentResident.userId } }
                });
                if (existingUser) return { success: false, error: "Email already taken by another user." };

                const userUpdateData: any = { email, name };
                if (password) {
                    userUpdateData.password = await bcrypt.hash(password, 10);
                    userUpdateData.isPasswordChanged = true; // Admin manually set a password
                }

                if (dataToUpdate.registrationStatus === "APPROVED") {
                    userUpdateData.emailVerified = new Date();
                    userUpdateData.isEmailVerified = true;
                } else if (dataToUpdate.registrationStatus === "PENDING" || dataToUpdate.registrationStatus === "REJECTED") {
                    userUpdateData.emailVerified = null;
                    userUpdateData.isEmailVerified = false;
                }

                console.log(`[AccountSync] Updating account for ${email}...`);
                await prisma.user.update({
                    where: { id: currentResident.userId },
                    data: userUpdateData
                });
            } else {
                // Resident has no User record yet, create one
                const existingUser = await prisma.user.findUnique({ where: { email } });
                if (existingUser) return { success: false, error: "Email already taken." };

                const rawPassword = password || email;
                const hashedPassword = await bcrypt.hash(rawPassword, 10);

                console.log(`[AccountSync] Creating new account for ${email}...`);
                const user = await prisma.user.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name,
                        role: "USER",
                        emailVerified: dataToUpdate.registrationStatus === "APPROVED" ? new Date() : null,
                        isEmailVerified: dataToUpdate.registrationStatus === "APPROVED",
                        isPasswordChanged: password ? true : false
                    } as any
                });
                dataToUpdate.userId = user.id;
            }
            dataToUpdate.email = email;
        }

        const oldResident = await (prisma as any).resident.findUnique({ where: { id } });

        if (livenessUrl && oldResident?.livenessUrl && oldResident.livenessUrl !== livenessUrl) {
            await deleteUploadedFile(oldResident.livenessUrl);
        }
        if (idFrontUrl && oldResident?.idFrontUrl && oldResident.idFrontUrl !== idFrontUrl) {
            await deleteUploadedFile(oldResident.idFrontUrl);
        }
        if (idBackUrl && oldResident?.idBackUrl && oldResident.idBackUrl !== idBackUrl) {
            await deleteUploadedFile(oldResident.idBackUrl);
        }

        if (livenessUrl) dataToUpdate.livenessUrl = livenessUrl;
        else dataToUpdate.livenessUrl = (formData.get("livenessUrl") as string) || null;

        if (idFrontUrl) dataToUpdate.idFrontUrl = idFrontUrl;
        else dataToUpdate.idFrontUrl = (formData.get("idFrontUrl") as string) || null;

        if (idBackUrl) dataToUpdate.idBackUrl = idBackUrl;
        else dataToUpdate.idBackUrl = (formData.get("idBackUrl") as string) || null;

        const isHead = formData.get("isHead") === "true" || formData.get("isHead") === "on";
        const headIdFromForm = formData.get("headId") as string || null;
        let householdId = (formData.get("householdId") as string) || (dataToUpdate.householdId as string) || null;

        // NEW: If transitioning from member to head, force new household creation
        if (isHead && householdId) {
            const currentH = await (prisma.household as any).findUnique({
                where: { id: householdId },
                select: { headId: true }
            });
            if (currentH && currentH.headId !== id) {
                // Was member of another household, needs their own now
                householdId = null;
            }
        }

        // If not head and selected a head, get their householdId
        if (!isHead && headIdFromForm) {
            const head = await (prisma.resident as any).findUnique({
                where: { id: headIdFromForm },
                select: { householdId: true }
            });
            if (head && head.householdId) {
                householdId = head.householdId;
                dataToUpdate.householdId = householdId;
            }
        }

        // If newly marked as head and no householdId, create one
        if (isHead && !householdId) {
            // Check if they are already a head of any household to avoid unique constraint error
            const existingAsHead = await (prisma as any).household.findUnique({
                where: { headId: id }
            });

            if (existingAsHead) {
                householdId = existingAsHead.id;
                dataToUpdate.householdId = householdId;
            } else {
                try {
                    const newHousehold = await (prisma as any).household.create({
                        data: {
                            barangay: formData.get("barangay") as string,
                            householdSize: 1,
                            headId: id,
                            contactNumber: formData.get("contactNumber") as string || null,
                        } as any
                    });
                    householdId = newHousehold.id;
                    dataToUpdate.householdId = householdId;
                } catch (err) {
                    console.error("Automatic household creation failed during update:", err);
                }
            }
        }

        const resident = await (prisma as any).resident.update({
            where: { id },
            data: dataToUpdate as any
        });

        // Handle Family Members (manual and linked)
        const familyMembersData = formData.get("familyMembers") as string;
        if (familyMembersData) {
            const familyMembersParsed = JSON.parse(familyMembersData);
            const manualMembers = familyMembersParsed.filter((fm: any) => !fm.id);
            const linkedMembers = familyMembersParsed.filter((fm: any) => !!fm.id);

            // 1. Refresh manual family members

            // 2. Link existing registered residents & Unlink removed ones
            if (householdId) {
                // Link current list
                for (const member of linkedMembers) {
                    const target = await (prisma.resident as any).findUnique({
                        where: { id: member.id },
                        select: { householdId: true }
                    });

                    if (target) {
                        await (prisma as any).resident.update({
                            where: { id: member.id },
                            data: {
                                householdId: householdId,
                                relationshipToHead: member.relationship || "Member"
                            } as any
                        });
                    }
                }

                // If specialized head update, handle unlinking
                if (isHead) {
                    const currentMembers = await (prisma.resident as any).findMany({
                        where: {
                            householdId: householdId,
                            id: { not: id }
                        },
                        select: { id: true }
                    });

                    const newMemberIds = linkedMembers.map((m: any) => m.id);
                    const membersToUnlink = currentMembers.filter((m: any) => !newMemberIds.includes(m.id));

                    for (const member of membersToUnlink) {
                        await (prisma as any).resident.update({
                            where: { id: member.id },
                            data: { householdId: null, relationshipToHead: null } as any
                        });
                    }
                }
            }

            // 3. Update household size
            if (householdId) {
                const totalSize = 1 + familyMembersParsed.length;
                await (prisma as any).household.update({
                    where: { id: householdId },
                    data: { householdSize: totalSize } as any
                });
            }
        }

        // Fetch full resident data with relations for the frontend
        const finalResidentUpdate = await (prisma.resident as any).findUnique({
            where: { id: resident.id },
            include: {
                category: true,
                household: {
                    include: {
                        members: true,
                        head: true
                    }
                }
            }
        });

        const mappedUpdate = finalResidentUpdate ? {
            ...finalResidentUpdate,
            headId: finalResidentUpdate.household?.headId || null,
            headName: finalResidentUpdate.household?.head ? `${finalResidentUpdate.household.head.firstName} ${finalResidentUpdate.household.head.lastName}` : null
        } : resident;

        revalidatePath("/admin/residents");
        revalidatePath("/admin/households");
        return { success: true, data: mappedUpdate };
    } catch (error) {
        console.error("Error updating resident:", error);
        return { success: false, error: "Failed to update resident" };
    }
}

export async function deleteResident(id: string) {
    try {
        const resident = await (prisma as any).resident.findUnique({
            where: { id },
            select: {
                userId: true,
                householdId: true,
                imageUrl: true,
                livenessUrl: true,
                idFrontUrl: true,
                idBackUrl: true
            }
        });

        // Delete files
        if (resident?.imageUrl) await deleteUploadedFile(resident.imageUrl);
        if (resident?.livenessUrl) await deleteUploadedFile(resident.livenessUrl);
        if (resident?.idFrontUrl) await deleteUploadedFile(resident.idFrontUrl);
        if (resident?.idBackUrl) await deleteUploadedFile(resident.idBackUrl);

        // 1. Delete associated user if exists (important for cleanup)
        if (resident?.userId) {
            await prisma.user.delete({ where: { id: resident.userId } }).catch(err => {
                console.warn("Could not delete associated user:", err);
            });
        }

        // 2. Delete the resident
        await (prisma as any).resident.delete({ where: { id } });

        // 3. Update household size
        if (resident?.householdId) {
            await (prisma as any).household.update({
                where: { id: resident.householdId },
                data: { householdSize: { decrement: 1 } }
            });
        }

        revalidatePath("/admin/residents");
        revalidatePath("/admin/households");
        return { success: true };
    } catch (error) {
        console.error("Error deleting resident:", error);
        return { success: false, error: "Failed to delete resident" };
    }
}

export async function toggleResidentDeathStatus(id: string, isDead: boolean) {
    try {
        await (prisma as any).resident.update({
            where: { id },
            data: { isDead }
        });
        revalidatePath("/admin/residents");
        return { success: true };
    } catch (error) {
        console.error("Error toggling death status:", error);
        return { success: false, error: "Failed to update status" };
    }
}

export async function updateResidentRFID(id: string, rfid: string) {
    try {
        // Check if RFID already exists for another resident
        const existing = await (prisma as any).resident.findUnique({
            where: { rfid }
        });

        if (existing && existing.id !== id) {
            return { success: false, error: "RFID already assigned to another resident." };
        }

        await (prisma as any).resident.update({
            where: { id },
            data: { rfid: rfid.trim() }
        });
        revalidatePath("/admin/residents");
        return { success: true };
    } catch (error) {
        console.error("Error updating RFID:", error);
        return { success: false, error: "Failed to update RFID" };
    }
}

// ----------------------------------------
// HAZARD & DISASTER ACTIONS
// ----------------------------------------

export async function getDisasterZones() {
    try {
        const zones = await (prisma as any).disasterZone.findMany({ orderBy: { createdAt: "desc" } });
        return {
            success: true,
            zones: zones.map((z: any) => ({
                ...z,
                shapes: typeof z.shapes === 'string' ? JSON.parse(z.shapes) : (z.shapes || [])
            }))
        };
    } catch (error) {
        console.error("Failed to fetch disaster zones:", error);
        return { success: false, error: "Failed to fetch zones." };
    }
}

export async function addDisasterZone(data: any) {
    try {
        const zone = await (prisma as any).disasterZone.create({
            data: { ...data, shapes: data.shapes }
        });
        revalidatePath("/admin/disasters");
        return { success: true, zone };
    } catch (error) {
        return { success: false, error: "Failed to create zone." };
    }
}

export async function updateDisasterZone(id: string, data: any) {
    try {
        const zone = await (prisma as any).disasterZone.update({
            where: { id },
            data
        });
        revalidatePath("/admin/disasters");
        return { success: true, zone };
    } catch (error) {
        return { success: false, error: "Failed to update zone." };
    }
}

export async function deleteDisasterZone(id: string) {
    try {
        await (prisma as any).disasterZone.delete({ where: { id } });
        revalidatePath("/admin/disasters");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete zone." };
    }
}

export async function addDisasterMap(formData: FormData) {
    try {
        const imageUrl = await processImageUpload(formData);
        const newMap = await (prisma as any).disasterMap.create({
            data: {
                title: formData.get("title") as string,
                location: formData.get("location") as string || null,
                description: formData.get("description") as string || null,
                imagePath: imageUrl,
                riskLevel: formData.get("riskLevel") as string || null,
                isPublished: true,
            } as any,
        });
        revalidatePath("/admin/disasters");
        return { success: true, disasterMap: newMap };
    } catch (error) {
        return { success: false, error: "Failed to create map." };
    }
}

export async function updateDisasterMap(id: string, formData: FormData) {
    try {
        const oldItem = await (prisma as any).disasterMap.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData);

        if (imageUrl && oldItem?.imagePath && oldItem.imagePath !== imageUrl) {
            await deleteUploadedFile(oldItem.imagePath);
        }

        const updatedMap = await (prisma as any).disasterMap.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                location: formData.get("location") as string || null,
                description: formData.get("description") as string || null,
                imagePath: imageUrl || (formData.get("imagePath") as string) || undefined,
                riskLevel: formData.get("riskLevel") as string || null,
            } as any,
        });
        revalidatePath("/admin/disasters");
        return { success: true, disasterMap: updatedMap };
    } catch (error) {
        return { success: false, error: "Failed to update map." };
    }
}

export async function deleteDisasterMap(id: string) {
    try {
        const item = await (prisma as any).disasterMap.findUnique({ where: { id } });
        if (item?.imagePath) {
            await deleteUploadedFile(item.imagePath);
        }
        await (prisma as any).disasterMap.delete({ where: { id } });
        revalidatePath("/admin/disasters");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete map." };
    }
}

export async function toggleDisasterMapStatus(id: string, isPublished: boolean) {
    try {
        await (prisma as any).disasterMap.update({ where: { id }, data: { isPublished } });
        revalidatePath("/admin/disasters");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update status." };
    }
}

// -----------------------------------------------------------------------------
// ANNOUNCEMENTS
// -----------------------------------------------------------------------------

export async function addAnnouncement(formData: FormData) {
    try {
        const expiryDate = formData.get("expiryDate") as string;
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const newAnnouncement = await (prisma as any).announcement.create({
            data: {
                title: formData.get("title") as string,
                content: formData.get("content") as string,
                category: formData.get("category") as string,
                priority: formData.get("priority") as string,
                isPinned: formData.get("isPinned") === "on",
                isActive: formData.get("isActive") === "on",
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                barangay: barangay || null,
            } as any,
        });
        revalidatePath("/admin/announcements");
        revalidatePath("/");
        return { success: true, announcement: newAnnouncement };
    } catch (error) {
        return { success: false, error: "Failed to create announcement." };
    }
}

export async function updateAnnouncement(id: string, formData: FormData) {
    try {
        const expiryDate = formData.get("expiryDate") as string;
        const barangay = formData.get("barangay") as string || await getSessionBarangay();

        const updated = await (prisma as any).announcement.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                content: formData.get("content") as string,
                category: formData.get("category") as string,
                priority: formData.get("priority") as string,
                isPinned: formData.get("isPinned") === "on",
                isActive: formData.get("isActive") === "on",
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                barangay: barangay || null,
            } as any,
        });
        revalidatePath("/admin/announcements");
        revalidatePath("/");
        return { success: true, announcement: updated };
    } catch (error) {
        return { success: false, error: "Failed to update announcement." };
    }
}

export async function deleteAnnouncement(id: string) {
    try {
        await (prisma as any).announcement.delete({ where: { id } });
        revalidatePath("/admin/announcements");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete announcement." };
    }
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean) {
    try {
        await (prisma as any).announcement.update({ where: { id }, data: { isActive } });
        revalidatePath("/admin/announcements");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update status." };
    }
}

export async function toggleAnnouncementPin(id: string, isPinned: boolean) {
    try {
        await (prisma as any).announcement.update({ where: { id }, data: { isPinned } });
        revalidatePath("/admin/announcements");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update pin status." };
    }
}

// -----------------------------------------------------------------------------
// COMMUNITY REPORTING ACTIONS
// -----------------------------------------------------------------------------

export async function addCommunityReport(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);

        // DEBUG: Check who is actually submitting
        console.log("[Reporting] Submission Debug:", {
            sessionId: (session?.user as any)?.id,
            sessionName: session?.user?.name,
            sessionEmail: session?.user?.email,
            sessionRole: (session?.user as any)?.role
        });

        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized. Please sign in to report an issue." };
        }

        const images = await processMultipleImages(formData, "images");

        const latRaw = formData.get("latitude");
        const lngRaw = formData.get("longitude");

        const report = await (prisma as any).report.create({
            data: {
                userId: (session.user as any).id,
                category: formData.get("category") as string,
                description: formData.get("description") as string,
                images: images,
                latitude: latRaw ? parseFloat(latRaw as string) : null,
                longitude: lngRaw ? parseFloat(lngRaw as string) : null,
                address: formData.get("address") as string || null,
                status: "PENDING",
            } as any
        });

        revalidatePath("/");
        revalidatePath("/user/reports");
        revalidatePath("/admin/reports");
        return { success: true, report };
    } catch (error) {
        console.error("Failed to submit report:", error);
        return { success: false, error: "Failed to submit report. Please try again." };
    }
}

export async function getBarangayList() {
    try {
        const barangays = await prisma.barangayInfo.findMany({
            select: { name: true },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: barangays.map(b => b.name) };
    } catch (error) {
        console.error("Failed to fetch barangays:", error);
        return { success: false, error: "Failed to fetch barangay list" };
    }
}

export async function getUserReports() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const reports = await (prisma as any).report.findMany({
            where: { userId: (session.user as any).id },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, reports };
    } catch (error) {
        return { success: false, error: "Failed to fetch your reports." };
    }
}

export async function getAdminReports() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
            return { success: false, error: "Unauthorized" };
        }

        const reports = await (prisma as any).report.findMany({
            include: { user: true },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, reports };
    } catch (error) {
        return { success: false, error: "Failed to fetch reports." };
    }
}

export async function updateReportStatus(id: string, status: string, adminComment?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || (session.user as any).role !== "ADMIN") {
            return { success: false, error: "Unauthorized" };
        }

        await (prisma as any).report.update({
            where: { id },
            data: {
                status: status as any,
                adminComment: adminComment || undefined
            } as any
        });

        revalidatePath("/user/reports");
        revalidatePath("/admin/reports");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update report status." };
    }
}

export async function getReportById(id: string) {
    try {
        console.log(`[Reporting] Fetching report details for ID: ${id}`);
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            console.error("[Reporting] Unauthorized access attempt - No session ID found");
            return { success: false, error: "Unauthorized" };
        }

        const report = await (prisma as any).report.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!report) {
            console.error(`[Reporting] Report not found: ${id}`);
            return { success: false, error: "Report not found" };
        }

        // Ensure user can only see their own report unless admin
        const userId = (session.user as any).id;
        if ((session.user as any).role !== "ADMIN" && report.userId !== userId) {
            console.error(`[Reporting] Permission denied for User ${userId} on Report ${id}`);
            return { success: false, error: "Unauthorized" };
        }

        return { success: true, report };
    } catch (error) {
        console.error("[Reporting] Detailed fetch error:", error);
        return { success: false, error: "Failed to fetch report." };
    }
}

export async function updateUserRole(userId: string, role: string, managedBarangay: string | null = null) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                role: role as any,
                managedBarangay
            }
        });
        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Failed to update user role:", error);
        return { success: false, error: "Failed to update user role." };
    }
}

// ----------------------------------------
// BARANGAY MANAGEMENT ACTIONS
// ----------------------------------------

export async function addBarangay(formData: FormData) {
    try {
        const logoUrl = await processImageUpload(formData, "logo");
        const coverImageUrl = await processImageUpload(formData, "coverImage");
        const captainImageUrl = await processImageUpload(formData, "captainImage");

        const newBarangay = await prisma.barangayInfo.create({
            data: {
                name: formData.get("name") as string,
                description: formData.get("description") as string || null,
                logoUrl: logoUrl,
                coverImageUrl: coverImageUrl,
                captainName: formData.get("captainName") as string || null,
                captainMessage: formData.get("captainMessage") as string || null,
                captainImageUrl: captainImageUrl,
                history: formData.get("history") as string || null,
                mission: formData.get("mission") as string || null,
                vision: formData.get("vision") as string || null,
            },
        });

        revalidatePath("/admin/barangays/list");
        return { success: true, barangay: newBarangay };
    } catch (error) {
        console.error("Failed to add barangay:", error);
        return { success: false, error: "Failed to create barangay entry." };
    }
}

export async function updateBarangay(id: string, formData: FormData) {
    try {
        const oldItem = await prisma.barangayInfo.findUnique({ where: { id } });

        const logoUrl = await processImageUpload(formData, "logo");
        const coverImageUrl = await processImageUpload(formData, "coverImage");
        const captainImageUrl = await processImageUpload(formData, "captainImage");

        if (logoUrl && oldItem?.logoUrl && oldItem.logoUrl !== logoUrl) {
            await deleteUploadedFile(oldItem.logoUrl);
        }
        if (coverImageUrl && oldItem?.coverImageUrl && oldItem.coverImageUrl !== coverImageUrl) {
            await deleteUploadedFile(oldItem.coverImageUrl);
        }
        if (captainImageUrl && oldItem?.captainImageUrl && oldItem.captainImageUrl !== captainImageUrl) {
            await deleteUploadedFile(oldItem.captainImageUrl);
        }

        const updatedBarangay = await prisma.barangayInfo.update({
            where: { id },
            data: {
                name: formData.get("name") as string,
                description: formData.get("description") as string || null,
                logoUrl: logoUrl || (formData.get("logoUrl") as string) || null,
                coverImageUrl: coverImageUrl || (formData.get("coverImageUrl") as string) || null,
                captainName: formData.get("captainName") as string || null,
                captainMessage: formData.get("captainMessage") as string || null,
                captainImageUrl: captainImageUrl || (formData.get("captainImageUrl") as string) || null,
                history: formData.get("history") as string || null,
                mission: formData.get("mission") as string || null,
                vision: formData.get("vision") as string || null,
            },
        });

        revalidatePath("/admin/barangays/list");
        return { success: true, barangay: updatedBarangay };
    } catch (error) {
        console.error("Failed to update barangay:", error);
        return { success: false, error: "Failed to update barangay entry." };
    }
}

export async function deleteBarangay(id: string) {
    try {
        const item = await prisma.barangayInfo.findUnique({ where: { id } });
        if (item?.logoUrl) await deleteUploadedFile(item.logoUrl);
        if (item?.coverImageUrl) await deleteUploadedFile(item.coverImageUrl);
        if (item?.captainImageUrl) await deleteUploadedFile(item.captainImageUrl);

        await prisma.barangayInfo.delete({ where: { id } });
        revalidatePath("/admin/barangays/list");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete barangay:", error);
        return { success: false, error: "Failed to delete barangay entry." };
    }
}

export async function createBarangayAdmin(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const managedBarangay = formData.get("managedBarangay") as string;

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { success: false, error: "Email already exists in the system." };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "BARANGAY_ADMIN",
                managedBarangay,
                isEmailVerified: true, // Auto-verify for admins
                emailVerified: new Date(),
            }
        });

        revalidatePath("/admin/barangays/admins");
        return { success: true, admin: newAdmin };
    } catch (error: any) {
        console.error("Failed to create barangay admin:", error);
        return { success: false, error: error.message || "Failed to create barangay admin." };
    }
}

/**
 * Fetch simplified list of barangays for selection
 */
export async function getBarangaysList() {
    try {
        const barangays = await prisma.barangayInfo.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: barangays };
    } catch (error) {
        console.error("Fetch barangays list error:", error);
        return { success: false, error: "Failed to fetch barangays" };
    }
}

/**
 * Generic user creation for administrators
 */
export async function createUser(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const role = formData.get("role") as any;
        const managedBarangay = formData.get("managedBarangay") as string;
        const department = formData.get("department") as string;

        if (!name || !email || !password || !role) {
            return { success: false, error: "Missing required fields" };
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return { success: false, error: "Email already exists" };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                managedBarangay: role === "BARANGAY_ADMIN" ? managedBarangay : null,
                department: department || null,
                isEmailVerified: true,
                isPasswordChanged: true, // Admin set, bypass forced change
                emailVerified: new Date(),
            }
        });

        revalidatePath("/admin/users");
        return { success: true, user: newUser };
    } catch (error: any) {
        console.error("Failed to create user:", error);
        return { success: false, error: error.message || "Failed to create user" };
    }
}

/**
 * Update user details
 */
export async function updateUser(userId: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const role = formData.get("role") as any;
        const managedBarangay = formData.get("managedBarangay") as string;
        const department = formData.get("department") as string;

        if (!name || !email || !role) {
            return { success: false, error: "Missing required fields" };
        }

        // Check if email already taken by someone else
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && existing.id !== userId) {
            return { success: false, error: "Email is already taken by another account" };
        }

        const dataToUpdate: any = {
            name,
            email,
            role,
            managedBarangay: role === "BARANGAY_ADMIN" ? managedBarangay : null,
            department: department || null,
        };

        if (password && password.trim() !== "") {
            dataToUpdate.password = await bcrypt.hash(password, 10);
            dataToUpdate.isPasswordChanged = true;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate
        });

        revalidatePath("/admin/users");
        return { success: true, user: updatedUser };
    } catch (error: any) {
        console.error("Failed to update user:", error);
        return { success: false, error: error.message || "Failed to update user" };
    }
}

/**
 * Delete user account
 */
export async function deleteUser(userId: string) {
    try {
        const existing = await prisma.user.findUnique({ where: { id: userId } });
        if (!existing) {
            return { success: false, error: "User account not found" };
        }

        // Delete associated accounts
        await prisma.account.deleteMany({ where: { userId } }).catch((err: any) => {
            console.warn("Could not delete associated accounts:", err);
        });

        // Delete associated sessions
        await prisma.session.deleteMany({ where: { userId } }).catch((err: any) => {
            console.warn("Could not delete associated sessions:", err);
        });

        // Delete associated reports to satisfy the Report_userId_fkey constraint
        await (prisma as any).report.deleteMany({ where: { userId } }).catch((err: any) => {
            console.warn("Could not delete associated reports:", err);
        });

        // Unlink associated resident profile instead of deleting it, keeping resident records intact
        await (prisma as any).resident.updateMany({
            where: { userId },
            data: { userId: null }
        }).catch((err: any) => {
            console.warn("Could not unlink resident profile:", err);
        });

        // Delete transaction dependent child records to satisfy integrity constraints
        await (prisma as any).cedula.deleteMany({ where: { transaction: { userId } } }).catch(() => { });
        await (prisma as any).businessPermit.deleteMany({ where: { transaction: { userId } } }).catch(() => { });
        await (prisma as any).buildingPermit.deleteMany({ where: { transaction: { userId } } }).catch(() => { });
        await (prisma as any).birthCertificateRequest.deleteMany({ where: { transaction: { userId } } }).catch(() => { });
        await (prisma as any).deathCertificateRequest.deleteMany({ where: { transaction: { userId } } }).catch(() => { });
        await (prisma as any).marriageCertificateRequest.deleteMany({ where: { transaction: { userId } } }).catch(() => { });
        await (prisma as any).payment.deleteMany({ where: { transaction: { userId } } }).catch(() => { });

        // Delete transactions where the user is the resident
        await (prisma as any).transaction.deleteMany({ where: { userId } }).catch((err: any) => {
            console.warn("Could not delete associated transactions:", err);
        });

        // Finally, delete the user account safely
        await prisma.user.delete({
            where: { id: userId }
        });

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete user:", error);
        return { success: false, error: error.message || "Failed to delete user account" };
    }
}

/**
 * Create a support report from the Admin panel
 */
export async function createReportAdmin(userId: string, category: string, description: string, address?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return { success: false, error: "Unauthorized" };

        const newReport = await prisma.report.create({
            data: {
                userId,
                category,
                description,
                status: "PENDING",
                address: address || null,
            }
        });

        revalidatePath("/admin/reports");
        return { success: true, report: newReport };
    } catch (error: any) {
        console.error("Failed to create report:", error);
        return { success: false, error: error.message || "Failed to file report" };
    }
}

/**
 * Unlock and activate a deactivated user account, resetting their rejection count and setting their email as verified.
 */
export async function activateUser(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && user.role !== "TREASURY_STAFF")) {
            return { success: false, error: "Unauthorized" };
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                rejectionCount: 0,
                isEmailVerified: true,
                rejectionResetAt: new Date(),
            } as any
        });

        revalidatePath("/admin/users");
        return { success: true, user: updated };
    } catch (error: any) {
        console.error("Failed to activate user:", error);
        return { success: false, error: error.message || "Failed to activate user account" };
    }
}


