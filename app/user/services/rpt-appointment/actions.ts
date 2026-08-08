"use server";

import prisma from "@/lib/db/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString, sanitizeObject } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";
import { format } from "date-fns";

function isValidImageOrPdf(buffer: Buffer, filename: string, mimeType: string): boolean {
    const allowedExtensions = /\.(jpe?g|png|gif|webp|pdf)$/i;
    if (!allowedExtensions.test(filename)) {
        return false;
    }

    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
        return false;
    }

    if (buffer.length < 4) return false;
    const hex = buffer.toString("hex", 0, 12).toUpperCase();

    if (hex.startsWith("FFD8FF")) {
        return mimeType.toLowerCase() === "image/jpeg";
    }
    if (hex.startsWith("89504E470D0A1A0A")) {
        return mimeType.toLowerCase() === "image/png";
    }
    if (hex.startsWith("25504446")) {
        return mimeType.toLowerCase() === "application/pdf";
    }
    if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
        return mimeType.toLowerCase() === "image/webp";
    }

    return false;
}

async function processFileUpload(file: File, folder: string = "rpt-documents"): Promise<string | null> {
    if (!file || file.size === 0) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        if (!isValidImageOrPdf(buffer, file.name, file.type)) {
            console.error(`Blocked upload attempt: File ${file.name} is not a valid image/PDF or header mismatch.`);
            return null;
        }

        const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const storagePath = `services/${folder}/${filename}`;

        const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);
        return publicUrl;
    } catch (error) {
        console.error("File upload error:", error);
        return null;
    }
}

export async function cleanupPastDueRptAppointments(userId?: string) {
    try {
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [month, day, year] = manilaDateString.split("/");
        const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

        const whereClause: any = {
            appointmentDate: {
                lt: startOfTodayManila
            },
            status: {
                notIn: ["RELEASED", "DELIVERED", "REJECTED", "PAID", "COMPLETED"]
            },
            isCancelled: false,
            type: {
                category: "RPT"
            }
        };

        if (userId) {
            whereClause.userId = userId;
        }

        const pastDueTxs = await prisma.transaction.findMany({
            where: whereClause,
            include: { type: true }
        });

        if (pastDueTxs.length > 0) {
            const pastDueIds = pastDueTxs.map(t => t.id);

            await prisma.transaction.updateMany({
                where: { id: { in: pastDueIds } },
                data: {
                    isCancelled: true,
                    status: "REJECTED",
                    rejectionRemarks: "Appointment schedule expired / missed"
                }
            });
        }
    } catch (error) {
        console.error("Error cleaning up past-due RPT appointments:", error);
    }
}

export async function fetchPropertyByTdnOrPin(query: string) {
    if (!query || query.trim().length < 3) return null;
    const q = query.trim().toUpperCase();

    try {
        const existingRpt = await (prisma as any).realPropertyTax.findFirst({
            where: {
                OR: [
                    { tdn: { contains: q, mode: "insensitive" } },
                    { pin: { contains: q, mode: "insensitive" } }
                ]
            },
            orderBy: { createdAt: "desc" }
        });

        if (existingRpt) {
            return {
                found: true,
                tdn: existingRpt.tdn,
                pin: existingRpt.pin || "",
                ownerName: existingRpt.ownerName,
                propertyAddress: existingRpt.propertyAddress,
                barangay: existingRpt.barangay,
                propertyType: existingRpt.propertyType,
                assessedValue: existingRpt.assessedValue
            };
        }

        return null;
    } catch (err) {
        console.error("Error searching property metadata:", err);
        return null;
    }
}

export async function submitRptAppointment(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized. Please log in." };
        }

        await cleanupPastDueRptAppointments(session.user.id);

        const categoryCode = sanitizeString(formData.get("categoryCode") as string);
        const tdn = sanitizeString(formData.get("tdn") as string);
        const pin = sanitizeString(formData.get("pin") as string);
        const ownerName = sanitizeString(formData.get("ownerName") as string);
        const propertyAddress = sanitizeString(formData.get("propertyAddress") as string);
        const barangay = sanitizeString(formData.get("barangay") as string);
        const propertyType = sanitizeString(formData.get("propertyType") as string) || "RESIDENTIAL";
        const assessedValueStr = formData.get("assessedValue") as string;
        const assessedValue = parseFloat(assessedValueStr || "0");

        const appointmentDateStr = formData.get("appointmentDate") as string;
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string); // "MORNING" or "AFTERNOON"

        if (!categoryCode || !tdn || !ownerName || !barangay || assessedValue <= 0) {
            return { success: false, error: "Missing required property details or valid assessed value." };
        }

        if (!appointmentDateStr || !appointmentSlot) {
            return { success: false, error: "Please select a valid appointment date and time slot." };
        }

        // Handle File Uploads
        const validIdFile = formData.get("validIdFile") as File;
        const previousOrFile = formData.get("previousOrFile") as File;
        const buildingPermitFile = formData.get("buildingPermitFile") as File;
        const deedOfSaleFile = formData.get("deedOfSaleFile") as File;
        const titleFile = formData.get("titleFile") as File;
        const birEcarFile = formData.get("birEcarFile") as File;

        if (!validIdFile || validIdFile.size === 0) {
            return { success: false, error: "Valid Government-Issued ID is required." };
        }

        const validIdUrl = await processFileUpload(validIdFile);
        if (!validIdUrl) {
            return { success: false, error: "Failed to upload Valid ID. Ensure file is a valid image or PDF." };
        }

        let previousOrUrl: string | null = null;
        let buildingPermitUrl: string | null = null;
        let deedOfSaleUrl: string | null = null;
        let titleUrl: string | null = null;
        let birEcarUrl: string | null = null;

        if (categoryCode === "RPT_CAT1" && previousOrFile && previousOrFile.size > 0) {
            previousOrUrl = await processFileUpload(previousOrFile);
        }
        if (categoryCode === "RPT_CAT2" && buildingPermitFile && buildingPermitFile.size > 0) {
            buildingPermitUrl = await processFileUpload(buildingPermitFile);
        }
        if (categoryCode === "RPT_CAT3") {
            if (deedOfSaleFile && deedOfSaleFile.size > 0) deedOfSaleUrl = await processFileUpload(deedOfSaleFile);
            if (titleFile && titleFile.size > 0) titleUrl = await processFileUpload(titleFile);
            if (birEcarFile && birEcarFile.size > 0) birEcarUrl = await processFileUpload(birEcarFile);
        }

        // Find or create TransactionType for RPT
        let txType = await prisma.transactionType.findUnique({
            where: { code: categoryCode }
        });

        if (!txType) {
            const categoryNames: Record<string, string> = {
                RPT_CAT1: "Category 1: Routine Annual Tax Payment & Tax Clearance",
                RPT_CAT2: "Category 2: New Property Declaration & Assessment",
                RPT_CAT3: "Category 3: Transfer of Property Ownership",
            };
            txType = await prisma.transactionType.create({
                data: {
                    code: categoryCode,
                    name: categoryNames[categoryCode] || "Real Property Tax",
                    category: "RPT",
                    processorRole: (categoryCode === "RPT_CAT1" ? "TREASURY_STAFF" : "ASSESSOR") as any,
                    baseFee: 0,
                    isActive: true,
                }
            });
        }

        // Calculate RPT Tax amounts: Basic RPT 1%, SEF 1%, Total = 2% of Assessed Value
        const basicTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const sefTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const totalTaxDue = basicTax + sefTax;

        // Appointment Date
        const apptDate = new Date(appointmentDateStr);

        // Generate Queue Ticket
        let customQueueNum = "";
        try {
            const targetCategory = categoryCode === "RPT_CAT1" ? "RPT_TREASURY" : "RPT_ASSESSOR";
            customQueueNum = await generateQueueNumber({
                source: "web",
                isPriority: false,
                appointmentDate: apptDate,
                appointmentSlot: appointmentSlot,
                category: targetCategory as any
            });
        } catch {
            const shiftPrefix = appointmentSlot === "MORNING" ? "AM" : "PM";
            const ticketPrefix = categoryCode === "RPT_CAT1" ? "T" : "A";
            customQueueNum = `${format(apptDate, "MMddyyyy")}-${shiftPrefix}-${ticketPrefix}001`;
        }

        // Initial Status: Category 1 starts at UNPAID (Direct to Treasury), Category 2 & 3 start at FOR_REQUESTING (Assessor first)
        const initialStatus = categoryCode === "RPT_CAT1" ? "UNPAID" : "FOR_REQUESTING";

        const newTransaction = await prisma.transaction.create({
            data: {
                userId: session.user.id,
                typeId: txType.id,
                status: initialStatus as any,
                appointmentDate: apptDate,
                appointmentSlot: appointmentSlot,
                queueNumber: customQueueNum,
                totalAmount: totalTaxDue,
                isPaid: false,
                residentSnapshot: sanitizeObject({
                    name: session.user.name || ownerName,
                    email: session.user.email || "",
                }),
                additionalData: sanitizeObject({
                    categoryCode,
                    tdn,
                    pin,
                    ownerName,
                    propertyAddress,
                    barangay,
                    propertyType,
                    assessedValue,
                    basicTax,
                    sefTax,
                    totalTaxDue,
                    appointmentSlot,
                    validIdUrl,
                    previousOrUrl,
                    buildingPermitUrl,
                    deedOfSaleUrl,
                    titleUrl,
                    birEcarUrl,
                    assessorStatus: categoryCode === "RPT_CAT1" ? "NOT_REQUIRED" : "PENDING",
                    treasuryStatus: "PENDING",
                    checkedIn: false,
                    checkedInAt: null,
                    soaReferenceCode: `SOA-RPT-${Date.now().toString().slice(-6)}`
                })
            }
        });

        revalidatePath("/user/services");
        revalidatePath("/admin/treasury");
        revalidatePath("/admin/assessor");

        return {
            success: true,
            transactionId: newTransaction.id,
            queueNumber: customQueueNum,
            soaReferenceCode: (newTransaction.additionalData as any)?.soaReferenceCode,
            totalTaxDue
        };

    } catch (error: any) {
        console.error("Error submitting RPT appointment:", error);
        return { success: false, error: error?.message || "Failed to submit RPT appointment. Please try again." };
    }
}
