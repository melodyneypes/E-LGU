"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString, sanitizeObject, sanitizeUrl } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";

async function processFileUpload(file: File, folder: string = "transactions"): Promise<string | null> {
    if (!file || file.size === 0) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const storagePath = `services/${folder}/${filename}`;

        const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);
        return publicUrl;
    } catch (error) {
        console.error("File upload error:", error);
        return null;
    }
}

export async function submitCedulaAppointment(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const typeId = sanitizeString(formData.get("typeId") as string);
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string);
        const appointmentDate = new Date(formData.get("appointmentDate") as string);

        // Sanitize resident snapshot and additional data
        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));

        // Files
        const idFile = formData.get("idFile") as File;
        const proofFile = formData.get("proofFile") as File;
        const existingIdUrl = sanitizeUrl(formData.get("existingIdUrl") as string);
        const existingProofUrl = sanitizeUrl(formData.get("existingProofUrl") as string);

        let idUrl = null;
        if (idFile && idFile.size > 0 && idFile.name !== "undefined") {
            idUrl = await processFileUpload(idFile, "ids");
            if (!idUrl) {
                return { success: false, error: "Failed to upload Valid ID. Please try again or check your connection." };
            }
        }
        if (!idUrl && existingIdUrl) idUrl = existingIdUrl;

        let proofUrl = null;
        if (proofFile && proofFile.size > 0 && proofFile.name !== "undefined") {
            proofUrl = await processFileUpload(proofFile, "proofs");
            if (!proofUrl) {
                return { success: false, error: "Failed to upload Proof document. Please try again or check your connection." };
            }
        }
        if (!proofUrl && existingProofUrl) proofUrl = existingProofUrl;

        // Merge file URLs into additionalData
        const updatedAdditionalData = {
            ...additionalData,
            validIdUrl: idUrl,
            proofOfIncomeUrl: proofUrl
        };

        // 1. Check if the slot is still available (concurrency control)
        const config = await prisma.appointmentConfig.findUnique({
            where: { department: "TREASURY" }
        }) as any; // Cast as any to resolve maxSlotsAM/PM cache lag warning
        const maxSlotsAM = config?.maxSlotsAM ?? 25;
        const maxSlotsPM = config?.maxSlotsPM ?? 25;

        const startOfDay = new Date(appointmentDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(appointmentDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedCount = await prisma.transaction.count({
            where: {
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                appointmentSlot: appointmentSlot,
                isCancelled: false,
                type: { category: "Treasurer" }
            }
        });

        const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
        const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

        if (bookedCount >= maxLimit) {
            return { success: false, error: "This appointment slot is already fully booked. Please select another slot." };
        }

        // 2. Generate unique Queue Ticket Number
        // Formats: [DATE]-[SHIFT]-[PRIORITY_INDICATOR][SEQUENCE]
        // E.g., 06272026-AM-005 or 06272026-AM-P002
        const dateStr = startOfDay.toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric"
        }).replace(/\//g, ""); // 06272026

        const shiftStr = isAM ? "AM" : "PM";
        
        // Read priority lane flag from additionalData (passed from form state)
        const isPriority = additionalData.isPriorityLane === true || additionalData.isPriorityLane === "true";

        // Count existing transactions for this shift on target date
        // using the direct isPriority column
        const shiftCount = await prisma.transaction.count({
            where: {
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                appointmentSlot: {
                    contains: shiftStr
                },
                isCancelled: false,
                isPriority: isPriority, // Direct column filter
                type: { category: "Treasurer" }
            } as any
        });

        const seqNum = String(shiftCount + 1).padStart(3, "0");
        const queueNumber = `${dateStr}-${shiftStr}-${isPriority ? "P" : ""}${seqNum}`;

        // 3. Create the Transaction Record
        const transaction = await prisma.$transaction(async (tx) => {
            const newTx = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: "FOR_REQUESTING", // Updated status to FOR_REQUESTING
                    residentSnapshot,
                    additionalData: {
                        ...updatedAdditionalData,
                        isPriorityLane: isPriority
                    },
                    totalAmount: 0,
                    appointmentDate,
                    appointmentSlot,
                    queueNumber,
                    isPriority, // Save under new isPriority column
                    businessName: additionalData.businessName || null,
                } as any
            });

            // Update permanent resident profile
            await tx.resident.update({
                where: { userId: session.user.id },
                data: {
                    firstName: residentSnapshot.firstName,
                    middleName: residentSnapshot.middleName,
                    lastName: residentSnapshot.lastName,
                    suffix: residentSnapshot.suffix,
                    dateOfBirth: residentSnapshot.dateOfBirth ? new Date(residentSnapshot.dateOfBirth) : undefined,
                    civilStatus: residentSnapshot.civilStatus,
                    citizenship: residentSnapshot.citizenship,
                    houseNumber: residentSnapshot.houseNumber,
                    street: residentSnapshot.street,
                    barangay: residentSnapshot.barangay,
                    municipality: residentSnapshot.municipality,
                    province: residentSnapshot.province,
                    contactNumber: residentSnapshot.contactNumber,
                    email: residentSnapshot.email,
                }
            });

            return newTx;
        });

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        return { success: true, data: transaction as any };
    } catch (error) {
        console.error("Submit appointment transaction error:", error);
        return { success: false, error: "Failed to book appointment" };
    }
}
