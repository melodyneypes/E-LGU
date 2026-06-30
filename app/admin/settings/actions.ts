"use server";

import prisma from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { uploadFile, deleteFileByUrl } from "@/lib/storage";

async function verifyAdminOrBarangayAdmin() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== "ADMIN" && role !== "BARANGAY_ADMIN")) {
        throw new Error("Unauthorized: Access denied.");
    }
    return session.user;
}

export async function deleteUploadedFile(imageUrl: string | null | undefined) {
    if (!imageUrl) return;

    // If it's a Supabase URL, use the new delete helper
    if (imageUrl.includes("supabase.co")) {
        await deleteFileByUrl(imageUrl);
        return;
    }

    // Fallback for legacy local files
    if (!imageUrl.startsWith("/uploads/")) return;

    try {
        const filepath = path.join(process.cwd(), "public", imageUrl);
        if (existsSync(filepath)) {
            await unlink(filepath);
        }
    } catch (error) {
        console.error("Error deleting local file:", error);
    }
}

export async function processImageUpload(formData: FormData, fieldName: string = "imageFile"): Promise<string | null> {
    const file = (formData.get(fieldName) || formData.get(fieldName + "File")) as File | null;

    const rawExisting = formData.get(fieldName) || formData.get("imageUrl");
    let existingUrl: string | null = null;

    if (typeof rawExisting === 'string') {
        existingUrl = rawExisting;
    } else if (typeof formData.get("imageUrl") === 'string') {
        existingUrl = formData.get("imageUrl") as string;
    }

    if (file && file.size > 0 && file.name !== "undefined") {
        try {
            // Determine subfolder based on fieldName
            let folder = "uploads";
            if (fieldName.includes("logo")) folder = "logos";
            if (fieldName.includes("Hero") || fieldName.includes("Slide")) folder = "banners";
            if (fieldName.includes("Qr")) folder = "treasury";
            if (fieldName.toLowerCase().includes("mayor") || fieldName.toLowerCase().includes("captain")) folder = "officials";

            let filename = `${Date.now()}_${file.name.replaceAll(" ", "_")}`;

            // Clean naming conventions as requested by user
            if (fieldName === "mayor-image") {
                const ext = file.name.split('.').pop() || 'jpg';
                filename = `mayor-image-${Date.now()}.${ext}`;
            } else if (fieldName === "past-mayor") {
                const ext = file.name.split('.').pop() || 'jpg';
                filename = `past-mayor-${Date.now()}.${ext}`;
            } else if (fieldName === "captain-image") {
                const ext = file.name.split('.').pop() || 'jpg';
                filename = `captain-image-${Date.now()}.${ext}`;
            }

            const storagePath = `${folder}/${filename}`;

            const buffer = Buffer.from(await file.arrayBuffer());
            const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);

            if (!publicUrl) {
                throw new Error("Upload failed. Please ensure the file is not corrupted and its format is supported by the storage settings (like PNG, JPEG, PDF, or WebP).");
            }

            // Delete old file if it exists (handles both local and supabase)
            if (existingUrl) {
                await deleteUploadedFile(existingUrl);
            }

            return publicUrl;
        } catch (error: any) {
            console.error("Error processing image upload to Supabase:", error);
            throw new Error(error.message || "Failed to upload file to storage.");
        }
    }

    // Return the existing URL if no new file was uploaded
    return existingUrl && typeof existingUrl === 'string' ? existingUrl : null;
}
export async function processFileUpload(formData: FormData, fieldName: string): Promise<string | null> {
    const file = formData.get(fieldName) as File | null;
    const existingUrl = formData.get(fieldName + "Url")?.toString() ||
        formData.get("flyerUrl")?.toString() ||
        formData.get("imageUrl")?.toString() ||
        null;

    if (file && file.size > 0 && file.name !== "undefined") {
        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = `${Date.now()}_${file.name.replaceAll(" ", "_")}`;
            const folder = fieldName.includes("flyer") ? "church" : "uploads";
            const storagePath = `${folder}/${filename}`;

            const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);

            if (!publicUrl) {
                throw new Error("Upload failed. Please ensure the file is not corrupted and its format is supported by the storage settings (like PNG, JPEG, PDF, or WebP).");
            }

            // Auto-delete old file
            if (existingUrl) {
                await deleteUploadedFile(existingUrl);
            }
            return publicUrl;
        } catch (error: any) {
            console.error("Error processing file upload to Supabase:", error);
            throw new Error(error.message || "Failed to upload file to storage.");
        }
    }
    return existingUrl;
}

export async function updateSystemSetting(key: string, value: string) {
    try {
        await verifyAdminOrBarangayAdmin();
        if (key === "maintenance_mode") {
            await prisma.$transaction([
                prisma.systemSetting.upsert({
                    where: { key },
                    update: { value },
                    create: { key, value }
                }),
                prisma.systemSetting.upsert({
                    where: { key: "maintenance_mode_updated_at" },
                    update: { value: Date.now().toString() },
                    create: { key: "maintenance_mode_updated_at", value: Date.now().toString() }
                })
            ]);
        } else {
            await prisma.systemSetting.upsert({
                where: { key },
                update: { value },
                create: { key, value }
            });
        }
        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating system setting:", error);
        return { success: false, error: "Failed to update setting" };
    }
}

export async function updateLogoSetting(formData: FormData) {
    try {
        await verifyAdminOrBarangayAdmin();
        const oldSetting = await prisma.systemSetting.findUnique({ where: { key: "site_logo" } });
        const imageUrl = await processImageUpload(formData, "logo");
        const finalUrl = imageUrl || (formData.get("imageUrl") as string) || "";

        if (imageUrl && oldSetting?.value && oldSetting.value !== imageUrl) {
            await deleteUploadedFile(oldSetting.value);
        }

        await prisma.systemSetting.upsert({
            where: { key: "site_logo" },
            update: { value: finalUrl },
            create: { key: "site_logo", value: finalUrl }
        });

        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true, imageUrl: finalUrl };
    } catch (error) {
        console.error("Error updating logo:", error);
        return { success: false, error: "Failed to update logo" };
    }
}

export async function createHeroSlide(formData: FormData) {
    try {
        const user = await verifyAdminOrBarangayAdmin() as any;
        const role = user?.role;
        const managedBarangay = user?.managedBarangay;
        const imageUrl = await processImageUpload(formData, "heroSlide");

        await prisma.heroSlide.create({
            data: {
                title: formData.get("title") as string,
                subtitle: formData.get("subtitle") as string,
                tagline: formData.get("tagline") as string,
                imageUrl: imageUrl || "",
                order: parseInt(formData.get("order") as string) || 0,
                isActive: formData.get("isActive") === "true",
                primaryBtnText: formData.get("primaryBtnText") as string,
                primaryBtnLink: formData.get("primaryBtnLink") as string,
                barangay: role === "BARANGAY_ADMIN" ? managedBarangay : null,
            } as any
        });
        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error creating hero slide:", error);
        return { success: false, error: "Failed to create slide" };
    }
}

export async function deleteHeroSlide(id: string) {
    try {
        await verifyAdminOrBarangayAdmin();
        const slide = await prisma.heroSlide.findUnique({ where: { id } });
        if (slide?.imageUrl) {
            await deleteUploadedFile(slide.imageUrl);
        }
        await prisma.heroSlide.delete({ where: { id } });
        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error deleting hero slide:", error);
        return { success: false, error: "Failed to delete slide" };
    }
}

export async function updateHeroSlide(id: string, formData: FormData) {
    try {
        const user = await verifyAdminOrBarangayAdmin() as any;
        const role = user?.role;
        const managedBarangay = user?.managedBarangay;
        const oldSlide = await prisma.heroSlide.findUnique({ where: { id } });
        const imageUrl = await processImageUpload(formData, "heroSlide");

        if (imageUrl && oldSlide?.imageUrl && oldSlide.imageUrl !== imageUrl) {
            await deleteUploadedFile(oldSlide.imageUrl);
        }

        await prisma.heroSlide.update({
            where: { id },
            data: {
                title: formData.get("title") as string,
                subtitle: formData.get("subtitle") as string,
                tagline: formData.get("tagline") as string,
                imageUrl: imageUrl || (formData.get("imageUrl") as string) || "",
                order: parseInt(formData.get("order") as string) || 0,
                isActive: formData.get("isActive") === "true",
                primaryBtnText: formData.get("primaryBtnText") as string,
                primaryBtnLink: formData.get("primaryBtnLink") as string,
                barangay: role === "BARANGAY_ADMIN" ? managedBarangay : null,
            } as any
        });
        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating hero slide:", error);
        return { success: false, error: "Failed to update slide" };
    }
}

export async function updateTreasurySettings(formData: FormData) {
    try {
        await verifyAdminOrBarangayAdmin();
        const oldQr = await prisma.systemSetting.findUnique({ where: { key: "gcash_qr_url" } });
        const qrUrl = await processImageUpload(formData, "gcashQr");

        if (qrUrl && oldQr?.value && oldQr.value !== qrUrl) {
            await deleteUploadedFile(oldQr.value);
        }

        const accountName = formData.get("gcashAccountName") as string;
        const accountNumber = formData.get("gcashAccountNumber") as string;

        const bankName = formData.get("bankName") as string;
        const bankAccountName = formData.get("bankAccountName") as string;
        const bankAccountNumber = formData.get("bankAccountNumber") as string;

        console.log("--- Treasury Settings Update ---");
        console.log("QR URL:", qrUrl);
        console.log("GCash Account Name:", accountName);
        console.log("GCash Account Number:", accountNumber);
        console.log("Bank Name:", bankName);
        console.log("Bank Account Name:", bankAccountName);
        console.log("Bank Account Number:", bankAccountNumber);

        if (qrUrl !== null && qrUrl !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: "gcash_qr_url" },
                update: { value: qrUrl },
                create: { key: "gcash_qr_url", value: qrUrl }
            });
        }

        if (accountName !== null && accountName !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: "gcash_account_name" },
                update: { value: accountName },
                create: { key: "gcash_account_name", value: accountName }
            });
        }

        if (accountNumber !== null && accountNumber !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: "gcash_account_number" },
                update: { value: accountNumber },
                create: { key: "gcash_account_number", value: accountNumber }
            });
        }

        if (bankName !== null && bankName !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: "bank_name" },
                update: { value: bankName },
                create: { key: "bank_name", value: bankName }
            });
        }

        if (bankAccountName !== null && bankAccountName !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: "bank_account_name" },
                update: { value: bankAccountName },
                create: { key: "bank_account_name", value: bankAccountName }
            });
        }

        if (bankAccountNumber !== null && bankAccountNumber !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: "bank_account_number" },
                update: { value: bankAccountNumber },
                create: { key: "bank_account_number", value: bankAccountNumber }
            });
        }

        revalidatePath("/");
        revalidatePath("/admin/settings");
        revalidatePath("/admin/treasury/payment-settings");
        revalidatePath("/user/services/requests/[id]");

        return {
            success: true,
            qrUrl: qrUrl || (formData.get("imageUrl") as string)
        };
    } catch (error) {
        console.error("Error updating treasury settings:", error);
        return { success: false, error: "Failed to update treasury settings" };
    }
}

export async function updateTransactionBaseFees(fees: { id: string, baseFee: number, studentFee?: number | null, defaultFees?: any }[]) {
    try {
        await verifyAdminOrBarangayAdmin();
        const updates = fees.map(fee =>
            prisma.transactionType.update({
                where: { id: fee.id },
                data: {
                    baseFee: fee.baseFee,
                    ...(fee.studentFee !== undefined ? { studentFee: fee.studentFee } : {}),
                    ...(fee.defaultFees !== undefined ? { defaultFees: fee.defaultFees } : {})
                }
            })
        );
        await prisma.$transaction(updates);

        revalidatePath("/user/services");
        revalidatePath("/admin/treasury/payment-settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating transaction base fees:", error);
        return { success: false, error: error.message };
    }
}
export async function updateMultipleSystemSettings(settings: { key: string, value: string }[]) {
    try {
        await verifyAdminOrBarangayAdmin();
        const hasMaintenance = settings.some(s => s.key === "maintenance_mode");
        const updates = settings.map(s =>
            prisma.systemSetting.upsert({
                where: { key: s.key },
                update: { value: s.value },
                create: { key: s.key, value: s.value }
            })
        );
        if (hasMaintenance) {
            updates.push(
                prisma.systemSetting.upsert({
                    where: { key: "maintenance_mode_updated_at" },
                    update: { value: Date.now().toString() },
                    create: { key: "maintenance_mode_updated_at", value: Date.now().toString() }
                })
            );
        }
        await prisma.$transaction(updates);

        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error) {
        console.error("Error updating multiple system settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

export async function updateAppointmentConfig(
    department: string, 
    data: { 
        maxSlots: number; 
        maxSlotsAM: number; 
        maxSlotsPM: number; 
        activeDays: number[]; 
        blockedDates: string[] 
    }
) {
    try {
        await verifyAdminOrBarangayAdmin();
        await prisma.appointmentConfig.upsert({
            where: { department },
            update: {
                maxSlots: data.maxSlots,
                maxSlotsAM: data.maxSlotsAM,
                maxSlotsPM: data.maxSlotsPM,
                activeDays: data.activeDays,
                blockedDates: data.blockedDates
            } as any,
            create: {
                department,
                maxSlots: data.maxSlots,
                maxSlotsAM: data.maxSlotsAM,
                maxSlotsPM: data.maxSlotsPM,
                activeDays: data.activeDays,
                blockedDates: data.blockedDates
            } as any
        });

        revalidatePath("/user/services/cedula-appointment");
        revalidatePath("/admin/treasury/payment-settings");
        revalidatePath("/admin/treasury/appointment-settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating appointment config:", error);
        return { success: false, error: error.message || "Failed to save configuration" };
    }
}

// End of settings actions
