"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { sanitizeString, sanitizeObject, sanitizeUrl } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";

const isUserAdminAide = (u: any) => u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");

async function getSession() {
    return await getServerSession(authOptions);
}

export async function releaseMarriageRegistry(id: string, registryNumber: string, eCopyUrl?: string, orUrl?: string) {
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
                marriageRegistration: true
            }
        });

        if (!transaction || !["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid, processing, ready for claiming, or under re-inspection before release" };
        }

        const additionalData = (transaction.additionalData as any) || {};
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

        const mrExisting = (transaction as any).marriageRegistration;
        const now = new Date();
        if (!mrExisting && targetStatus === "RELEASED") {
            const subjectName = transaction.businessName || additionalData.subjectName || (additionalData.app1FullName && additionalData.app2FullName ? `${additionalData.app1FullName} & ${additionalData.app2FullName}` : null) || "Contracting Couple";
            const generatedRegistryNumber = registryNumber?.trim() || additionalData.registryNumber || `MR-${now.getFullYear()}-${id.slice(-6).toUpperCase()}`;
            try {
                await prisma.marriageRegistration.create({
                    data: {
                        transactionId: id,
                        ctcNumber: generatedRegistryNumber,
                        taxYear: now.getFullYear(),
                        dateIssued: now,
                        expiryDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
                        basicTax: 0,
                        additionalTax: 0,
                        penalty: 0,
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
        console.error("Release marriage registry error:", error);
        return { success: false, error: error?.message || "Failed to release marriage registry." };
    }
}

export async function evaluateMarriageRegistrationTransaction(
    id: string,
    deliveryFeeOverride?: number,
    adminNotes?: string,
    feeLineItems?: { label: string; amount: number }[],
    registryBookVerification?: string,
    scannedDocUrl?: string,
    orSeriesNumber?: string,
    miscFeeOverride?: number,
    isTreasury?: boolean
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
        if (typeCode !== "LCR_MARRIAGE_REG") {
            return { success: false, error: "Unsupported transaction type" };
        }

        const additionalData = transaction.additionalData as any || {};
        const isLate = (additionalData.registrationType || "").toUpperCase() === "LATE";
        
        // Base fee is always 0 for marriage registration
        const baseFee = 0;

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

        const deliveryFeeUsed = transaction.fulfillmentType === "DELIVERY"
            ? (deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee || 0)
            : 0;

        const miscFee = sanitizedMiscFeeOverride !== undefined
            ? sanitizedMiscFeeOverride
            : (additionalData.miscFee !== undefined ? Number(additionalData.miscFee) : (isLate ? ((transaction.type as any).lateFee || 0) : 0));

        const itemsSum = sanitizedBpFeeLineItems ? sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;
        const total = baseFee + deliveryFeeUsed + miscFee + itemsSum;

        // Determine Status
        const regType = (additionalData.registrationType || "").toUpperCase();
        const hasAdditionalFees = sanitizedBpFeeLineItems && sanitizedBpFeeLineItems.length > 0;
        
        let newStatus = "EVALUATED";
        if (transaction.status === "FOR_INSPECTION") {
            if (isTreasury || user?.role === "TREASURY_STAFF") {
                newStatus = "EVALUATED";
            } else if ((regType === "STANDARD" || !regType) && !hasAdditionalFees && total === 0) {
                newStatus = "EVALUATED";
            } else {
                newStatus = "FOR_REQUESTING";
            }
        } else if (transaction.status === "FOR_REQUESTING") {
            newStatus = "EVALUATED";
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

        // Trigger email notification for payment / processing
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: newStatus as any,
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Marriage Registration Service",
                amount: total
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/registrar");
        revalidatePath("/user/services");

        return { success: true, data: updatedTransaction };
    } catch (error: any) {
        console.error("Evaluate marriage registration error:", error);
        return { success: false, error: error?.message || "Failed to evaluate transaction" };
    }
}

async function processFileUpload(file: File, folder: string = "transactions"): Promise<string | null> {
    if (!file || file.size === 0) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_").replace(/_+/g, "_")}`;
        const storagePath = `services/${folder}/${filename}`;

        const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);
        return publicUrl;
    } catch (error) {
        console.error("File upload error:", error);
        return null;
    }
}

function getPHTimeISOString(): string {
    const utcDate = new Date();
    const phTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    return phTime.toISOString().replace("Z", "+08:00");
}

export async function submitMarriageRegistrationTransaction(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const typeId = sanitizeString(formData.get("typeId") as string);
        const registryType = sanitizeString(formData.get("registryType") as string);
        const residentSnapshotRaw = formData.get("residentSnapshot");
        const additionalDataRaw = formData.get("additionalData");
        const revisionId = formData.get("revisionId") ? sanitizeString(formData.get("revisionId") as string) : null;

        if (!typeId || !registryType || !residentSnapshotRaw || !additionalDataRaw) {
            return { success: false, error: "Missing required transaction data" };
        }

        const residentSnapshot = sanitizeObject(JSON.parse(residentSnapshotRaw as string));
        const additionalData = sanitizeObject(JSON.parse(additionalDataRaw as string));

        console.log(`Processing ${registryType} transaction for user ${session.user.id} (revisionId: ${revisionId})`);

        let existingTx: any = null;
        if (revisionId) {
            existingTx = await prisma.transaction.findUnique({
                where: { id: revisionId }
            });
        }
        const existingAddData = existingTx?.additionalData as any || {};

        const files: Record<string, string | null> = {};

        const isFileLike = (v: any) => {
            return v && (v instanceof File || (typeof v === 'object' && typeof v.arrayBuffer === 'function' && typeof v.name === 'string'));
        };

        for (const [key, value] of formData.entries()) {
            if (isFileLike(value)) {
                const fileLike = value as File;
                if ((fileLike as any).size && (fileLike as any).size > 0) {
                    const url = await processFileUpload(fileLike, `lcr/${registryType.toLowerCase()}`);
                    if (!url) {
                        return { success: false, error: `Failed to upload required document: ${key}. Please check your connection and try again.` };
                    }
                    files[key] = url;
                }
            }
        }

        console.log("[submitMarriageRegistrationTransaction] additionalData:", additionalData);
        console.log("[submitMarriageRegistrationTransaction] files:", files);

        let initialMiscFee = additionalData.miscFee;
        let initialTotalAmount = additionalData.totalAmount;
        let initialFiscalSnapshot: any = null;

        const transType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        if (initialMiscFee === undefined || initialMiscFee === null || Number(initialMiscFee) === 0) {
            initialMiscFee = (additionalData.totalAmount && Number(additionalData.totalAmount) > 0)
                ? Number(additionalData.totalAmount)
                : (transType ? Number(transType.baseFee) : 0);
        }
        
        initialTotalAmount = Number(initialMiscFee);
        initialFiscalSnapshot = {
            basicTax: 0,
            additionalTax: 0,
            penaltyCharge: 0,
            deliveryFee: 0,
            miscFee: Number(initialMiscFee),
            totalAmount: initialTotalAmount
        };

        const updatedAdditionalData = {
            ...existingAddData,
            ...additionalData,
            ...files,
            registryType,
            submittedAt: getPHTimeISOString(),
        };

        const transaction = await prisma.$transaction(async (tx: any) => {
            const t = revisionId
                ? await tx.transaction.update({
                    where: { id: revisionId },
                    data: {
                        status: "FOR_INSPECTION",
                        fulfillmentType: additionalData.fulfillmentType || null,
                        paymentType: null,
                        residentSnapshot,
                        additionalData: updatedAdditionalData,
                        totalAmount: initialTotalAmount !== undefined ? initialTotalAmount : (additionalData.miscFee ?? additionalData.totalAmount ?? 0),
                        rejectionRemarks: null, // Reset rejection remarks on resubmit!
                        updatedAt: new Date(),
                        ...(initialFiscalSnapshot ? { fiscalSnapshot: initialFiscalSnapshot } : {})
                    }
                })
                : await tx.transaction.create({
                    data: {
                        userId: session.user.id,
                        typeId,
                        status: "FOR_INSPECTION",
                        fulfillmentType: additionalData.fulfillmentType || null,
                        paymentType: null,
                        residentSnapshot,
                        additionalData: updatedAdditionalData,
                        totalAmount: initialTotalAmount !== undefined ? initialTotalAmount : (additionalData.miscFee ?? additionalData.totalAmount ?? 0),
                        businessName: null,
                        fiscalSnapshot: initialFiscalSnapshot
                    }
                });

            await tx.resident.update({
                where: { userId: session.user.id },
                data: {
                    firstName: residentSnapshot.firstName,
                    middleName: residentSnapshot.middleName,
                    lastName: residentSnapshot.lastName,
                    suffix: residentSnapshot.suffix,
                    contactNumber: residentSnapshot.contactNumber,
                    email: residentSnapshot.email,
                }
            });

            return t;
        });

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        revalidatePath("/admin/registrar");
        return { success: true, data: transaction };
    } catch (error: any) {
        console.error("Submit marriage registration error:", error);
        return { success: false, error: error?.message || "Failed to submit marriage registration." };
    }
}
