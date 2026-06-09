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

export async function releaseDeathRegistry(id: string, registryNumber: string, eCopyUrl?: string, orUrl?: string) {
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
                deathRegistration: true
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

        const drExisting = (transaction as any).deathRegistration;
        if (!drExisting && targetStatus === "RELEASED") {
            const subjectName = additionalData.fullName || additionalData.subjectName || null;
            const dateOfEvent = additionalData.dateOfDeath ? new Date(additionalData.dateOfDeath) : null;
            const placeOfEvent = additionalData.placeOfDeath || null;

            if (subjectName) {
                const generatedRegistryNumber = registryNumber?.trim() || additionalData.registryNumber || `DEATH-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
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
        console.error("Release death registry error:", error);
        return { success: false, error: error?.message || "Failed to release death registry." };
    }
}

export async function releaseDeathCertificate(id: string, registryNumber: string, eCopyUrl?: string, orUrl?: string, registryBookVerification?: string, verificationDocUrl?: string) {
    try {
        id = sanitizeString(id);
        registryNumber = sanitizeString(registryNumber);
        eCopyUrl = eCopyUrl ? sanitizeUrl(eCopyUrl) : undefined;
        orUrl = orUrl ? sanitizeUrl(orUrl) : undefined;
        verificationDocUrl = verificationDocUrl ? sanitizeUrl(verificationDocUrl) : undefined;

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
                            documentUrl: eCopyUrl || verificationDocUrl || transaction.eCopyUrl || null,
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
                ...(eCopyUrl || verificationDocUrl ? { eCopyUrl: eCopyUrl || verificationDocUrl } : {}),
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
        console.error("Release death certificate request error:", error);
        return { success: false, error: error?.message || "Failed to release death certificate request." };
    }
}

export async function evaluateDeathRegistrationTransaction(
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
        if (typeCode !== "LCR_DEATH_REG") {
            return { success: false, error: "Unsupported transaction type" };
        }

        const additionalData = transaction.additionalData as any || {};
        const isLate = (additionalData.registrationType || "").toUpperCase() === "LATE";

        // Base fee is always 0 for death registration
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
            if ((regType === "STANDARD" || !regType) && !hasAdditionalFees && total === 0) {
                newStatus = "EVALUATED";
            } else {
                newStatus = "FOR_REQUESTING";
            }
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
                serviceName: updatedTransaction.type?.name || "Death Registration Service",
                amount: total
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/registrar");
        revalidatePath("/user/services");

        return { success: true, data: updatedTransaction };
    } catch (error: any) {
        console.error("Evaluate death registration error:", error);
        return { success: false, error: error?.message || "Failed to evaluate transaction" };
    }
}

export async function updateDeceasedResidentStatus(transactionId: string) {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { type: true }
        });
        if (!transaction) return;

        const typeCode = (transaction.type?.code || "").toUpperCase();
        if (typeCode !== "LCR_DEATH_REG" && typeCode !== "LCR_DEATH") return;

        const additionalData = (transaction.additionalData as any) || {};
        const subjectName = additionalData.fullName || additionalData.subjectName || null;
        if (!subjectName) return;

        let matchedResidentId: string | null = null;

        // Helper to format date to YYYY-MM-DD in UTC
        const getYYYYMMDD = (dateInput: any) => {
            if (!dateInput) return "";
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return "";
            const year = d.getUTCFullYear();
            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // Helper to perform smart name parts matching
        const namePartsMatch = (res: any, deceasedName: string) => {
            const cleanDeceased = deceasedName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            const deceasedParts = cleanDeceased.split(/\s+/);
            
            const cleanResFirst = (res.firstName || "").toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            const resFirstParts = cleanResFirst.split(/\s+/);
            
            const cleanResLast = (res.lastName || "").toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            const resLastParts = cleanResLast.split(/\s+/);

            const resMiddle = (res.middleName || "").toLowerCase().replace(/[^a-z0-9]/g, '');

            const firstMatch = resFirstParts.every((part: string) => deceasedParts.includes(part));
            const lastMatch = resLastParts.every((part: string) => deceasedParts.includes(part));

            if (firstMatch && lastMatch) {
                const remainingParts = deceasedParts.filter((part: string) => !resFirstParts.includes(part) && !resLastParts.includes(part));
                if (remainingParts.length > 0 && resMiddle) {
                    const midMatch = remainingParts.some((part: string) => {
                        if (part.length === 1) {
                            return resMiddle.startsWith(part);
                        }
                        return resMiddle.includes(part) || part.includes(resMiddle);
                    });
                    return midMatch;
                }
                return true;
            }
            return false;
        };

        // 1. Try matching by deceasedResidentId if provided in additionalData
        if (additionalData.deceasedResidentId) {
            const residentExists = await prisma.resident.findUnique({
                where: { id: additionalData.deceasedResidentId }
            });
            if (residentExists) {
                matchedResidentId = residentExists.id;
            }
        }

        // 2. Try matching by DOB within range (+/- 2 days) first
        if (!matchedResidentId && additionalData.dateOfBirth) {
            const dob = new Date(additionalData.dateOfBirth);
            const startRange = new Date(dob);
            startRange.setDate(startRange.getDate() - 2);
            const endRange = new Date(dob);
            endRange.setDate(endRange.getDate() + 2);

            const candidates = await prisma.resident.findMany({
                where: {
                    dateOfBirth: {
                        gte: startRange,
                        lte: endRange
                    }
                }
            });

            const deceasedDobString = getYYYYMMDD(additionalData.dateOfBirth);
            const match = candidates.find(r => {
                const dobMatches = deceasedDobString && getYYYYMMDD(r.dateOfBirth) === deceasedDobString;
                const nameMatches = namePartsMatch(r, subjectName);
                return dobMatches && nameMatches;
            });

            if (match) {
                matchedResidentId = match.id;
            }
        }

        // 3. Fallback: query by name components contains
        if (!matchedResidentId) {
            const parts = subjectName.trim().split(/\s+/);
            if (parts.length >= 2) {
                const firstNamePart = parts[0];
                const lastNamePart = parts[parts.length - 1];
                const candidates = await prisma.resident.findMany({
                    where: {
                        firstName: { contains: firstNamePart, mode: 'insensitive' },
                        lastName: { contains: lastNamePart, mode: 'insensitive' }
                    }
                });

                // First try DOB + Name matching in candidates
                if (additionalData.dateOfBirth) {
                    const deceasedDobString = getYYYYMMDD(additionalData.dateOfBirth);
                    const match = candidates.find(r => {
                        const dobMatches = deceasedDobString && getYYYYMMDD(r.dateOfBirth) === deceasedDobString;
                        const nameMatches = namePartsMatch(r, subjectName);
                        return dobMatches && nameMatches;
                    });
                    if (match) {
                        matchedResidentId = match.id;
                    }
                }

                // If still not matched, try pure name matching in candidates
                if (!matchedResidentId) {
                    const match = candidates.find(r => namePartsMatch(r, subjectName));
                    if (match) {
                        matchedResidentId = match.id;
                    }
                }
            }
        }

        if (matchedResidentId) {
            console.log(`[DeathRegistration] Matching resident found: ${matchedResidentId}. Updating isDead to true.`);
            await prisma.resident.update({
                where: { id: matchedResidentId },
                data: { isDead: true }
            });
        } else {
            console.log(`[DeathRegistration] No matching resident found for deceased name: ${subjectName}`);
        }
    } catch (err) {
        console.error("Error updating deceased resident status:", err);
    }
}
