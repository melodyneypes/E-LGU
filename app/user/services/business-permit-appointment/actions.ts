"use server";

import prisma from "@/lib/db/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString, sanitizeObject, sanitizeUrl } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";

function isValidImageOrPdf(buffer: Buffer, filename: string, mimeType: string): boolean {
    const allowedExtensions = /\.(jpe?g|png|webp|pdf)$/i;
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

async function processFileUpload(file: File, folder: string = "transactions"): Promise<string | null> {
    if (!file || file.size === 0) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        if (!isValidImageOrPdf(buffer, file.name, file.type)) {
            console.error(`Blocked upload attempt: File ${file.name} is not a valid image/PDF.`);
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

export async function cleanupPastDueBusinessAppointments(userId?: string) {
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
                notIn: ["RELEASED", "DELIVERED", "REJECTED"]
            },
            isCancelled: false,
            type: {
                code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
            }
        };

        if (userId) {
            whereClause.userId = userId;
        }

        await prisma.transaction.updateMany({
            where: whereClause,
            data: {
                isCancelled: true,
                status: "REJECTED",
                rejectionRemarks: "Appointment slot expired / missed"
            }
        });
    } catch (error) {
        console.error("Error cleaning up past-due business appointments:", error);
    }
}

export async function submitBusinessAppointment(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        await cleanupPastDueBusinessAppointments(session.user.id);

        const typeId = sanitizeString(formData.get("typeId") as string);
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string);
        const appointmentDate = new Date(formData.get("appointmentDate") as string);

        const txType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        if (!txType) {
            return { success: false, error: "Invalid transaction type." };
        }

        const activeTx = await prisma.transaction.findFirst({
            where: {
                userId: session.user.id,
                type: {
                    code: txType.code
                },
                status: {
                    notIn: ["RELEASED", "DELIVERED", "REJECTED"]
                },
                isCancelled: false
            }
        });
        if (activeTx) {
            return {
                success: false,
                error: `You currently have an ongoing request for "${txType.name}". Please wait for it to be completed or cancelled before requesting another one.`
            };
        }

        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));

        // Backend validation for mandatory street address
        if (!additionalData.building || !additionalData.building.trim()) {
            return { success: false, error: "Building / House No. / Unit is required." };
        }
        if (!additionalData.street || !additionalData.street.trim()) {
            return { success: false, error: "Street Address is required." };
        }

        // Files
        const idFile = formData.get("idFile") as File;
        const brgyClearanceFile = formData.get("brgyClearanceFile") as File;
        const dtiSecFile = formData.get("dtiSecFile") as File;
        const ctcFile = formData.get("ctcFile") as File;
        const sanitaryPermitFile = formData.get("sanitaryPermitFile") as File;
        const fireSafetyFile = formData.get("fireSafetyFile") as File;
        const previousPermitFile = formData.get("previousPermitFile") as File;
        const birCorFile = formData.get("birCorFile") as File;
        const locationPhotoFile = formData.get("locationPhotoFile") as File;

        const existingIdUrl = sanitizeUrl(formData.get("existingIdUrl") as string);

        let idUrl = null;
        if (idFile && idFile.size > 0 && idFile.name !== "undefined") {
            idUrl = await processFileUpload(idFile, "ids");
            if (!idUrl) {
                return { success: false, error: "Failed to upload Valid ID." };
            }
        }
        if (!idUrl && existingIdUrl) idUrl = existingIdUrl;

        let brgyUrl = null;
        if (brgyClearanceFile && brgyClearanceFile.size > 0 && brgyClearanceFile.name !== "undefined") {
            brgyUrl = await processFileUpload(brgyClearanceFile, "clearances");
            if (!brgyUrl) {
                return { success: false, error: "Failed to upload Barangay Clearance." };
            }
        }

        let dtiSecUrl = null;
        if (dtiSecFile && dtiSecFile.size > 0 && dtiSecFile.name !== "undefined") {
            dtiSecUrl = await processFileUpload(dtiSecFile, "dti_sec");
            if (!dtiSecUrl) {
                return { success: false, error: "Failed to upload DTI/SEC registration certificate." };
            }
        }

        let ctcUrl = null;
        if (ctcFile && ctcFile.size > 0 && ctcFile.name !== "undefined") {
            ctcUrl = await processFileUpload(ctcFile, "ctc");
            if (!ctcUrl) {
                return { success: false, error: "Failed to upload CTC." };
            }
        }

        let sanitaryPermitUrl = null;
        if (sanitaryPermitFile && sanitaryPermitFile.size > 0 && sanitaryPermitFile.name !== "undefined") {
            sanitaryPermitUrl = await processFileUpload(sanitaryPermitFile, "sanitary_permit");
            if (!sanitaryPermitUrl) {
                return { success: false, error: "Failed to upload Sanitary Permit." };
            }
        }

        let fireSafetyUrl = null;
        if (fireSafetyFile && fireSafetyFile.size > 0 && fireSafetyFile.name !== "undefined") {
            fireSafetyUrl = await processFileUpload(fireSafetyFile, "fire_safety");
            if (!fireSafetyUrl) {
                return { success: false, error: "Failed to upload Fire Safety Inspection Certificate." };
            }
        }

        let previousPermitUrl = null;
        if (previousPermitFile && previousPermitFile.size > 0 && previousPermitFile.name !== "undefined") {
            previousPermitUrl = await processFileUpload(previousPermitFile, "previous_permit");
            if (!previousPermitUrl) {
                return { success: false, error: "Failed to upload Previous Business Permit." };
            }
        }

        let birCorUrl = null;
        if (birCorFile && birCorFile.size > 0 && birCorFile.name !== "undefined") {
            birCorUrl = await processFileUpload(birCorFile, "bir_cor");
            if (!birCorUrl) {
                return { success: false, error: "Failed to upload BIR Certificate of Registration." };
            }
        }

        let locationPhotoUrl = null;
        if (locationPhotoFile && locationPhotoFile.size > 0 && locationPhotoFile.name !== "undefined") {
            locationPhotoUrl = await processFileUpload(locationPhotoFile, "location_photo");
            if (!locationPhotoUrl) {
                return { success: false, error: "Failed to upload Photo of Business Location." };
            }
        }

        const updatedAdditionalData = {
            ...additionalData,
            ownerIdUrl: idUrl,
            brgyClearanceUrl: brgyUrl,
            dtiSecUrl: dtiSecUrl,
            ctcUrl: ctcUrl,
            sanitaryPermitUrl: sanitaryPermitUrl,
            fireSafetyUrl: fireSafetyUrl,
            previousPermitUrl: previousPermitUrl,
            birCorUrl: birCorUrl,
            locationPhotoUrl: locationPhotoUrl,
        };

        // Check if the slot is still available
        const config = await prisma.appointmentConfig.findUnique({
            where: { department: "BPLO" }
        }) as any;
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
                type: {
                    code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
                }
            }
        });

        const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
        const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

        if (bookedCount >= maxLimit) {
            return { success: false, error: "This appointment slot is already fully booked." };
        }

        const isPriority = additionalData.isPriorityLane === true || additionalData.isPriorityLane === "true";

        const queueNumber = await generateQueueNumber({
            source: "web",
            isPriority,
            appointmentDate: startOfDay,
            appointmentSlot,
            category: "BUSINESS_PERMIT"
        });

        const transaction = await prisma.$transaction(async (tx) => {
            const newTx = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: "FOR_INSPECTION",
                    residentSnapshot,
                    additionalData: {
                        ...updatedAdditionalData,
                        isPriorityLane: isPriority
                    },
                    totalAmount: 0,
                    appointmentDate,
                    appointmentSlot,
                    queueNumber,
                    isPriority,
                    businessName: additionalData.businessName || null,
                } as any
            });

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
        console.error("Submit business appointment error:", error);
        return { success: false, error: "Failed to book business permit appointment" };
    }
}

export interface GetBusinessPermitFeedbacksInput {
    page?: number;
    limit?: number;
    rating?: string;
    search?: string;
}

export async function getBusinessPermitFeedbacksAction(input: GetBusinessPermitFeedbacksInput = {}) {
    try {
        const {
            page = 1,
            limit = 6,
            rating = "ALL",
            search = ""
        } = input;

        const baseBusinessScope: any = {
            OR: [
                {
                    transaction: {
                        type: {
                            OR: [
                                { category: "BUSINESS_PERMIT" },
                                { category: "Business Permit" },
                                { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } }
                            ]
                        }
                    }
                },
                {
                    transactionType: {
                        OR: [
                            { category: "BUSINESS_PERMIT" },
                            { category: "Business Permit" },
                            { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } }
                        ]
                    }
                }
            ]
        };

        const whereClause: any = { ...baseBusinessScope };

        if (rating !== "ALL") {
            whereClause.rating = rating;
        }

        if (search.trim()) {
            const query = search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { comment: { contains: query, mode: "insensitive" } },
                        { user: { name: { contains: query, mode: "insensitive" } } },
                        { user: { residentProfile: { firstName: { contains: query, mode: "insensitive" } } } },
                        { user: { residentProfile: { lastName: { contains: query, mode: "insensitive" } } } },
                        { transactionType: { name: { contains: query, mode: "insensitive" } } }
                    ]
                }
            ];
        }

        // Strict select projection — NEVER SELECT *
        const selectFields = {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    residentProfile: {
                        select: {
                            firstName: true,
                            lastName: true
                        }
                    }
                }
            },
            transaction: {
                select: {
                    id: true,
                    queueNumber: true,
                    type: {
                        select: {
                            id: true,
                            name: true,
                            category: true
                        }
                    }
                }
            },
            transactionType: {
                select: {
                    id: true,
                    name: true,
                    category: true
                }
            }
        };

        // Two-Tier Query: 1) Paginated items, 2) Filtered total, 3) All-time aggregate stats
        const [feedbacks, filteredTotal, allFeedbacksForStats] = await Promise.all([
            prisma.transactionFeedback.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit,
                select: selectFields
            }),
            prisma.transactionFeedback.count({ where: whereClause }),
            prisma.transactionFeedback.findMany({
                where: baseBusinessScope,
                select: { rating: true }
            })
        ]);

        const RATING_NUM_MAP: Record<string, number> = {
            ONE: 1,
            TWO: 2,
            THREE: 3,
            FOUR: 4,
            FIVE: 5
        };

        const totalFeedbacksCount = allFeedbacksForStats.length;
        let sumRating = 0;
        const ratingCounts: Record<string, number> = {
            FIVE: 0,
            FOUR: 0,
            THREE: 0,
            TWO: 0,
            ONE: 0
        };

        for (const item of allFeedbacksForStats) {
            const num = RATING_NUM_MAP[item.rating] || 0;
            sumRating += num;
            if (ratingCounts[item.rating] !== undefined) {
                ratingCounts[item.rating]++;
            }
        }

        const averageRating = totalFeedbacksCount > 0 ? Number((sumRating / totalFeedbacksCount).toFixed(1)) : 0;
        const positiveCount = ratingCounts.FIVE + ratingCounts.FOUR;
        const csatPercentage = totalFeedbacksCount > 0 ? Math.round((positiveCount / totalFeedbacksCount) * 100) : 0;

        const hasMore = (page * limit) < filteredTotal;
        const remainingCount = Math.max(0, filteredTotal - (page * limit));

        return {
            success: true,
            data: JSON.parse(JSON.stringify(feedbacks)),
            pagination: {
                page,
                limit,
                totalCount: filteredTotal,
                hasMore,
                remainingCount
            },
            stats: {
                totalFeedbacks: totalFeedbacksCount,
                averageRating,
                csatPercentage,
                ratingCounts
            }
        };
    } catch (error: any) {
        console.error("getBusinessPermitFeedbacksAction error:", error);
        return {
            success: false,
            error: error.message || "Failed to load feedbacks",
            data: [],
            pagination: { page: 1, limit: 6, totalCount: 0, hasMore: false, remainingCount: 0 },
            stats: { totalFeedbacks: 0, averageRating: 0, csatPercentage: 0, ratingCounts: { FIVE: 0, FOUR: 0, THREE: 0, TWO: 0, ONE: 0 } }
        };
    }
}
