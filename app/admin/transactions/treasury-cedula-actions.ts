"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { calculateCedula } from "@/lib/cedula";
import { sanitizeString, sanitizeUrl } from "@/lib/validation";
import { updateDeceasedResidentStatus } from "./death-regis-actions";
import { clearCategoryRejection } from "@/lib/transactions/rejection-tracker";
import { getMultipleSystemSettings } from "@/lib/settings";

const isUserAdminAide = (u: any) => u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");

async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Hyper-optimized fast Cedula document release action for Treasury.
 * Eliminates full-table scans, heavy unneeded LCR relation includes, and blocking background tasks.
 */
export async function releaseCedulaFast(
    id: string,
    ctcNumber: string,
    eCopyUrl?: string,
    orUrl?: string
) {
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

        // Fast selective query without heavy LCR joins
        const transaction = await prisma.transaction.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true,
                status: true,
                totalAmount: true,
                fulfillmentType: true,
                paymentType: true,
                additionalData: true,
                businessName: true,
                eCopyUrl: true,
                residentSnapshot: true,
                type: {
                    select: {
                        code: true,
                        name: true,
                        category: true,
                        baseFee: true,
                        deliveryFee: true
                    }
                },
                user: {
                    select: {
                        email: true,
                        name: true
                    }
                },
                cedula: {
                    select: {
                        id: true,
                        ctcNumber: true
                    }
                }
            }
        });

        if (!transaction || !["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid, processing, ready for claiming, or under re-inspection before release" };
        }

        const additionalData = (transaction.additionalData as any) || {};

        // Fast cached system settings fetch (Zero full-table scans)
        const settings = await getMultipleSystemSettings([
            "cedula_basic_tax_individual",
            "cedula_basic_tax_juridical",
            "cedula_additional_tax_rate_individual",
            "cedula_additional_tax_rate_juridical",
            "cedula_cap_individual",
            "cedula_cap_juridical",
            "cedula_penalty_rate_monthly"
        ]);
        const settingsMap: Record<string, string> = {};
        settings.forEach((val, key) => {
            settingsMap[key] = val;
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

        const basicTax = calc.basicTax;
        const additionalTax = calc.additionalTax;
        const penalty = calc.penalty;
        const targetStatus: any = "RELEASED";

        if (ctcNumber) {
            const existingCedula = await prisma.cedula.findUnique({
                where: { ctcNumber },
                select: { id: true, transactionId: true }
            });
            if (existingCedula && existingCedula.transactionId !== id) {
                return { success: false, error: `CTC Number ${ctcNumber} is already used by another request.` };
            }
        }

        const now = new Date();

        if (!transaction.cedula) {
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

        // Update transaction status to RELEASED
        await prisma.transaction.update({
            where: { id },
            data: {
                status: targetStatus as any,
                additionalData: additionalData as any,
                fiscalSnapshot: {
                    basicTax,
                    additionalTax,
                    penaltyCharge: penalty,
                    deliveryFee: calc.deliveryFee,
                    totalAmount: transaction.totalAmount,
                    paidAt: now.toISOString(),
                    settledBy: user.name || user.email || "Treasury Staff"
                },
                ...(eCopyUrl ? { eCopyUrl } : {}),
                ...(orUrl ? { orUrl } : {})
            }
        });

        // Fast non-blocking background tasks
        if (targetStatus === "RELEASED" || targetStatus === "FOR_PICKING" || targetStatus === "FOR_CLAIM") {
            updateDeceasedResidentStatus(id).catch(err => console.error("Deceased resident update error:", err));
            if (transaction.userId) {
                const categoryName = transaction.type?.category || "CEDULA";
                clearCategoryRejection(transaction.userId, categoryName).catch(err => console.error("Rejection clear error:", err));
            }
        }

        if (transaction.user?.email) {
            const resident = (transaction.residentSnapshot as any) || {};
            sendEmail({
                type: targetStatus as any,
                to: transaction.user.email,
                name: `${resident.firstName || ""} ${resident.lastName || ""}`.trim() || transaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                amount: transaction.totalAmount,
                serviceName: transaction.type.name
            }).catch(err => console.error("Background email send error:", err));
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");

        return { success: true, data: { status: targetStatus } };
    } catch (error: any) {
        console.error("Fast release Cedula error:", error);
        return { success: false, error: error?.message || "Failed to release Cedula document" };
    }
}

interface ProcessCedulaOnsiteParams {
    transactionId: string;
    totalDue?: number;
    paymentMethod?: string;
    paymentReference?: string;
    amountTendered?: number;
    ctcNumber?: string;
    remarks?: string;
    orSeriesNumber?: string;
    declaredGross?: number;
}

/**
 * Hyper-optimized single-pass action for "Mark as Paid & Released" in Treasury for Cedula.
 * Combines payment confirmation & Cedula document release into 1 fast database execution.
 */
export async function processCedulaOnsitePaymentAndRelease(params: ProcessCedulaOnsiteParams) {
    try {
        const transactionId = sanitizeString(params.transactionId);
        const ctcNumber = params.ctcNumber ? sanitizeString(params.ctcNumber) : "";
        const remarks = params.remarks ? sanitizeString(params.remarks) : "";
        const orSeriesNumber = params.orSeriesNumber ? sanitizeString(params.orSeriesNumber) : "";

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            select: {
                id: true,
                userId: true,
                status: true,
                totalAmount: true,
                fulfillmentType: true,
                paymentType: true,
                paymentReference: true,
                additionalData: true,
                businessName: true,
                eCopyUrl: true,
                residentSnapshot: true,
                type: {
                    select: {
                        code: true,
                        name: true,
                        category: true,
                        baseFee: true,
                        deliveryFee: true
                    }
                },
                user: {
                    select: {
                        email: true,
                        name: true
                    }
                },
                cedula: {
                    select: {
                        id: true,
                        ctcNumber: true
                    }
                }
            }
        });

        if (!transaction) {
            return { success: false, error: "Transaction not found" };
        }

        if (ctcNumber) {
            const existingCedula = await prisma.cedula.findUnique({
                where: { ctcNumber },
                select: { id: true, transactionId: true }
            });
            if (existingCedula && existingCedula.transactionId !== transactionId) {
                return { success: false, error: `CTC Number ${ctcNumber} is already used by another request.` };
            }
        }

        const currentAdditional = (transaction.additionalData as any) || {};
        const updatedTotalAmount = params.totalDue !== undefined ? params.totalDue : transaction.totalAmount;
        const effectiveIncome = params.declaredGross !== undefined ? Number(params.declaredGross) : Number(currentAdditional.income || 0);

        // Fast cached system settings fetch (Zero full-table scans)
        const settings = await getMultipleSystemSettings([
            "cedula_basic_tax_individual",
            "cedula_basic_tax_juridical",
            "cedula_additional_tax_rate_individual",
            "cedula_additional_tax_rate_juridical",
            "cedula_cap_individual",
            "cedula_cap_juridical",
            "cedula_penalty_rate_monthly"
        ]);
        const settingsMap: Record<string, string> = {};
        settings.forEach((val, key) => {
            settingsMap[key] = val;
        });

        const calc = calculateCedula({
            type: currentAdditional.applicantType || "INDIVIDUAL",
            income: effectiveIncome,
            propertyValue: currentAdditional.propertyValue || 0,
            fulfillmentType: transaction.fulfillmentType,
            deliveryFee: transaction.type.deliveryFee,
            baseFee: transaction.type.baseFee,
            settings: settingsMap
        });

        const updatedAdditionalData = {
            ...currentAdditional,
            income: effectiveIncome,
            calculatedTax: {
                basicTax: calc.basicTax,
                additionalTax: calc.additionalTax,
                penalty: calc.penalty,
                totalAmount: updatedTotalAmount
            },
            ...(remarks && { treasuryRemarks: remarks }),
            ...(orSeriesNumber && { orSeriesNumber })
        };

        const paymentMethod = params.paymentMethod || "CASH";
        let mappedPaymentType: any = transaction.paymentType || "CASH";
        const methodUpper = paymentMethod.toUpperCase();
        if (methodUpper === "CASH") mappedPaymentType = "CASH";
        else if (methodUpper === "GCASH" || methodUpper === "QR" || methodUpper === "E_PAYMENT") mappedPaymentType = "E_PAYMENT";
        else if (methodUpper === "LANDBANK" || methodUpper === "BANK_TRANSFER") mappedPaymentType = "BANK_TRANSFER";

        const isCash = mappedPaymentType === "CASH";
        const refNo = isCash
            ? null
            : (params.paymentReference ? sanitizeString(params.paymentReference) : (currentAdditional.referenceNo || transaction.paymentReference || `manual_${transactionId}`));

        const now = new Date();

        // Perform all DB mutations in 1 single fast transaction
        await prisma.$transaction(async (tx) => {
            // 1. Update Transaction to RELEASED
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: "RELEASED",
                    isPaid: true,
                    totalAmount: updatedTotalAmount,
                    paymentType: mappedPaymentType,
                    paymentReference: refNo,
                    additionalData: updatedAdditionalData,
                    fiscalSnapshot: {
                        basicTax: calc.basicTax,
                        additionalTax: calc.additionalTax,
                        penaltyCharge: calc.penalty,
                        deliveryFee: calc.deliveryFee,
                        totalAmount: updatedTotalAmount,
                        paidAt: now.toISOString(),
                        settledBy: user.name || user.email || "Treasury Staff",
                        orNumber: orSeriesNumber || null
                    },
                    updatedAt: now
                }
            });

            // 2. Upsert Payment
            await tx.payment.upsert({
                where: { transactionId },
                update: {
                    amount: updatedTotalAmount,
                    method: mappedPaymentType,
                    status: "PAID",
                    reference: refNo,
                    orNumber: orSeriesNumber || undefined,
                    meta: {
                        source: "treasury_onsite_release",
                        releasedBy: user.name || user.email || "Treasury Staff"
                    }
                },
                create: {
                    transactionId,
                    amount: updatedTotalAmount,
                    method: mappedPaymentType,
                    status: "PAID",
                    reference: refNo,
                    orNumber: orSeriesNumber || undefined,
                    meta: {
                        source: "treasury_onsite_release",
                        releasedBy: user.name || user.email || "Treasury Staff"
                    }
                }
            });

            // 3. Create or update Cedula Certificate record
            if (!transaction.cedula) {
                await tx.cedula.create({
                    data: {
                        transactionId,
                        ctcNumber: ctcNumber || null,
                        taxYear: now.getFullYear(),
                        dateIssued: now,
                        expiryDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
                        basicTax: calc.basicTax,
                        additionalTax: calc.additionalTax,
                        penalty: calc.penalty,
                        totalPaid: updatedTotalAmount,
                        issuedBy: user.name || "System Administrator",
                        businessName: transaction.businessName || currentAdditional.businessName || null,
                        documentUrl: transaction.eCopyUrl,
                        verificationId: `VER-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                    }
                });
            } else {
                await tx.cedula.update({
                    where: { id: transaction.cedula.id },
                    data: {
                        ...(ctcNumber ? { ctcNumber } : {}),
                        basicTax: calc.basicTax,
                        additionalTax: calc.additionalTax,
                        penalty: calc.penalty,
                        totalPaid: updatedTotalAmount
                    }
                });
            }
        });

        // Background non-blocking tasks
        if (transaction.userId) {
            clearCategoryRejection(transaction.userId, "CEDULA").catch(err => console.error("Rejection clear error:", err));
        }

        if (transaction.user?.email) {
            const resident = (transaction.residentSnapshot as any) || {};
            sendEmail({
                type: "RELEASED",
                to: transaction.user.email,
                name: `${resident.firstName || ""} ${resident.lastName || ""}`.trim() || transaction.user.name || "Resident",
                transactionId: transactionId.slice(-8).toUpperCase(),
                amount: updatedTotalAmount,
                serviceName: transaction.type.name
            }).catch(err => console.error("Background email send error:", err));
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");

        return { success: true };
    } catch (error: any) {
        console.error("Fast process Cedula payment & release error:", error);
        return { success: false, error: error?.message || "Failed to process Cedula payment and release" };
    }
}
