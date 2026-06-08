"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { sanitizeString, sanitizeUrl } from "@/lib/validation";

const isUserAdminAide = (u: any) => u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");

async function getSession() {
    return await getServerSession(authOptions);
}

export async function releaseDeathCertificate(id: string, registryNumber: string, eCopyUrl?: string, orUrl?: string, registryBookVerification?: string, verificationDocUrl?: string) {
    try {
        id = sanitizeString(id);
        registryNumber = sanitizeString(registryNumber);
        eCopyUrl = eCopyUrl ? sanitizeUrl(eCopyUrl) : undefined;
        orUrl = orUrl ? sanitizeUrl(orUrl) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER" && user.role !== "REGISTRAR")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                type: true,
                user: true,
                deathCertificateRequest: true
            }
        });

        if (!transaction || !["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid, processing, ready for claiming, or under re-inspection before release" };
        }

        const additionalData = (transaction.additionalData as any) || {};
        if (registryBookVerification) {
            additionalData.registryBookVerification = registryBookVerification;
        }
        if (verificationDocUrl) {
            additionalData.scannedDocUrl = verificationDocUrl;
        }
        const isInitialRelease = (transaction.status as any) === "FOR_PROCESSING" || (transaction.status as any) === "PAID" || (transaction.status as any) === "FOR_REINSPECTION";

        const targetStatus = (transaction.status as any) === "PAID"
            ? "FOR_REINSPECTION"
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

        const dcrExisting = (transaction as any).deathCertificateRequest;
        if (!dcrExisting && targetStatus === "RELEASED") {
            const src: any = additionalData || {};
            const subjectName = src.subjectName || src.fullName || null;
            const dateOfEvent = src.dateOfEvent ? new Date(src.dateOfEvent) : null;
            const placeOfEvent = src.placeOfEvent || null;

            if (subjectName && dateOfEvent && placeOfEvent) {
                const generatedRegistryNumber = registryNumber?.trim() || src.registryNumber || `REQ-DEATH-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
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

        await prisma.transaction.update({
            where: { id },
            data: {
                status: targetStatus as any,
                additionalData: additionalData as any,
                ...(eCopyUrl ? { eCopyUrl } : {}),
                ...(orUrl ? { orUrl } : {})
            }
        });

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
        console.error("Release death certificate error:", error);
        return { success: false, error: error?.message || "Failed to release death certificate." };
    }
}

export async function evaluateDeathCertificateTransaction(
    id: string,
    deliveryFeeOverride?: number,
    adminNotes?: string,
    feeLineItems?: { label: string; amount: number }[],
    registryBookVerification?: string,
    scannedDocUrl?: string,
    orSeriesNumber?: string,
    miscFeeOverride?: number
) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedAdminNotes = adminNotes ? sanitizeString(adminNotes) : undefined;
        const sanitizedBpFeeLineItems = feeLineItems
            ? feeLineItems
                .map(item => ({
                    label: sanitizeString(item.label),
                    amount: Number(item.amount)
                }))
                .filter(item => item.label && Number.isFinite(item.amount) && item.amount > 0)
            : undefined;
        const sanitizedRegistryBookVerification = registryBookVerification ? sanitizeString(registryBookVerification) : undefined;
        const sanitizedScannedDocUrl = scannedDocUrl ? sanitizeString(scannedDocUrl) : undefined;
        const sanitizedOrSeriesNumber = orSeriesNumber ? sanitizeString(orSeriesNumber) : undefined;
        const sanitizedMiscFeeOverride = miscFeeOverride !== undefined ? Number(miscFeeOverride) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER" && user.role !== "REGISTRAR")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const typeCode = (transaction.type?.code || "").toUpperCase();
        if (typeCode !== "LCR_DEATH") {
            return { success: false, error: "Unsupported transaction type" };
        }

        const additionalData = transaction.additionalData as any || {};

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

        const baseFee = 0;
        const feeDelivery = Number(transaction.type?.deliveryFee || 0);
        const deliveryFeeUsed = transaction.fulfillmentType === "DELIVERY"
            ? (deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee || feeDelivery)
            : 0;

        const miscFee = sanitizedMiscFeeOverride !== undefined
            ? sanitizedMiscFeeOverride
            : (additionalData.miscFee !== undefined ? Number(additionalData.miscFee) : 0);

        const itemsSum = sanitizedBpFeeLineItems ? sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;
        const total = baseFee + deliveryFeeUsed + miscFee + itemsSum;

        let newStatus = "EVALUATED";
        if (transaction.status === "FOR_INSPECTION") {
            newStatus = "FOR_REQUESTING";
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: newStatus as any,
                totalAmount: total,
                processedBy: user.id,
                rejectionRemarks: sanitizedAdminNotes,
                additionalData: {
                    ...(additionalData || {}),
                    ...(sanitizedRegistryBookVerification ? { registryBookVerification: sanitizedRegistryBookVerification } : {}),
                    ...(sanitizedScannedDocUrl ? { scannedDocUrl: sanitizedScannedDocUrl } : {}),
                    ...(sanitizedOrSeriesNumber ? { orSeriesNumber: sanitizedOrSeriesNumber } : {}),
                    ...(sanitizedMiscFeeOverride !== undefined ? { miscFee: sanitizedMiscFeeOverride } : {})
                },
                fiscalSnapshot: {
                    basicTax: baseFee,
                    additionalTax: 0,
                    penaltyCharge: 0,
                    deliveryFee: deliveryFeeUsed,
                    totalAmount: total,
                    miscFee: miscFee,
                    ...(sanitizedBpFeeLineItems ? { lineItems: sanitizedBpFeeLineItems } : {})
                }
            } as any,
            include: { user: true }
        }) as any;

        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: newStatus as any,
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Death Certificate Request",
                amount: total
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/registrar");
        revalidatePath("/user/services");

        return { success: true, data: updatedTransaction };
    } catch (error: any) {
        console.error("Evaluate death certificate error:", error);
        return { success: false, error: error?.message || "Failed to evaluate transaction" };
    }
}
