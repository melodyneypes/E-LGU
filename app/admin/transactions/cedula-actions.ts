"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { uploadFile } from "@/lib/storage";
import { calculateCedula } from "@/lib/cedula";
import { sanitizeString, sanitizeUrl } from "@/lib/validation";
import { updateDeceasedResidentStatus } from "./death-regis-actions";

const isUserAdminAide = (u: any) => u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");

async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Confirm transaction payment (standard reference update)
 */
export async function confirmTransactionPayment(id: string, referenceNo?: string) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedReferenceNo = referenceNo ? sanitizeString(referenceNo) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const isBusinessPermit = transaction.type.code.startsWith("BUSINESS_PERMIT");
        if (isBusinessPermit && isUserAdminAide(user) && (transaction.status as any) !== "FOR_INSPECTION") {
            return { success: false, error: "Forbidden: Admin Aides can only process Business Permits in the evaluation phase." };
        }

        const nextStatus = transaction.status === "PAID" ? "FOR_PROCESSING" : "PAID";
        const transactionData: any = {
            status: nextStatus as any,
            updatedAt: new Date()
        };

        if (sanitizedReferenceNo) {
            transactionData.paymentReference = sanitizedReferenceNo;
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: transactionData,
            include: { user: true, type: true }
        });

        if (nextStatus === "PAID") {
            await prisma.payment.upsert({
                where: { transactionId: sanitizedId },
                update: {
                    amount: Number(updatedTransaction.totalAmount || 0),
                    method: updatedTransaction.paymentType || "CASH",
                    status: "PAID",
                    reference: sanitizedReferenceNo || updatedTransaction.paymentReference || `manual_${sanitizedId}`
                },
                create: {
                    transactionId: sanitizedId,
                    amount: Number(updatedTransaction.totalAmount || 0),
                    method: updatedTransaction.paymentType || "CASH",
                    status: "PAID",
                    reference: sanitizedReferenceNo || updatedTransaction.paymentReference || `manual_${sanitizedId}`,
                    meta: { source: "treasury_confirmation" }
                }
            });
        }

        if (nextStatus === "PAID" && updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: "PAID",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Service",
                amount: updatedTransaction.totalAmount || 0
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/treasury/payments");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Confirm payment error:", error);
        return { success: false, error: "Failed to confirm payment" };
    }
}

/**
 * Confirm Payment with optional Treasury Receipt upload (Treasury Staff side)
 */
export async function confirmTransactionPaymentWithReceipt(formData: FormData) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER")) {
            return { success: false, error: "Forbidden" };
        }

        const id = formData.get("id") as string;
        const remarks = formData.get("remarks") as string;
        const receiptFile = formData.get("receiptFile") as File;
        const orFile = formData.get("orFile") as File;
        const orSeriesNumber = formData.get("orSeriesNumber") as string;

        const sanitizedId = sanitizeString(id);
        const sanitizedRemarks = remarks ? sanitizeString(remarks) : undefined;

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        let treasuryReceiptUrl = undefined;
        if (receiptFile && (receiptFile as any).size > 0) {
            const timestamp = Date.now();
            const path = `treasury/receipts/${sanitizedId}/${timestamp}-${(receiptFile as any).name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            treasuryReceiptUrl = await uploadFile(receiptFile, path);
        }

        let orDocumentUrl = undefined;
        if (orFile && (orFile as any).size > 0) {
            const timestamp = Date.now();
            const path = `treasury/or/${sanitizedId}/${timestamp}-${(orFile as any).name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            orDocumentUrl = await uploadFile(orFile, path);
        }

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            ...(sanitizedRemarks && { treasuryRemarks: sanitizedRemarks }),
            ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
            ...(orSeriesNumber && { orSeriesNumber: sanitizeString(orSeriesNumber) }),
            ...(orDocumentUrl && { orDocumentUrl })
        };

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: "PAID",
                updatedAt: new Date(),
                additionalData: updatedAdditionalData
            },
            include: { user: true, type: true }
        });

        const paymentReference =
            currentAdditionalData.gcashReferenceNo ||
            currentAdditionalData.referenceNo ||
            transaction.paymentReference ||
            (orSeriesNumber ? sanitizeString(orSeriesNumber) : null) ||
            `manual_${sanitizedId}`;

        await prisma.payment.upsert({
            where: { transactionId: sanitizedId },
            update: {
                amount: Number(updatedTransaction.totalAmount || 0),
                method: updatedTransaction.paymentType || "CASH",
                status: "PAID",
                reference: String(paymentReference),
                meta: {
                    source: "treasury_confirmation",
                    ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
                    ...(orDocumentUrl && { orDocumentUrl })
                }
            },
            create: {
                transactionId: sanitizedId,
                amount: Number(updatedTransaction.totalAmount || 0),
                method: updatedTransaction.paymentType || "CASH",
                status: "PAID",
                reference: String(paymentReference),
                meta: {
                    source: "treasury_confirmation",
                    ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
                    ...(orDocumentUrl && { orDocumentUrl })
                }
            }
        });

        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: "PAID",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Service",
                amount: updatedTransaction.totalAmount || 0
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/treasury/payments");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Confirm payment with receipt error:", error);
        return { success: false, error: "Failed to confirm payment" };
    }
}

/**
 * Release Cedula / LCR (Fallback LCR support excluding Birth Certificate/Registry)
 */
export async function releaseCedula(id: string, ctcNumber: string, eCopyUrl?: string, orUrl?: string) {
    try {
        id = sanitizeString(id);
        ctcNumber = sanitizeString(ctcNumber);
        eCopyUrl = eCopyUrl ? sanitizeUrl(eCopyUrl) : undefined;
        orUrl = orUrl ? sanitizeUrl(orUrl) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                type: true,
                user: true,
                cedula: true,
                deathRegistration: true,
                marriageRegistration: true,
                marriageLicenseApplication: true
            }
        });

        if (!transaction || !["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid, processing, ready for claiming, or under re-inspection before release" };
        }

        const additionalData = transaction.additionalData as any;

        let basicTax = 0;
        let additionalTax = 0;
        let penalty = 0;

        const calc = calculateCedula({
            type: additionalData.applicantType || "INDIVIDUAL",
            income: additionalData.income || 0,
            propertyValue: additionalData.propertyValue || 0,
            fulfillmentType: transaction.fulfillmentType,
            deliveryFee: transaction.type.deliveryFee,
            baseFee: transaction.type.baseFee
        });
        basicTax = calc.basicTax;
        additionalTax = calc.additionalTax;
        penalty = calc.penalty;

        const isLcrTx = transaction.type.code.startsWith("LCR_") || transaction.type.code.startsWith("CIVIL_REGISTRY");
        const isInitialRelease = (transaction.status as any) === "FOR_PROCESSING" || (transaction.status as any) === "PAID" || (transaction.status as any) === "FOR_REINSPECTION";
        const targetStatus = (transaction.status as any) === "PAID"
            ? (isLcrTx ? "FOR_REINSPECTION" : "FOR_PROCESSING")
            : isInitialRelease
                ? (transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "FOR_CLAIM")
                : "RELEASED";

        if (targetStatus === "FOR_PICKING") {
            try {
                const riders = await prisma.user.findMany({
                    where: { role: "RIDER" } as any,
                    select: { email: true, name: true }
                });

                await Promise.all(riders.map(async (rider) => {
                    if (rider.email) {
                        return sendEmail({
                            type: "NEW_PICKUP_ALERT" as any,
                            to: rider.email,
                            name: rider.name || "Rider",
                            transactionId: transaction.id
                        });
                    }
                }));
            } catch (notifyError) {
                console.error("Failed to notify riders:", notifyError);
            }
        }

        if (ctcNumber) {
            const existingCedula = await prisma.cedula.findUnique({
                where: { ctcNumber }
            });
            if (existingCedula && existingCedula.transactionId !== id) {
                return { success: false, error: `CTC Number ${ctcNumber} is already used by another request.` };
            }
        }

        const now = new Date();
        const isPickupCashInitial = transaction.fulfillmentType === "PICK_UP" && transaction.paymentType === "CASH" && transaction.status === "FOR_PROCESSING";
        const isLCR = transaction.type.code.startsWith("LCR_");

        if (!isLCR) {
            if (!transaction.cedula) {
                if (!ctcNumber && !isPickupCashInitial && transaction.status !== "PAID") {
                    return { success: false, error: "CTC Number is required for this transaction type." };
                }
                await prisma.cedula.create({
                    data: {
                        transactionId: id,
                        ctcNumber: ctcNumber || null,
                        taxYear: now.getFullYear(),
                        dateIssued: now,
                        expiryDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
                        basicTax,
                        additionalTax,
                        penalty,
                        totalPaid: transaction.totalAmount,
                        issuedBy: user.name || "System Administrator",
                        businessName: transaction.businessName || additionalData.businessName || null,
                        documentUrl: eCopyUrl || transaction.eCopyUrl,
                        verificationId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                    }
                });
            } else if (ctcNumber || eCopyUrl) {
                await prisma.cedula.update({
                    where: { id: transaction.cedula.id },
                    data: {
                        ...(ctcNumber ? { ctcNumber } : {}),
                        ...(eCopyUrl ? { documentUrl: eCopyUrl } : {})
                    }
                });
            }
        }

        if (isLCR) {
            const typeCode = (transaction.type.code || "").toUpperCase();
            if (typeCode === "LCR_DEATH") {
                const dcrExisting = (transaction as any).deathCertificateRequest;
                if (!dcrExisting && targetStatus === "RELEASED") {
                    const src: any = additionalData || {};
                    const subjectName = src.subjectName || src.fullName || null;
                    const dateOfEvent = src.dateOfEvent ? new Date(src.dateOfEvent) : null;
                    const placeOfEvent = src.placeOfEvent || null;

                    if (subjectName && dateOfEvent && placeOfEvent) {
                        const generatedRegistryNumber = ctcNumber?.trim() || src.registryNumber || `REQ-DEATH-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
                        try {
                            await prisma.deathCertificateRequest.create({
                                data: {
                                    transactionId: id,
                                    registryNumber: generatedRegistryNumber,
                                    subjectName: subjectName,
                                    dateOfEvent: dateOfEvent,
                                    placeOfEvent: placeOfEvent,
                                    fatherName: src.fatherName || src.father || null,
                                    motherName: src.motherName || src.mother || null,
                                    issuedBy: user.name || "System Administrator",
                                    documentUrl: eCopyUrl || transaction.eCopyUrl || null,
                                    verificationId: `VER-DCR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                                }
                            });
                        } catch (createErr) {
                            console.error("Failed to create DeathCertificateRequest:", createErr);
                        }
                    }
                }
            } else if (typeCode === "LCR_DEATH_REG") {
                const drExisting = (transaction as any).deathRegistration;
                if (!drExisting && targetStatus === "RELEASED") {
                    const subjectName = additionalData.fullName || additionalData.subjectName || null;
                    const dateOfEvent = additionalData.dateOfDeath ? new Date(additionalData.dateOfDeath) : null;
                    const placeOfEvent = additionalData.placeOfDeath || null;

                    if (subjectName) {
                        const generatedRegistryNumber = additionalData.registryNumber || `DEATH-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
                        try {
                            await prisma.deathRegistration.create({
                                data: {
                                    transactionId: id,
                                    registryNumber: generatedRegistryNumber,
                                    dateOfEvent: dateOfEvent,
                                    placeOfEvent: placeOfEvent,
                                    subjectName: subjectName,
                                    fatherName: additionalData.fathersName || additionalData.fatherName || null,
                                    motherName: additionalData.mothersName || additionalData.motherName || null,
                                    issuedBy: user.name || "System Administrator",
                                    documentUrl: eCopyUrl || transaction.eCopyUrl || null
                                }
                            });
                        } catch (createErr) {
                            console.error("Failed to create DeathRegistration record:", createErr);
                        }
                    }
                }
            } else if (typeCode === "LCR_MARRIAGE_REG") {
                const mrExisting = (transaction as any).marriageRegistration;
                if (!mrExisting && targetStatus === "RELEASED") {
                    const subjectName = transaction.businessName || additionalData.subjectName || (additionalData.applicant1 && additionalData.applicant2 ? `${additionalData.applicant1.fullName} & ${additionalData.applicant2.fullName}` : null) || "Contracting Couple";
                    try {
                        await prisma.marriageRegistration.create({
                            data: {
                                transactionId: id,
                                ctcNumber: ctcNumber || null,
                                taxYear: now.getFullYear(),
                                dateIssued: now,
                                expiryDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
                                basicTax,
                                additionalTax,
                                penalty,
                                totalPaid: transaction.totalAmount,
                                issuedBy: user.name || "System Administrator",
                                businessName: subjectName,
                                documentUrl: eCopyUrl || transaction.eCopyUrl || null,
                                verificationId: `VER-MR-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                            }
                        });
                    } catch (createErr) {
                        console.error("Failed to create MarriageRegistration record:", createErr);
                    }
                }
            } else if (typeCode === "LCR_MARRIAGE_LICENSE") {
                const mlExisting = (transaction as any).marriageLicenseApplication;
                if (!mlExisting) {
                    const applicant1 = additionalData?.applicant1 || {};
                    const applicant2 = additionalData?.applicant2 || {};

                    const app1FullName = applicant1.fullName || additionalData?.app1FullName || "";
                    const app2FullName = applicant2.fullName || additionalData?.app2FullName || "";

                    const app1BirthDate = applicant1.birthDate ? new Date(applicant1.birthDate) : (additionalData?.app1BirthDate ? new Date(additionalData.app1BirthDate) : null);
                    const app2BirthDate = applicant2.birthDate ? new Date(applicant2.birthDate) : (additionalData?.app2BirthDate ? new Date(additionalData.app2BirthDate) : null);

                    const app1BirthPlace = applicant1.birthPlace || additionalData?.app1BirthPlace || null;
                    const app2BirthPlace = applicant2.birthPlace || additionalData?.app2BirthPlace || null;

                    const app1Citizenship = applicant1.citizenship || additionalData?.app1Citizenship || null;
                    const app2Citizenship = applicant2.citizenship || additionalData?.app2Citizenship || null;

                    const generatedRegistryNumber = ctcNumber?.trim() || additionalData?.registryNumber || `ML-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;

                    const expiryDate = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

                    try {
                        await prisma.marriageLicenseApplication.create({
                            data: {
                                transactionId: id,
                                registryNumber: generatedRegistryNumber,
                                dateIssued: now,
                                expiryDate: expiryDate,
                                app1FullName,
                                app1BirthDate,
                                app1BirthPlace,
                                app1Citizenship,
                                app2FullName,
                                app2BirthDate,
                                app2BirthPlace,
                                app2Citizenship,
                                documentUrl: eCopyUrl || transaction.eCopyUrl || null,
                                issuedBy: user.name || "System Administrator",
                                verificationId: `VER-ML-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                            }
                        });
                    } catch (createErr) {
                        console.error("Failed to create MarriageLicenseApplication record:", createErr);
                    }
                } else if (ctcNumber || eCopyUrl) {
                    try {
                        await prisma.marriageLicenseApplication.update({
                            where: { id: mlExisting.id },
                            data: {
                                ...(ctcNumber ? { registryNumber: ctcNumber.trim() } : {}),
                                ...(eCopyUrl ? { documentUrl: eCopyUrl } : {})
                            }
                        });
                    } catch (updateErr) {
                        console.error("Failed to update MarriageLicenseApplication record:", updateErr);
                    }
                }
            }
        }

        await prisma.transaction.update({
            where: { id },
            data: {
                status: targetStatus as any,
                additionalData: additionalData as any,
                ...(eCopyUrl ? { eCopyUrl } : {}),
                ...(orUrl ? { orUrl } : {})
            }
        });

        if (targetStatus === "RELEASED" || targetStatus === "FOR_PICKING" || targetStatus === "FOR_CLAIM") {
            await updateDeceasedResidentStatus(id);
        }

        if (transaction.user?.email) {
            const resident = transaction.residentSnapshot as any;
            await sendEmail({
                type: targetStatus as any,
                to: transaction.user.email,
                name: `${resident.firstName} ${resident.lastName}`,
                transactionId: id.slice(-8).toUpperCase(),
                amount: transaction.totalAmount,
                serviceName: transaction.type.name
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: { status: targetStatus } };
    } catch (error: any) {
        console.error("Release document error:", error);
        return { success: false, error: error?.message || "Failed to release document" };
    }
}

/**
 * Fetch all transactions relevant to Treasury (category: 'Treasurer') with pagination, sorting, search, and category filters
 */
export async function getTreasuryTransactions(params?: string | {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    serviceFilter?: string | null;
}) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden" };
        }

        // Backward compatibility: handle old string parameter and undefined
        let page = 1;
        let limit = 10;
        let search = "";
        let category = "";
        let serviceFilter: string | null = null;
        let status: string | undefined = undefined;

        if (typeof params === "string") {
            status = params;
            // Disable page limit for backward compatibility (return all rows)
            limit = 999999;
        } else if (params && typeof params === "object") {
            page = params.page || 1;
            limit = params.limit || 10;
            search = params.search || "";
            category = params.category || "";
            serviceFilter = params.serviceFilter || null;
            status = params.status;
        }

        const skip = limit === 999999 ? 0 : (page - 1) * limit;

        const where: any = {
            type: { processorRole: "TREASURY_STAFF" }
        };

        if (status && status !== "ALL") {
            if (status === "CANCELLED") {
                where.isCancelled = true;
            } else if (status === "PAID") {
                where.status = "PAID" as any;
                where.isCancelled = false;
            } else {
                where.status = status;
                where.isCancelled = false;
            }
        }

        where.NOT = [
            {
                AND: [
                    { type: { code: { startsWith: "BUSINESS_PERMIT" } } },
                    { status: { in: ["FOR_INSPECTION", "FOR_REINSPECTION"] } }
                ]
            }
        ];

        // Category filter
        if (category && category !== "ALL") {
            where.type.category = category;
        }

        // Service filter
        if (serviceFilter && serviceFilter !== "ALL") {
            if (serviceFilter === "Student") {
                where.isStudent = true;
                where.type = {
                    OR: [
                        { code: "CEDULA_IND" },
                        { code: "CEDULA_JUR" }
                    ]
                };
            } else {
                where.type = { ...where.type, name: serviceFilter };
                where.isStudent = false;
            }
        }

        // Search filter: ID, Business Name, or Resident Name inside JSON
        if (search) {
            const cleanSearch = search.trim();
            where.OR = [
                { id: { contains: cleanSearch, mode: "insensitive" } },
                { businessName: { contains: cleanSearch, mode: "insensitive" } },
                {
                    residentSnapshot: {
                        path: ["firstName"],
                        string_contains: cleanSearch
                    }
                },
                {
                    residentSnapshot: {
                        path: ["lastName"],
                        string_contains: cleanSearch
                    }
                }
            ];
        }

        const [transactions, totalCount] = await Promise.all([
            prisma.transaction.findMany({
                where,
                select: {
                    id: true,
                    status: true,
                    fulfillmentType: true,
                    paymentType: true,
                    totalAmount: true,
                    updatedAt: true,
                    createdAt: true,
                    isCancelled: true,
                    businessName: true,
                    isStudent: true,
                    processedBy: true,
                    residentSnapshot: true,
                    additionalData: true,
                    type: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            category: true,
                            requiresBusinessName: true
                        }
                    },
                    cedula: {
                        select: {
                            id: true,
                            ctcNumber: true
                        }
                    },
                    businessPermit: {
                        select: {
                            id: true,
                            permitNumber: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                take: limit === 999999 ? undefined : limit,
                skip: skip
            }),
            prisma.transaction.count({ where })
        ]);

        const normalized = (transactions as any[]).map(tx => {
            try {
                const additional = tx.additionalData || {};
                const code = tx.type?.code || "";
                if (code.startsWith("LCR_") && code.includes("MARRIAGE")) {
                    const eventDate = additional.dateOfMarriage || additional.eventDate || (additional.event && additional.event.date) || null;
                    return { ...tx, eventDate };
                }
                return tx;
            } catch {
                return tx;
            }
        });

        return { success: true, data: normalized as any[], totalCount };
    } catch (error: any) {
        console.error("Fetch treasury transactions error:", error);
        return { success: false, error: error?.message || "Failed to fetch transactions" };
    }
}
