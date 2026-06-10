"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { sanitizeString, sanitizeUrl } from "@/lib/validation";
import { uploadFile } from "@/lib/storage";

function getPHTimeISOString() {
    const phOffset = 8 * 60 * 60 * 1000; // UTC+8
    const phTime = new Date(Date.now() + phOffset);
    return phTime.toISOString().replace("Z", "+08:00");
}

async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Treasury release handoff for Business Permits (transitions status to FOR_REINSPECTION)
 */
export async function treasuryReleaseBusinessPermit(id: string, orUrl?: string) {
    try {
        id = sanitizeString(id);
        orUrl = orUrl ? sanitizeUrl(orUrl) : undefined;

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Access is restricted to Treasury Staff and Administrators." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction || !["PAID", "FOR_PROCESSING"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid or processing before handoff to BPLO." };
        }

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const currentOr = orUrl || transaction.orUrl;
        if (!currentOr) {
            return { success: false, error: "Official Receipt (OR) attachment is required for Business Permits before releasing." };
        }

        const targetStatus = "FOR_REINSPECTION";

        await prisma.transaction.update({
            where: { id },
            data: {
                status: targetStatus as any,
                orUrl: currentOr,
                additionalData: {
                    ...currentAdditionalData,
                    releasedAt: getPHTimeISOString()
                },
                updatedAt: new Date()
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
        return { success: true, data: { status: targetStatus } };
    } catch (error: any) {
        console.error("Treasury release business permit error:", error);
        return { success: false, error: error?.message || "Failed to process treasury release." };
    }
}

/**
 * Confirm Payment and Handoff for Business Permits (transitions to FOR_REINSPECTION)
 */
export async function confirmBusinessPermitPayment(formData: FormData) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Access is restricted to Treasury Staff and Administrators." };
        }

        const id = formData.get("id") as string;
        const remarks = formData.get("remarks") as string;
        const orFile = formData.get("orFile") as File;
        const orSeriesNumber = formData.get("orSeriesNumber") as string;

        const sanitizedId = sanitizeString(id);
        const sanitizedRemarks = remarks ? sanitizeString(remarks) : undefined;

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        let orDocumentUrl = undefined;
        console.log("[confirmBusinessPermitPayment] id:", sanitizedId);
        console.log("[confirmBusinessPermitPayment] orFile received:", orFile ? { name: orFile.name, size: orFile.size, type: orFile.type } : "NONE");
        
        if (orFile && (orFile as any).size > 0) {
            const timestamp = Date.now();
            const path = `treasury/or/${sanitizedId}/${timestamp}-${(orFile as any).name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            orDocumentUrl = await uploadFile(orFile, path);
            console.log("[confirmBusinessPermitPayment] uploadResult:", orDocumentUrl);
        }

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            ...(sanitizedRemarks && { treasuryRemarks: sanitizedRemarks }),
            ...(orSeriesNumber && { orSeriesNumber: sanitizeString(orSeriesNumber) }),
            ...(orDocumentUrl && { orDocumentUrl }), // Save in additionalData as well!
            releasedAt: getPHTimeISOString()
        };

        const targetStatus = "FOR_REINSPECTION";
        const finalOrUrl = orDocumentUrl || transaction.orUrl;

        console.log("[confirmBusinessPermitPayment] Updating transaction in database. finalOrUrl:", finalOrUrl);

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: targetStatus as any,
                orUrl: finalOrUrl,
                updatedAt: new Date(),
                additionalData: updatedAdditionalData
            },
            include: { user: true, type: true }
        });

        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: targetStatus as any,
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                amount: updatedTransaction.totalAmount,
                serviceName: updatedTransaction.type.name
            });
        }

        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error: any) {
        console.error("Confirm business permit payment error:", error);
        return { success: false, error: error?.message || "Failed to confirm business permit payment." };
    }
}

