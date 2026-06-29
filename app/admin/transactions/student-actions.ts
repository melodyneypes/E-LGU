"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { uploadFile } from "@/lib/storage";
import { sanitizeString, sanitizeObject, sanitizeUrl } from "@/lib/validation";

const isUserAdminAide = (u: any) => u?.role === "TREASURY_STAFF" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "Treasury");

async function getSession() {
    return await getServerSession(authOptions);
}

async function processFileUpload(file: File, folder: string = "transactions"): Promise<string | null> {
    if (!file || file.size === 0) return null;

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
        const storagePath = `services/${folder}/${filename}`;

        const publicUrl = await uploadFile(buffer, storagePath, undefined, file.type);
        return publicUrl;
    } catch (error) {
        console.error("File upload error:", error);
        return null;
    }
}

/**
 * Submit a new Student Cedula Transaction (Resident side)
 */
export async function submitStudentCedulaTransaction(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const typeId = sanitizeString(formData.get("typeId") as string);
        const transactionType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        if (!transactionType) return { success: false, error: "Transaction type not found" };

        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));

        // Files
        const idFile = formData.get("idFile") as File;
        const proofFile = formData.get("proofFile") as File;
        const existingIdUrl = sanitizeUrl(formData.get("existingIdUrl") as string);

        let idUrl = null;
        if (idFile && idFile.size > 0 && idFile.name !== "undefined") {
            idUrl = await processFileUpload(idFile, "ids");
            if (!idUrl) {
                return { success: false, error: "Failed to upload Student/Valid ID. Please try again or check your connection." };
            }
        }
        if (!idUrl && existingIdUrl) idUrl = existingIdUrl;

        let proofUrl = null;
        if (proofFile && proofFile.size > 0 && proofFile.name !== "undefined") {
            proofUrl = await processFileUpload(proofFile, "proofs");
            if (!proofUrl) {
                return { success: false, error: "Failed to upload Enrollment Proof. Please try again or check your connection." };
            }
        }

        // Merge file URLs into additionalData
        const updatedAdditionalData = {
            ...additionalData,
            validIdUrl: idUrl,
            proofOfIncomeUrl: proofUrl,
            isStudent: true
        };

        const [transaction] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: "FOR_REQUESTING",
                    fulfillmentType: null,
                    paymentType: null,
                    residentSnapshot,
                    additionalData: updatedAdditionalData,
                    totalAmount: 0,
                    businessName: null,
                    isStudent: true,
                } as any
            }),
            prisma.resident.update({
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
            })
        ]);

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        return { success: true, data: transaction };
    } catch (error: any) {
        console.error("Submit student transaction error:", error);
        return { success: false, error: error.message || "Failed to submit request" };
    }
}

/**
 * Resubmit a Student Cedula Transaction after revision (Resident side)
 */
export async function resubmitStudentCedulaTransaction(id: string, formData: FormData) {
    try {
        id = sanitizeString(id);
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({
            where: { id, userId: session.user.id }
        });

        if (!tx || tx.status !== "FOR_REVISION") {
            return { success: false, error: "Invalid transaction for resubmission" };
        }

        const additionalData = tx.additionalData as any || {};

        // Helper to process optional re-uploaded files
        const processReupload = async (key: string, folder: string) => {
            const file = formData.get(key) as File;
            if (file && file.size > 0 && file.name !== "undefined") {
                return await processFileUpload(file, folder);
            }
            return additionalData[key];
        };

        const residentSnapshotStr = formData.get("residentSnapshot") as string;
        let residentSnapshot = tx.residentSnapshot;
        if (residentSnapshotStr) {
            try {
                residentSnapshot = sanitizeObject(JSON.parse(residentSnapshotStr));
            } catch (e) {
                console.error("Failed to parse resident snapshot during resubmit:", e);
            }
        }

        additionalData.validIdUrl = await processReupload("idFile", "ids") || additionalData.validIdUrl;
        additionalData.proofOfIncomeUrl = await processReupload("proofFile", "proofs") || additionalData.proofOfIncomeUrl;

        // Update Student specific fields
        const fields = ["applicantType", "purpose"];
        for (const f of fields) {
            if (formData.has(f)) {
                const val = formData.get(f) as string;
                if (val) {
                    const cleanVal = sanitizeString(val);
                    additionalData[f] = cleanVal;
                }
            }
        }
        additionalData.isStudent = true;

        const transaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: sanitizeObject(additionalData),
                residentSnapshot: residentSnapshot ? sanitizeObject(residentSnapshot as any) : null,
                status: "FOR_REQUESTING",
                rejectionRemarks: null,
                isStudent: true
            } as any
        });

        revalidatePath("/user/services");
        revalidatePath("/user/services/requests");
        return { success: true, data: transaction };
    } catch (error: any) {
        console.error("Resubmit student transaction error:", error);
        return { success: false, error: error.message || "Failed to resubmit request" };
    }
}

/**
 * Evaluate a Student Cedula Transaction (Treasury Staff side)
 */
export async function evaluateStudentCedulaTransaction(
    id: string,
    deliveryFeeOverride?: number,
    adminNotes?: string,
    studentFeeLineItems?: { label: string; amount: number }[],
    registryBookVerification?: string,
    scannedDocUrl?: string,
    orSeriesNumber?: string
) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedAdminNotes = adminNotes ? sanitizeString(adminNotes) : undefined;
        const sanitizedBpFeeLineItems = studentFeeLineItems
            ? studentFeeLineItems
                .map(item => ({
                    label: sanitizeString(item.label),
                    amount: Number(item.amount)
                }))
                .filter(item => item.label && Number.isFinite(item.amount) && item.amount > 0)
            : undefined;
        const sanitizedRegistryBookVerification = registryBookVerification ? sanitizeString(registryBookVerification) : undefined;
        const sanitizedScannedDocUrl = scannedDocUrl ? sanitizeString(scannedDocUrl) : undefined;
        const sanitizedOrSeriesNumber = orSeriesNumber ? sanitizeString(orSeriesNumber) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const additionalData = transaction.additionalData as any;

        // Dynamic Delivery Fee Lookup from BarangayInfo
        let dynamicDeliveryFee = transaction.type.deliveryFee;
        if (transaction.fulfillmentType === "DELIVERY" && (transaction.deliveryAddress || (transaction as any).residentSnapshot)) {
            const addr = (typeof transaction.deliveryAddress === 'string'
                ? JSON.parse(transaction.deliveryAddress || '{}')
                : transaction.deliveryAddress) || (transaction as any).residentSnapshot;

            if (addr?.barangay) {
                const brgyLogistics = await prisma.barangayInfo.findUnique({
                    where: { name: addr.barangay }
                }) as any;

                if (brgyLogistics && (brgyLogistics as any).isLogisticsActive && (brgyLogistics as any).deliveryFee > 0) {
                    dynamicDeliveryFee = (brgyLogistics as any).deliveryFee;
                }
            }
        }

        const baseStudentFee = Number(transaction.type?.studentFee || 0);
        const itemsSum = sanitizedBpFeeLineItems ? sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;
        const dFee = transaction.fulfillmentType === "DELIVERY"
            ? (deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee || 0)
            : 0;

        const result = {
            basicTax: baseStudentFee,
            additionalTax: 0,
            penalty: 0,
            deliveryFee: dFee,
            totalAmount: baseStudentFee + itemsSum + dFee
        };

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: "EVALUATED",
                totalAmount: result.totalAmount,
                processedBy: user.id,
                rejectionRemarks: sanitizedAdminNotes,
                additionalData: {
                    ...(additionalData || {}),
                    ...(sanitizedRegistryBookVerification ? { registryBookVerification: sanitizedRegistryBookVerification } : {}),
                    ...(sanitizedScannedDocUrl ? { scannedDocUrl: sanitizedScannedDocUrl } : {}),
                    ...(sanitizedOrSeriesNumber ? { orSeriesNumber: sanitizedOrSeriesNumber } : {})
                },
                fiscalSnapshot: {
                    basicTax: result.basicTax,
                    additionalTax: result.additionalTax,
                    penaltyCharge: result.penalty,
                    deliveryFee: result.deliveryFee,
                    totalAmount: result.totalAmount,
                    ...(sanitizedBpFeeLineItems ? { lineItems: sanitizedBpFeeLineItems } : {})
                }
            } as any,
            include: { user: true }
        }) as any;

        // Trigger email notification for payment
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: "FOR_PAYMENT",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                amount: result.totalAmount,
                remarks: sanitizedAdminNotes
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/requests");
        return { success: true, data: updatedTransaction, calculation: result };
    } catch (error: any) {
        console.error("Evaluate student transaction error:", error);
        return { success: false, error: error.message || "Failed to evaluate transaction" };
    }
}
