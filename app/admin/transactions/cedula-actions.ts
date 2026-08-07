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
import { clearCategoryRejection } from "@/lib/transactions/rejection-tracker";

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
            isPaid: nextStatus === "PAID" ? true : (transaction as any).isPaid,
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
                    reference: sanitizedReferenceNo || updatedTransaction.paymentReference || `manual_${sanitizedId}`,
                    meta: {
                        source: "treasury_confirmation",
                        releasedBy: user.name || user.email || "Treasury Staff"
                    }
                },
                create: {
                    transactionId: sanitizedId,
                    amount: Number(updatedTransaction.totalAmount || 0),
                    method: updatedTransaction.paymentType || "CASH",
                    status: "PAID",
                    reference: sanitizedReferenceNo || updatedTransaction.paymentReference || `manual_${sanitizedId}`,
                    meta: {
                        source: "treasury_confirmation",
                        releasedBy: user.name || user.email || "Treasury Staff"
                    }
                }
            });
        }

        if (nextStatus === "PAID" && updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            sendEmail({
                type: "PAID",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Service",
                amount: updatedTransaction.totalAmount || 0
            }).catch(err => console.error("Background email send error:", err));
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

        const paymentMethod = formData.get("paymentMethod") as string;
        const paymentReferenceInput = formData.get("paymentReference") as string;

        let mappedPaymentType: any = transaction.paymentType;
        if (paymentMethod) {
            const methodUpper = paymentMethod.toUpperCase();
            if (methodUpper === "CASH") mappedPaymentType = "CASH";
            else if (methodUpper === "GCASH" || methodUpper === "QR" || methodUpper === "E_PAYMENT") mappedPaymentType = "E_PAYMENT";
            else if (methodUpper === "LANDBANK" || methodUpper === "BANK_TRANSFER") mappedPaymentType = "BANK_TRANSFER";
        }

        const updatedTransaction = await (prisma.transaction.update as any)({
            where: { id: sanitizedId },
            data: {
                status: "PAID",
                paymentType: mappedPaymentType,
                paymentReference: paymentReferenceInput ? sanitizeString(paymentReferenceInput) : transaction.paymentReference,
                isPaid: true,
                updatedAt: new Date(),
                additionalData: updatedAdditionalData
            } as any,
            include: { user: true, type: true }
        }) as any;

        const isCash = mappedPaymentType === "CASH";
        const paymentReference = isCash
            ? null
            : (paymentReferenceInput ? sanitizeString(paymentReferenceInput) :
                (currentAdditionalData.gcashReferenceNo ||
                    currentAdditionalData.referenceNo ||
                    transaction.paymentReference ||
                    `manual_${sanitizedId}`));

        await (prisma.payment.upsert as any)({
            where: { transactionId: sanitizedId },
            update: {
                amount: formData.get("amountPaid") ? Number(formData.get("amountPaid")) : Number(updatedTransaction.totalAmount || 0),
                method: updatedTransaction.paymentType || "CASH",
                status: "PAID",
                reference: paymentReference ? String(paymentReference) : null,
                orNumber: orSeriesNumber ? sanitizeString(orSeriesNumber) : undefined,
                meta: {
                    source: "treasury_confirmation",
                    releasedBy: user.name || user.email || "Treasury Staff",
                    ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
                    ...(orDocumentUrl && { orDocumentUrl })
                }
            } as any,
            create: {
                transactionId: sanitizedId,
                amount: formData.get("amountPaid") ? Number(formData.get("amountPaid")) : Number(updatedTransaction.totalAmount || 0),
                method: updatedTransaction.paymentType || "CASH",
                status: "PAID",
                reference: paymentReference ? String(paymentReference) : null,
                orNumber: orSeriesNumber ? sanitizeString(orSeriesNumber) : undefined,
                meta: {
                    source: "treasury_confirmation",
                    releasedBy: user.name || user.email || "Treasury Staff",
                    ...(treasuryReceiptUrl && { treasuryReceiptUrl }),
                    ...(orDocumentUrl && { orDocumentUrl })
                }
            } as any
        });

        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            sendEmail({
                type: "PAID",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Service",
                amount: updatedTransaction.totalAmount || 0
            }).catch(err => console.error("Background email send error:", err));
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

        const settingsList = await prisma.systemSetting.findMany();
        const settingsMap: Record<string, string> = {};
        settingsList.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        const calc = calculateCedula({
            type: additionalData.applicantType || "INDIVIDUAL",
            income: additionalData.income || 0,
            propertyValue: additionalData.propertyValue || 0,
            fulfillmentType: transaction.fulfillmentType,
            deliveryFee: transaction.type.deliveryFee,
            baseFee: transaction.type.baseFee,
            settings: settingsMap
        });
        basicTax = calc.basicTax;
        additionalTax = calc.additionalTax;
        penalty = calc.penalty;

        const targetStatus: any = "RELEASED";

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
            if (transaction.userId) {
                const categoryName = transaction.type?.category || "CEDULA";
                await clearCategoryRejection(transaction.userId, categoryName);
            }
        }

        if (transaction.user?.email) {
            const resident = transaction.residentSnapshot as any;
            sendEmail({
                type: targetStatus as any,
                to: transaction.user.email,
                name: `${resident.firstName} ${resident.lastName}`,
                transactionId: id.slice(-8).toUpperCase(),
                amount: transaction.totalAmount,
                serviceName: transaction.type.name
            }).catch(err => console.error("Background email send error:", err));
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
    lcrSubCategory?: string;
    ledgerType?: string;
}) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        const userDepartment = (user?.department || "").toUpperCase();
        const isRegistrarUser = userDepartment === "REGISTRAR" || userDepartment === "CIVIL_REGISTRY";

        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && user.role !== "REGISTRAR" && !isRegistrarUser)) {
            return { success: false, error: "Forbidden" };
        }

        // Backward compatibility: handle old string parameter and undefined
        let page = 1;
        let limit = 10;
        let search = "";
        let category = "";
        let serviceFilter: string | null = null;
        let status: string | undefined = undefined;
        let lcrSubCategory: string | undefined = undefined;
        let ledgerType: string | undefined = undefined;

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
            lcrSubCategory = params.lcrSubCategory;
            ledgerType = params.ledgerType;
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

        const lcrUnionFilter = {
            OR: [
                { type: { category: "Civil Registry" } },
                { type: { code: { startsWith: "LCR_" } } },
                { type: { code: { startsWith: "CIVIL_REGISTRY" } } }
            ]
        };

        const engineeringPermitFilter = {
            OR: [
                { type: { code: { startsWith: "BUILDING_PERMIT" } } },
                { type: { code: { startsWith: "OCCUPANCY_PERMIT" } } },
                { type: { name: { contains: "BUILDING PERMIT", mode: "insensitive" } } },
                { type: { name: { contains: "OCCUPANCY PERMIT", mode: "insensitive" } } }
            ]
        };

        const bpBusinessFilter = {
            OR: [
                { type: { code: { startsWith: "BUSINESS_PERMIT" } } },
                { type: { name: { contains: "BUSINESS PERMIT", mode: "insensitive" } } }
            ]
        };

        if (!ledgerType) {
            where.AND = [
                {
                    NOT: [
                        {
                            AND: [
                                { type: { code: { startsWith: "BUSINESS_PERMIT" } } },
                                { status: { in: ["FOR_INSPECTION", "FOR_REINSPECTION"] } }
                            ]
                        }
                    ]
                },
                // Civil Registry Conditions
                {
                    OR: [
                        { NOT: lcrUnionFilter },
                        {
                            AND: [
                                lcrUnionFilter,
                                {
                                    OR: [
                                        // For non-appointment LCRs: allow FOR_REQUESTING, PAID, UNPAID, FOR_PROCESSING
                                        {
                                            AND: [
                                                { type: { code: { notIn: ["LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"] } } },
                                                { status: { in: ["FOR_REQUESTING", "PAID", "UNPAID", "FOR_PROCESSING"] } }
                                            ]
                                        },
                                        // For appointment LCRs: Registrar sees FOR_REQUESTING, EVALUATED, FOR_PROCESSING, FOR_CLAIM, FOR_PICKING
                                        {
                                            AND: [
                                                { type: { code: { in: ["LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"] } } },
                                                {
                                                    status: {
                                                        in: isRegistrarUser
                                                            ? ["FOR_REQUESTING", "EVALUATED", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING"]
                                                            : ["PAID", "UNPAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING"]
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                // Building Permit Conditions
                {
                    OR: [
                        { NOT: engineeringPermitFilter },
                        {
                            AND: [
                                engineeringPermitFilter,
                                { status: { in: ["EVALUATED", "UNPAID", "PAID", "REJECTED"] } }
                            ]
                        }
                    ]
                },
                // Business Permit Conditions
                {
                    OR: [
                        { NOT: bpBusinessFilter },
                        {
                            AND: [
                                bpBusinessFilter,
                                { status: { in: ["FOR_REQUESTING", "EVALUATED", "PAID", "UNPAID"] } }
                            ]
                        }
                    ]
                },
                {
                    OR: [
                        { NOT: engineeringPermitFilter },
                        {
                            NOT: {
                                AND: [
                                    engineeringPermitFilter,
                                    { status: "EVALUATED" },
                                    {
                                        NOT: {
                                            additionalData: {
                                                path: ["zoningStatus"],
                                                string_contains: "EVALUATED"
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            ];
        }

        // Category filter
        if (category && category !== "ALL") {
            const mappedCat = (category === "Real Property Tax" || category === "RealPropertyTax") ? "RPT" : category;
            where.type.category = mappedCat;
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

        // LCR Sub-category filter mapping
        if (lcrSubCategory) {
            if (lcrSubCategory === "Birth Registration") {
                where.type = { ...where.type, code: "LCR_BIRTH_REG" };
            } else if (lcrSubCategory === "Birth Certificate") {
                where.type = { ...where.type, code: "LCR_BIRTH" };
            } else if (lcrSubCategory === "Death Registration") {
                where.type = { ...where.type, code: "LCR_DEATH_REG" };
                where.status = { not: "FOR_REQUESTING" };
            } else if (lcrSubCategory === "Death Certificate") {
                where.type = { ...where.type, code: "LCR_DEATH" };
            } else if (lcrSubCategory === "Marriage License") {
                where.type = { ...where.type, code: "LCR_MARRIAGE_LICENSE" };
                where.status = { not: "FOR_REQUESTING" };
            } else if (lcrSubCategory === "Marriage Registration") {
                where.type = { ...where.type, code: "LCR_MARRIAGE_REG" };
            } else if (lcrSubCategory === "Marriage Certificate") {
                where.type = { ...where.type, code: "LCR_MARRIAGE" };
            } else if (lcrSubCategory === "PSA Endorsement") {
                where.type = {
                    ...where.type,
                    code: {
                        in: [
                            "LCR_PSA_ENDORSEMENT",
                            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                            "LCR_DEATH_PSA_ENDORSEMENT",
                            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                            "LCR_MARRIAGE_PSA_ENDORSEMENT",
                            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                        ]
                    }
                };
                where.status = {
                    notIn: isRegistrarUser
                        ? ["RELEASED", "DELIVERED", "UNPAID"]
                        : ["RELEASED", "DELIVERED", "FOR_REQUESTING"]
                };
                if (isRegistrarUser) {
                    where.AND = [
                        ...(where.AND || []),
                        {
                            NOT: {
                                AND: [
                                    { type: { code: { in: ["LCR_DEATH_PSA_ENDORSEMENT", "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT"] } } },
                                    { status: { in: ["UNPAID", "RELEASED", "DELIVERED"] } }
                                ]
                            }
                        }
                    ];
                }
            } else if (lcrSubCategory === "PSA Appt. Endorsement") {
                where.type = {
                    ...where.type,
                    code: {
                        in: [
                            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                        ]
                    }
                };
                where.status = {
                    notIn: isRegistrarUser
                        ? ["RELEASED", "DELIVERED", "UNPAID"]
                        : ["RELEASED", "DELIVERED", "FOR_REQUESTING"]
                };
                if (isRegistrarUser) {
                    where.AND = [
                        ...(where.AND || []),
                        {
                            NOT: {
                                AND: [
                                    { type: { code: { in: ["LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT"] } } },
                                    { status: { in: ["UNPAID", "RELEASED", "DELIVERED"] } }
                                ]
                            }
                        }
                    ];
                }
            }
        }
        if (ledgerType) {
            where.status = { in: ["UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED"] };
            where.isCancelled = false;

            if (ledgerType === "BIRTH") {
                where.type = {
                    ...where.type,
                    code: { in: ["LCR_BIRTH_REG", "LCR_BIRTH"] }
                };
            } else if (ledgerType === "DEATH") {
                where.type = {
                    ...where.type,
                    code: { in: ["LCR_DEATH_REG", "LCR_DEATH"] }
                };
            } else if (ledgerType === "MARRIAGE") {
                where.type = {
                    ...where.type,
                    code: { in: ["LCR_MARRIAGE_REG", "LCR_MARRIAGE", "LCR_MARRIAGE_LICENSE"] }
                };
            } else if (ledgerType === "PSA") {
                where.type = {
                    ...where.type,
                    code: {
                        in: [
                            "LCR_PSA_ENDORSEMENT",
                            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                            "LCR_DEATH_PSA_ENDORSEMENT",
                            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
                            "LCR_MARRIAGE_PSA_ENDORSEMENT",
                            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
                        ]
                    }
                };
            }
        }

        // Search filter: ID, Business Name, or Resident Name inside JSON
        if (search) {
            const cleanSearch = search.trim();
            where.OR = [
                { id: { contains: cleanSearch, mode: "insensitive" } },
                { businessName: { contains: cleanSearch, mode: "insensitive" } },
                {
                    user: {
                        residentProfile: {
                            OR: [
                                { firstName: { contains: cleanSearch, mode: "insensitive" } },
                                { lastName: { contains: cleanSearch, mode: "insensitive" } }
                            ]
                        }
                    }
                },
                {
                    residentSnapshot: {
                        path: ["firstName"],
                        string_contains: cleanSearch
                    }
                },
                {
                    residentSnapshot: {
                        path: ["firstName"],
                        string_contains: cleanSearch.toUpperCase()
                    }
                },
                {
                    residentSnapshot: {
                        path: ["firstName"],
                        string_contains: cleanSearch.toLowerCase()
                    }
                },
                {
                    residentSnapshot: {
                        path: ["lastName"],
                        string_contains: cleanSearch
                    }
                },
                {
                    residentSnapshot: {
                        path: ["lastName"],
                        string_contains: cleanSearch.toUpperCase()
                    }
                },
                {
                    residentSnapshot: {
                        path: ["lastName"],
                        string_contains: cleanSearch.toLowerCase()
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
                    residentSnapshot: true,
                    additionalData: true,
                    processedBy: true,
                    type: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            category: true,
                            requiresBusinessName: true
                        }
                    },
                    user: {
                        select: {
                            name: true,
                            email: true
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

/**
 * Consolidated Onsite Payment and Release Action.
 * Runs evaluation, payment confirmation, and document release in a single server call.
 */
export async function processOnsitePaymentAndReleaseAction(params: {
    transactionId: string;
    typeCode: string;
    isStudent: boolean;
    deliveryFee: number;
    remarks: string;
    itemsToSend?: { label: string; amount: number }[];
    registryBookVerification?: string;
    orSeriesNumber?: string;
    miscFee?: number;
    paymentMethod: string;
    amountTendered?: number;
    paymentReference?: string;
    totalDue: number;
    ctcNumber?: string;
}) {
    try {
        const {
            transactionId,
            typeCode,
            isStudent,
            deliveryFee,
            remarks,
            itemsToSend,
            registryBookVerification,
            orSeriesNumber,
            miscFee,
            paymentMethod,
            amountTendered,
            paymentReference,
            totalDue,
            ctcNumber
        } = params;

        // 1. Run evaluation logic
        let evalRes;
        if (isStudent) {
            const { evaluateStudentCedulaTransaction } = await import("./student-actions");
            evalRes = await evaluateStudentCedulaTransaction(transactionId, deliveryFee, remarks, itemsToSend, registryBookVerification, "", orSeriesNumber);
        } else if (typeCode === "LCR_DEATH") {
            const { evaluateDeathCertificateTransaction } = await import("./death-cert-actions");
            evalRes = await evaluateDeathCertificateTransaction(transactionId, deliveryFee, remarks, itemsToSend, registryBookVerification, "", orSeriesNumber, miscFee);
        } else if (typeCode === "LCR_MARRIAGE_REG") {
            const { evaluateMarriageRegistrationTransaction } = await import("./marriage-regis-actions");
            evalRes = await evaluateMarriageRegistrationTransaction(transactionId, deliveryFee, remarks, itemsToSend, registryBookVerification, "", orSeriesNumber, miscFee, true);
        } else if (typeCode === "LCR_MARRIAGE_LICENSE") {
            const { evaluateMarriageLicenseTransaction } = await import("./marriage-license-actions");
            evalRes = await evaluateMarriageLicenseTransaction(transactionId, deliveryFee, remarks, itemsToSend, registryBookVerification, "", orSeriesNumber, miscFee);
        } else {
            const { evaluateCedulaTransaction } = await import("./actions");
            evalRes = await evaluateCedulaTransaction(transactionId, deliveryFee, remarks, itemsToSend, registryBookVerification, "", orSeriesNumber, miscFee);
        }

        if (!evalRes.success) {
            return { success: false, error: evalRes.error || "Evaluation failed" };
        }

        // 2. Build payment confirmation formData
        const formData = new FormData();
        formData.append("id", transactionId);
        formData.append("paymentMethod", paymentMethod);

        let paymentRemarks = remarks || "";
        if (paymentMethod === "CASH" && amountTendered !== undefined) {
            const changeAmt = Math.max(0, amountTendered - totalDue);
            paymentRemarks = `[Onsite Cash Payment] Tendered: ₱${amountTendered.toFixed(2)} | Change: ₱${changeAmt.toFixed(2)}${remarks ? ` | Remarks: ${remarks}` : ""}`;
        } else {
            paymentRemarks = `[Onsite ${paymentMethod} Payment]${remarks ? ` | Remarks: ${remarks}` : ""}`;
        }
        formData.append("remarks", paymentRemarks);
        if (orSeriesNumber) formData.append("orSeriesNumber", orSeriesNumber);
        if (paymentReference) formData.append("paymentReference", paymentReference);

        const confirmRes = await confirmTransactionPaymentWithReceipt(formData);
        if (!confirmRes.success) {
            return { success: false, error: confirmRes.error || "Payment confirmation failed" };
        }

        // 3. Transition to processing / release
        let releaseRes;
        if (typeCode === "LCR_BIRTH") {
            const { releaseBirthCertificate } = await import("./birth-cert-actions");
            releaseRes = await releaseBirthCertificate(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_BIRTH_REG") {
            const { releaseBirthRegistry } = await import("./birth-regis-actions");
            releaseRes = await releaseBirthRegistry(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_DEATH") {
            const { releaseDeathCertificate } = await import("./death-cert-actions");
            releaseRes = await releaseDeathCertificate(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_DEATH_REG") {
            const { releaseDeathRegistry } = await import("./death-regis-actions");
            releaseRes = await releaseDeathRegistry(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_MARRIAGE_REG") {
            const { releaseMarriageRegistry } = await import("./marriage-regis-actions");
            releaseRes = await releaseMarriageRegistry(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_MARRIAGE_LICENSE") {
            const { releaseMarriageLicense } = await import("./marriage-license-actions");
            releaseRes = await releaseMarriageLicense(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_MARRIAGE_PSA_ENDORSEMENT") {
            const { releaseMarriagePsaEndorsement } = await import("./marriage-endorsement-actions");
            releaseRes = await releaseMarriagePsaEndorsement(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_PSA_ENDORSEMENT") {
            const { releaseBirthPsaEndorsement } = await import("./birth-endorsement-actions");
            releaseRes = await releaseBirthPsaEndorsement(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else if (typeCode === "LCR_DEATH_PSA_ENDORSEMENT") {
            const { releaseDeathPsaEndorsement } = await import("./death-endorsement-actions");
            releaseRes = await releaseDeathPsaEndorsement(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        } else {
            releaseRes = await releaseCedula(transactionId, ctcNumber || "", undefined, (confirmRes.data?.additionalData as any)?.orDocumentUrl);
        }

        if (!releaseRes.success) {
            return { success: false, error: releaseRes.error || "Release/Processing transition failed" };
        }

        // 4. Clear counterName from transaction.additionalData so it removes from active serving list
        try {
            const currentTx = await prisma.transaction.findUnique({
                where: { id: transactionId },
                select: { additionalData: true }
            });
            const currentAddData = (currentTx?.additionalData as Record<string, any>) || {};
            delete currentAddData.counterName;
            delete currentAddData.counter;

            await prisma.transaction.update({
                where: { id: transactionId },
                data: { additionalData: currentAddData }
            });
        } catch (cleanupErr) {
            console.error("Non-fatal: Error clearing counter queue data:", cleanupErr);
        }

        return { success: true, data: confirmRes.data };
    } catch (error: any) {
        console.error("processOnsitePaymentAndReleaseAction error:", error);
        return { success: false, error: error?.message || "Failed to process payment and release" };
    }
}

export async function getCedulaSettings() {
    try {
        const settingsList = await prisma.systemSetting.findMany({
            where: {
                key: {
                    in: [
                        "cedula_basic_tax_individual",
                        "cedula_basic_tax_juridical",
                        "cedula_additional_tax_rate_individual",
                        "cedula_additional_tax_rate_juridical",
                        "cedula_cap_individual",
                        "cedula_cap_juridical",
                        "cedula_penalty_rate_monthly"
                    ]
                }
            }
        });

        const settingsMap: Record<string, string> = {};
        settingsList.forEach(s => {
            settingsMap[s.key] = s.value;
        });

        return { success: true, data: settingsMap };
    } catch (err: any) {
        console.error("Error loading Cedula settings:", err);
        return { success: false, error: err.message || "Failed to load settings" };
    }
}
