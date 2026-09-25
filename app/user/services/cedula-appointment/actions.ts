"use server";

import prisma from "@/lib/db/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString, sanitizeObject, sanitizeUrl } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";

function isValidImageOrPdf(buffer: Buffer, filename: string, mimeType: string): boolean {
    // 1. Extension check
    const allowedExtensions = /\.(jpe?g|png|gif|webp|pdf)$/i;
    if (!allowedExtensions.test(filename)) {
        return false;
    }

    // 2. MIME type check
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ];
    if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
        return false;
    }

    // 3. Magic bytes verification (headers)
    if (buffer.length < 4) return false;
    const hex = buffer.toString("hex", 0, 12).toUpperCase();

    // JPEG: FF D8 FF
    if (hex.startsWith("FFD8FF")) {
        return mimeType.toLowerCase() === "image/jpeg";
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (hex.startsWith("89504E470D0A1A0A")) {
        return mimeType.toLowerCase() === "image/png";
    }
    // PDF: %PDF
    if (hex.startsWith("25504446")) {
        return mimeType.toLowerCase() === "application/pdf";
    }
    // WEBP: RIFF at start and WEBP at offset 8
    if (hex.startsWith("52494646") && hex.substring(16, 24) === "57454250") {
        return mimeType.toLowerCase() === "image/webp";
    }

    return false;
}

async function processFileUpload(file: File, folder: string = "transactions"): Promise<string | null> {
    if (!file || file.size === 0) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());

        // Validate the file headers (magic bytes) to prevent script execution attacks
        if (!isValidImageOrPdf(buffer, file.name, file.type)) {
            console.error(`Blocked upload attempt: File ${file.name} is not a valid image/PDF or headers mismatch.`);
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

export async function cleanupPastDueCedulaAppointments(userId?: string) {
    try {
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [month, day, year] = manilaDateString.split("/");
        const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

        // Find all non-terminal cedula appointments before today
        const whereClause: any = {
            appointmentDate: {
                lt: startOfTodayManila
            },
            status: {
                notIn: ["RELEASED", "DELIVERED", "REJECTED"]
            },
            isCancelled: false,
            type: {
                category: "CEDULA"
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
                    rejectionRemarks: "Appointment slot expired / missed"
                }
            });

            // Record category rejection for each past due appointment
            const { recordTransactionRejection } = await import("@/lib/transactions/rejection-tracker");
            for (const tx of pastDueTxs) {
                if (tx.userId) {
                    const categoryKey = tx.type?.category || "CEDULA";
                    await recordTransactionRejection(tx.userId, categoryKey);
                }
            }
        }
    } catch (error) {
        console.error("Error cleaning up past-due appointments:", error);
    }
}

export async function submitCedulaAppointment(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Automatically cancel/reject any past-due appointments before verifying active transaction
        await cleanupPastDueCedulaAppointments(session.user.id);

        const typeId = sanitizeString(formData.get("typeId") as string);
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string);
        const appointmentDate = new Date(formData.get("appointmentDate") as string);

        // Check if there is an existing active request of the same type
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
                error: `You currently have an ongoing request for "${txType.name}". Please wait for it to be completed (Released) or cancelled before requesting another one.`
            };
        }

        // Sanitize resident snapshot and additional data
        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));

        // Files
        const idFile = formData.get("idFile") as File;
        const proofFile = formData.get("proofFile") as File;
        const authorizationLetterFile = formData.get("authorizationLetterFile") as File;
        const secRegistrationFile = formData.get("secRegistrationFile") as File;
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

        let authorizationLetterUrl = null;
        if (authorizationLetterFile && authorizationLetterFile.size > 0 && authorizationLetterFile.name !== "undefined") {
            authorizationLetterUrl = await processFileUpload(authorizationLetterFile, "authorizations");
            if (!authorizationLetterUrl) {
                return { success: false, error: "Failed to upload Authorization Letter. Please try again or check your connection." };
            }
        }

        let secRegistrationUrl = null;
        if (secRegistrationFile && secRegistrationFile.size > 0 && secRegistrationFile.name !== "undefined") {
            secRegistrationUrl = await processFileUpload(secRegistrationFile, "sec_registrations");
            if (!secRegistrationUrl) {
                return { success: false, error: "Failed to upload SEC Registration. Please try again or check your connection." };
            }
        }

        // Merge file URLs into additionalData
        const updatedAdditionalData = {
            ...additionalData,
            validIdUrl: idUrl,
            proofOfIncomeUrl: proofUrl,
            authorizationLetterUrl: authorizationLetterUrl,
            secRegistrationUrl: secRegistrationUrl
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
                type: { category: "CEDULA" }
            }
        });

        const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
        const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

        if (bookedCount >= maxLimit) {
            return { success: false, error: "This appointment slot is already fully booked. Please select another slot." };
        }

        // Read priority lane flag from additionalData (passed from form state)
        const isPriority = additionalData.isPriorityLane === true || additionalData.isPriorityLane === "true";

        // Read and sanitize applicant target & relationship representation
        const applicantTarget = additionalData.applicantTarget === "RELATIVE" ? "RELATIVE" : "SELF";
        const relationshipToApplicant = applicantTarget === "RELATIVE"
            ? sanitizeString((additionalData.relationshipToApplicant as string) || "Relative")
            : "SELF";

        const queueNumber = await generateQueueNumber({
            source: "web",
            isPriority,
            appointmentDate: startOfDay,
            appointmentSlot,
            category: "CEDULA"
        });

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
                        applicantTarget,
                        relationshipToApplicant,
                        placeOfBirth: residentSnapshot.placeOfBirth || additionalData.placeOfBirth || null,
                        height: residentSnapshot.height || additionalData.height || null,
                        weight: residentSnapshot.weight || additionalData.weight || null,
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

            // Update permanent resident profile ONLY if the applicant applied for themselves
            if (applicantTarget === "SELF") {
                await tx.resident.update({
                    where: { userId: session.user.id },
                    data: {
                        firstName: residentSnapshot.firstName,
                        middleName: residentSnapshot.middleName,
                        lastName: residentSnapshot.lastName,
                        suffix: residentSnapshot.suffix,
                        dateOfBirth: residentSnapshot.dateOfBirth ? new Date(residentSnapshot.dateOfBirth) : undefined,
                        placeOfBirth: residentSnapshot.placeOfBirth || undefined,
                        civilStatus: residentSnapshot.civilStatus,
                        citizenship: residentSnapshot.citizenship,
                        height: residentSnapshot.height || undefined,
                        weight: residentSnapshot.weight || undefined,
                        houseNumber: residentSnapshot.houseNumber,
                        street: residentSnapshot.street,
                        barangay: residentSnapshot.barangay,
                        municipality: residentSnapshot.municipality,
                        province: residentSnapshot.province,
                        contactNumber: residentSnapshot.contactNumber,
                        email: residentSnapshot.email,
                    }
                });
            }

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

export interface GetCedulaFeedbacksInput {
    page?: number;
    limit?: number;
    rating?: string;
    search?: string;
}

export async function getCedulaFeedbacksAction(input: GetCedulaFeedbacksInput = {}) {
    try {
        const {
            page = 1,
            limit = 12,
            rating = "ALL",
            search = ""
        } = input;

        const baseCedulaScope: any = {
            OR: [
                {
                    transaction: {
                        type: {
                            OR: [
                                { category: "CEDULA" },
                                { code: { in: ["CEDULA_IND", "CEDULA_JUR", "CEDULA_STUDENT"] } }
                            ]
                        }
                    }
                },
                {
                    transactionType: {
                        OR: [
                            { category: "CEDULA" },
                            { code: { in: ["CEDULA_IND", "CEDULA_JUR", "CEDULA_STUDENT"] } }
                        ]
                    }
                }
            ]
        };

        const whereClause: any = { ...baseCedulaScope };

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

        // Strict select projections — NEVER SELECT *
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

        // Two-Tier: 1) Paginated items, 2) Filtered total count, 3) All-time aggregate stats
        const [feedbacks, filteredTotal, allFeedbacksForStats] = await Promise.all([
            prisma.transactionFeedback.findMany({
                where: whereClause,
                orderBy: { createdAt: "desc" },
                take: limit,
                skip: (page - 1) * limit,
                select: selectFields
            }),
            prisma.transactionFeedback.count({ where: whereClause }),
            // Fast aggregate rating query
            prisma.transactionFeedback.findMany({
                where: baseCedulaScope,
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
        console.error("getCedulaFeedbacksAction error:", error);
        return {
            success: false,
            error: error.message || "Failed to load feedbacks",
            data: [],
            pagination: { page: 1, limit: 6, totalCount: 0, hasMore: false, remainingCount: 0 },
            stats: { totalFeedbacks: 0, averageRating: 0, csatPercentage: 0, ratingCounts: { FIVE: 0, FOUR: 0, THREE: 0, TWO: 0, ONE: 0 } }
        };
    }
}
