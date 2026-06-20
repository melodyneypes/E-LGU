"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { calculateBusinessPermit } from "@/lib/business-permit";
import { sanitizeString, sanitizeUrl } from "@/lib/validation";

const isUserAdminAide = (u: any) => u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");

async function getSession() {
    return await getServerSession(authOptions);
}

function getPHTimeISOString() {
    const phOffset = 8 * 60 * 60 * 1000; // UTC+8
    const phTime = new Date(Date.now() + phOffset);
    return phTime.toISOString().replace("Z", "+08:00");
}

/**
 * Evaluate Business Permit
 */
export async function evaluateBusinessPermitTransaction(
    id: string,
    deliveryFeeOverride?: number,
    adminNotes?: string,
    bpFeeLineItems?: { label: string; amount: number }[]
) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedAdminNotes = adminNotes ? sanitizeString(adminNotes) : undefined;
        const sanitizedBpFeeLineItems = bpFeeLineItems
            ? bpFeeLineItems
                .map(item => ({
                    label: sanitizeString(item.label),
                    amount: Number(item.amount)
                }))
                .filter(item => item.label && Number.isFinite(item.amount) && item.amount > 0)
            : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const isBusinessPermit = transaction.type.code.startsWith("BUSINESS_PERMIT");
        if (!isBusinessPermit) {
            return { success: false, error: "Unsupported transaction type" };
        }

        if (isUserAdminAide(user) && !["FOR_INSPECTION", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Forbidden: Admin Aides can only process Business Permits in the inspection phase." };
        }

        const additionalData = transaction.additionalData as any;

        let dynamicDeliveryFee = transaction.type.deliveryFee;
        if (transaction.fulfillmentType === "DELIVERY" && (transaction.deliveryAddress || (transaction as any).residentSnapshot)) {
            const addr = (typeof transaction.deliveryAddress === 'string'
                ? JSON.parse(transaction.deliveryAddress || '{}')
                : transaction.deliveryAddress) || (transaction as any).residentSnapshot;

            if (addr?.barangay) {
                const brgyLogistics = await prisma.barangayInfo.findUnique({
                    where: { name: addr.barangay }
                }) as any;

                if (brgyLogistics && brgyLogistics.isLogisticsActive && brgyLogistics.deliveryFee > 0) {
                    dynamicDeliveryFee = brgyLogistics.deliveryFee;
                }
            }
        }

        let result = {
            basicTax: 0,
            additionalTax: 0,
            penalty: 0,
            deliveryFee: 0,
            totalAmount: 0
        };

        if (bpFeeLineItems !== undefined) {
            const itemsSum = sanitizedBpFeeLineItems ? sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;
            const hasItems = sanitizedBpFeeLineItems && sanitizedBpFeeLineItems.length > 0;
            const deliveryFee = (hasItems && transaction.fulfillmentType === "DELIVERY")
                ? (deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee || 0)
                : 0;
            const total = hasItems ? (itemsSum + deliveryFee) : 0;
            result = {
                basicTax: itemsSum,
                additionalTax: 0,
                penalty: 0,
                deliveryFee: deliveryFee,
                totalAmount: total
            };
        } else {
            const cap = Number(additionalData.capitalInvestment || 0);
            const sales = Number(additionalData.grossSales || 0);
            const bploCalc = calculateBusinessPermit({
                type: additionalData.businessType === "NEW" ? "NEW" : "RENEWAL",
                capitalization: cap,
                grossSales: sales,
                fulfillmentType: transaction.fulfillmentType,
                deliveryFee: deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee
            });
            result = {
                basicTax: bploCalc.baseFee,
                additionalTax: bploCalc.taxAmount,
                penalty: 0,
                deliveryFee: bploCalc.deliveryFee,
                totalAmount: bploCalc.totalAmount
            };
        }

        let newStatus = isUserAdminAide(user) ? "FOR_REQUESTING" : "EVALUATED";
        if (transaction.status === "FOR_REINSPECTION") {
            newStatus = "FOR_PROCESSING";
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: newStatus,
                totalAmount: result.totalAmount,
                processedBy: user.id,
                rejectionRemarks: sanitizedAdminNotes,
                fiscalSnapshot: {
                    basicTax: result.basicTax,
                    additionalTax: result.additionalTax,
                    penaltyCharge: result.penalty,
                    deliveryFee: result.deliveryFee,
                    totalAmount: result.totalAmount,
                    ...(sanitizedBpFeeLineItems ? { lineItems: sanitizedBpFeeLineItems } : {})
                }
            } as any,
            include: { user: true, type: true }
        }) as any;

        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            if (newStatus === "EVALUATED") {
                await sendEmail({
                    type: "FOR_PAYMENT",
                    to: updatedTransaction.user.email,
                    name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                    transactionId: sanitizedId.slice(-8).toUpperCase(),
                    amount: result.totalAmount,
                    remarks: sanitizedAdminNotes,
                    serviceName: updatedTransaction.type?.name
                });
            } else if (newStatus === "FOR_PROCESSING") {
                await sendEmail({
                    type: "PROCESSING",
                    to: updatedTransaction.user.email,
                    name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                    transactionId: sanitizedId.slice(-8).toUpperCase(),
                    remarks: sanitizedAdminNotes,
                    serviceName: updatedTransaction.type?.name || "Business Permit"
                });
            }
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/requests");
        revalidatePath(`/admin/bplo/${id}`);
        return { success: true, data: updatedTransaction, calculation: result };
    } catch (error: any) {
        console.error("Evaluate business permit error:", error);
        return { success: false, error: error?.message || "Failed to evaluate business permit." };
    }
}

/**
 * Release Business Permit
 */
export async function releaseBusinessPermit(id: string, permitNumber: string, eCopyUrl?: string, stickerNumber?: string) {
    try {
        id = sanitizeString(id);
        permitNumber = sanitizeString(permitNumber);
        eCopyUrl = eCopyUrl ? sanitizeUrl(eCopyUrl) : undefined;
        stickerNumber = stickerNumber ? sanitizeString(stickerNumber) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, error: "Forbidden: Only BPLO Administrators and Staff can release business permits." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                type: true,
                user: true,
                businessPermit: true
            }
        });

        if (!transaction || !["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid, processing, ready for claiming, or under re-inspection before release." };
        }

        if (isUserAdminAide(user) && !["FOR_INSPECTION", "FOR_PROCESSING", "PAID", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING"].includes(transaction.status as any)) {
            return { success: false, error: "Forbidden: BPLO Admins can only process Business Permits in the inspection, evaluation, processing, or release phases." };
        }

        const additionalData = transaction.additionalData as any;
        if (stickerNumber) {
            additionalData.stickerNumber = stickerNumber.trim();
        }

        const isInitialRelease = (transaction.status as any) === "FOR_PROCESSING" || (transaction.status as any) === "PAID" || (transaction.status as any) === "FOR_REINSPECTION";
        const targetStatus = isInitialRelease
            ? (transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "FOR_CLAIM")
            : "RELEASED";

        if (isInitialRelease) {
            const currentOr = transaction.orUrl;
            const currentECopy = eCopyUrl || transaction.eCopyUrl;
            if (!currentOr) {
                return { success: false, error: "Official Receipt (OR) attachment is required for Business Permits before releasing." };
            }
            if ((transaction.status as any) === "FOR_REINSPECTION" && !currentECopy) {
                return { success: false, error: "Digital E-Copy Permit is required during the Re-Inspection phase before releasing." };
            }
        }

        // NOTIFY RIDERS: If status is FOR_PICKING, alert all riders via email
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

        const now = new Date();
        const isRenewal = transaction.type.code === "BUSINESS_PERMIT_RENEW" ||
            additionalData?.businessType === "RENEWAL" ||
            additionalData?.businessType === "RENEW";
        const existingPermitNo = additionalData?.permitNumber || additionalData?.existingPermitNumber || additionalData?.existingPermitNo;

        if (!transaction.businessPermit) {
            if (!isRenewal && !permitNumber?.trim()) {
                return { success: false, error: "Permit Number is required for new business permits." };
            }
            const generatedPermitNo = (isRenewal && existingPermitNo)
                ? existingPermitNo.trim()
                : permitNumber.trim();

            additionalData.permitNumber = generatedPermitNo;

            await (prisma.businessPermit.create as any)({
                data: {
                    transactionId: id,
                    permitNumber: generatedPermitNo,
                    taxYear: now.getFullYear(),
                    dateIssued: now,
                    expiryDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
                    businessName: transaction.businessName || additionalData.businessName || "Unnamed Business",
                    tradeName: additionalData.tradeName || null,
                    orgType: additionalData.orgType || "SOLE_PROPRIETORSHIP",
                    dtiSecNumber: additionalData.dtiSecNumber || null,
                    lineOfBusiness: additionalData.lineOfBusiness || "General",
                    capitalInvestment: Number(additionalData.capitalInvestment || 0),
                    grossSales: Number(additionalData.grossSales || 0),
                    employeeCount: Number(additionalData.employeeCount ?? 0),
                    businessArea: Number(additionalData.businessArea || 0),
                    documentUrl: eCopyUrl || transaction.eCopyUrl,
                    stickerNumber: stickerNumber || additionalData.stickerNumber || null,
                    issuedBy: user.name || "System Administrator",
                    verificationId: `VER-BP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                }
            });
        } else if (permitNumber || eCopyUrl || stickerNumber) {
            if (permitNumber && !isRenewal) {
                additionalData.permitNumber = permitNumber.trim();
            }

            await (prisma.businessPermit.update as any)({
                where: { id: transaction.businessPermit.id },
                data: {
                    ...((permitNumber && !isRenewal) ? { permitNumber: permitNumber.trim() } : {}),
                    ...(eCopyUrl ? { documentUrl: eCopyUrl } : {}),
                    ...(stickerNumber ? { stickerNumber: stickerNumber.trim() } : {})
                }
            });
        }

        // Update transaction status
        await prisma.transaction.update({
            where: { id },
            data: {
                status: targetStatus as any,
                additionalData: {
                    ...additionalData,
                    releasedAt: targetStatus === "FOR_PICKING" || targetStatus === "FOR_CLAIM" ? getPHTimeISOString() : undefined
                },
                eCopyUrl: eCopyUrl || transaction.eCopyUrl,
                updatedAt: new Date()
            }
        });

        // Trigger email notification for the NEW status
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
        console.error("Release business permit error:", error);
        return { success: false, error: error?.message || "Failed to release business permit." };
    }
}
