"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/mail";
import { sanitizeString } from "@/lib/validation";
import { calculateCivilRegistryFee } from "@/lib/civil-registry";

async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Marks a PSA Appointment Endorsement as "appointment attended" — 
 * transitions from EVALUATED → PAID so the Registrar can proceed to release the document.
 * Used for Birth, Death, and Marriage PSA Appointment Endorsement types.
 */
export async function markPsaAppointmentAttended(
    id: string,
    deliveryFee?: number,
    feeLineItems?: { label: string; amount: any }[],
    miscFee?: number
) {
    try {
        id = sanitizeString(id);

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "REGISTRAR" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Registrar or Admin can mark appointment as attended." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found." };

        const PSA_APPOINTMENT_CODES = [
            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
        ];

        if (!PSA_APPOINTMENT_CODES.includes(transaction.type.code)) {
            return { success: false, error: "This action is only valid for PSA Appointment Endorsement types." };
        }

        const validStatuses = ["EVALUATED", "UNPAID", "FOR_INSPECTION", "FOR_REQUESTING"];
        if (!validStatuses.includes(transaction.status as string)) {
            return { success: false, error: "Transaction must be in EVALUATED, UNPAID, FOR_INSPECTION, or FOR_REQUESTING status." };
        }

        // Calculate final total based on updated fees if provided
        let total = transaction.totalAmount;
        let finalFiscal: any = transaction.fiscalSnapshot;
        if (feeLineItems !== undefined || miscFee !== undefined || deliveryFee !== undefined) {
            const items = feeLineItems || [];
            const dFee = deliveryFee ?? 0;
            const mFee = miscFee ?? 0;
            const calc = calculateCivilRegistryFee(transaction, items, dFee, mFee);
            total = calc.totalAmount;
            finalFiscal = {
                basicTax: calc.basicTax,
                additionalTax: calc.additionalTax,
                penaltyCharge: calc.penalty,
                deliveryFee: calc.deliveryFee,
                totalAmount: calc.totalAmount,
                miscFee: calc.miscFee,
                lineItems: calc.lineItems
            };
        }

        await prisma.transaction.update({
            where: { id },
            data: {
                status: "UNPAID",
                isPaid: false,
                totalAmount: total,
                fiscalSnapshot: finalFiscal || undefined,
                updatedAt: new Date()
            }
        });

        if (transaction.user?.email) {
            try {
                const resident = (transaction.residentSnapshot as any) || {};
                await sendEmail({
                    type: "UNPAID" as any,
                    to: transaction.user.email,
                    name: `${resident.firstName || ""} ${resident.lastName || ""}`.trim() || transaction.user.name || "Resident",
                    transactionId: id.slice(-8).toUpperCase(),
                    amount: transaction.totalAmount,
                    serviceName: transaction.type.name
                });
            } catch (emailErr) {
                console.error("Failed to send appointment attended email:", emailErr);
            }
        }

        revalidatePath("/admin/registrar");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: { status: "UNPAID" } };
    } catch (error: any) {
        console.error("Mark PSA appointment attended error:", error);
        return { success: false, error: error?.message || "Failed to mark appointment as attended." };
    }
}

/**
 * Treasury counter payment collection for PSA Appointment Endorsements.
 * Records the Official Receipt (O.R.) number and marks the transaction as RELEASED.
 * Transitions: FOR_CLAIM | FOR_PICKING → RELEASED
 * Used for Birth, Death, and Marriage PSA Appointment Endorsement types.
 */
export async function collectPsaAppointmentPayment(id: string, orNumber: string) {
    try {
        id = sanitizeString(id);
        orNumber = sanitizeString(orNumber);

        if (!orNumber || orNumber.trim() === "") {
            return { success: false, error: "Official Receipt (O.R.) number is required." };
        }

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Treasury Staff or Admin can collect payment." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found." };

        const PSA_APPOINTMENT_CODES = [
            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
        ];

        if (!PSA_APPOINTMENT_CODES.includes(transaction.type.code)) {
            return { success: false, error: "This action is only valid for PSA Appointment Endorsement types." };
        }

        if (!["UNPAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING"].includes(transaction.status as string)) {
            return { success: false, error: "Transaction must be in UNPAID, FOR_CLAIM, FOR_PICKING, or FOR_PROCESSING status to collect payment." };
        }

        const existingAdditional = (transaction.additionalData as Record<string, unknown>) || {};
        const updatedAdditional = { ...existingAdditional };
        delete updatedAdditional.counterName;
        delete updatedAdditional.servingDepartment;
        delete updatedAdditional.calledAt;

        const collectorName = user.name || user.email || "Treasury Staff";
        const collectorSource = "treasury_counter_payment";

        const targetStatus = transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "FOR_CLAIM";
        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: targetStatus as any,
                isPaid: true,
                additionalData: {
                    ...updatedAdditional,
                    orSeriesNumber: orNumber.trim(),
                    orCollectedAt: new Date().toISOString(),
                    orCollectedBy: collectorName
                },
                updatedAt: new Date()
            },
            include: { type: true }
        });

        // Directly upsert the Payment record for the payments ledger
        const paymentReference = null;
        await prisma.payment.upsert({
            where: { transactionId: id },
            update: {
                amount: Number(updatedTransaction.totalAmount || 0),
                method: updatedTransaction.paymentType || "CASH",
                status: "PAID",
                reference: paymentReference,
                orNumber: orNumber.trim(),
                meta: {
                    source: collectorSource,
                    collectedAt: new Date().toISOString(),
                    collectedBy: collectorName
                }
            },
            create: {
                transactionId: id,
                amount: Number(updatedTransaction.totalAmount || 0),
                method: updatedTransaction.paymentType || "CASH",
                status: "PAID",
                reference: paymentReference,
                orNumber: orNumber.trim(),
                meta: {
                    source: collectorSource,
                    collectedAt: new Date().toISOString(),
                    collectedBy: collectorName
                }
            }
        });

        if (transaction.user?.email) {
            try {
                const resident = (transaction.residentSnapshot as any) || {};
                await sendEmail({
                    type: "RELEASED" as any,
                    to: transaction.user.email,
                    name: `${resident.firstName || ""} ${resident.lastName || ""}`.trim() || transaction.user.name || "Resident",
                    transactionId: id.slice(-8).toUpperCase(),
                    amount: transaction.totalAmount,
                    serviceName: transaction.type.name
                });
            } catch (emailErr) {
                console.error("Failed to send payment collected email:", emailErr);
            }
        }

        revalidatePath("/admin/registrar");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: { status: "RELEASED", orNumber: orNumber.trim() } };
    } catch (error: any) {
        console.error("Collect PSA appointment payment error:", error);
        return { success: false, error: error?.message || "Failed to collect payment." };
    }
}

/**
 * Transfers/Finishes a PSA Appointment Endorsement to the Treasury counter.
 */
export async function finishPsaAppointmentToTreasury(id: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        const userDepartment = (user?.department || "").toUpperCase();
        const isRegistrarUser = userDepartment === "REGISTRAR" || userDepartment === "CIVIL_REGISTRY";

        if (!user || (user.role !== "REGISTRAR" && user.role !== "ADMIN" && !isRegistrarUser)) {
            return { success: false, error: "Forbidden: Only Civil Registrar staff can perform this action." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true }
        });

        if (!transaction) {
            return { success: false, error: "Transaction not found" };
        }

        const PSA_APPT_CODES = [
            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
        ];

        if (!PSA_APPT_CODES.includes(transaction.type.code)) {
            return { success: false, error: "This action is only valid for PSA Appointment Endorsement types." };
        }

        if (transaction.status === "UNPAID") {
            return { success: true };
        }

        if (transaction.status !== "FOR_PROCESSING") {
            return { success: false, error: "Transaction must be in FOR_PROCESSING status to transfer to Treasury." };
        }

        const existingAdditional = (transaction.additionalData as Record<string, unknown>) || {};

        await prisma.transaction.update({
            where: { id },
            data: {
                status: "UNPAID" as any,
                additionalData: {
                    ...existingAdditional,
                    appointmentAttended: true,
                    checkedIn: true,
                    checkedInAt: new Date().toISOString(),
                    transferredToTreasuryAt: new Date().toISOString(),
                    servingDepartment: "Treasury"
                },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/registrar");
        revalidatePath("/admin/treasury");
        return { success: true };
    } catch (error: any) {
        console.error("Finish PSA appointment error:", error);
        return { success: false, error: error?.message || "Failed to transfer appointment to Treasury." };
    }
}
