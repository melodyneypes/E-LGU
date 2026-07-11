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

export async function releaseBirthPsaEndorsement(
    id: string,
    registryNumber: string,
    eCopyUrl?: string,
    orUrl?: string
) {
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
                birthPsaEndorsementRequest: true
            }
        });

        if (!transaction || !["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Transaction must be paid, processing, ready for claiming, or under re-inspection before release" };
        }

        const additionalData = (transaction.additionalData as any) || {};
        const isInitialRelease = (transaction.status as any) === "FOR_PROCESSING" || (transaction.status as any) === "PAID" || (transaction.status as any) === "FOR_REINSPECTION";

        const targetStatus = (transaction.eCopyUrl || eCopyUrl)
            ? (transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "RELEASED")
            : (transaction.status as any) === "PAID"
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

        const bpeExisting = (transaction as any).birthPsaEndorsementRequest;
        if (!bpeExisting && ["RELEASED", "FOR_PICKING", "FOR_CLAIM"].includes(targetStatus)) {
            const src: any = additionalData || {};

            // Required fields from birth-psa-endorsement form
            const subjectFullName = src.subjectFullName || src.subjectName || "—";
            const subjectDateOfBirth = src.subjectDateOfBirth ? new Date(src.subjectDateOfBirth) : null;
            const mothersMaidenName = src.mothersMaidenName || null;

            const relationship = src.relationship || "RELATIVE";
            const contactNumber = src.contactNumber || "—";
            const email = src.email || null;

            const psaNegativeCert = src.psaNegativeCert || "";
            const form1a = src.form1a || "";

            if (subjectFullName) {
                const generatedRegistryNumber = registryNumber?.trim() || src.registryNumber || `REQ-BIRTH-PSA-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
                try {
                    await prisma.birthPsaEndorsementRequest.create({
                        data: {
                            transactionId: id,
                            registryNumber: generatedRegistryNumber,
                            subjectFullName,
                            subjectDateOfBirth,
                            mothersMaidenName,
                            relationship,
                            contactNumber,
                            email,
                            psaNegativeCert,
                            form1a,
                            informantFirstName: src.informantFirstName || "",
                            informantMiddleName: src.informantMiddleName || null,
                            informantLastName: src.informantLastName || "",
                            informantSuffix: src.informantSuffix || null,
                            informantBirthDate: src.informantBirthDate ? new Date(src.informantBirthDate) : null,
                            informantAge: src.informantAge ? parseInt(src.informantAge) : null,
                            informantCivilStatus: src.informantCivilStatus || null,
                            informantCitizenship: src.informantCitizenship || null,
                            informantOccupation: src.informantOccupation || null,
                            informantAddress: src.informantAddress || null,
                            issuedBy: user.name || "System Administrator",
                            documentUrl: eCopyUrl || transaction.eCopyUrl || null,
                            verificationId: `VER-BPE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                        }
                    });
                } catch (createErr) {
                    console.error("Failed to create BirthPsaEndorsementRequest:", createErr);
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

        revalidatePath("/admin/registrar");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: { status: targetStatus } };
    } catch (error: any) {
        console.error("Release birth psa endorsement error:", error);
        return { success: false, error: error?.message || "Failed to release birth psa endorsement." };
    }
}

/**
 * Marks a PSA Appointment Endorsement as "appointment attended" — 
 * transitions from EVALUATED → PAID so the Registrar can proceed to release the document.
 * Used for Birth, Death, and Marriage PSA Appointment Endorsement types.
 */
export async function markPsaAppointmentAttended(id: string) {
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
            "LCR_PSA_APPOINTMENT_ENDORSEMENT",
            "LCR_DEATH_PSA_APPOINTMENT_ENDORSEMENT",
            "LCR_MARRIAGE_PSA_APPOINTMENT_ENDORSEMENT"
        ];

        if (!PSA_APPOINTMENT_CODES.includes(transaction.type.code)) {
            return { success: false, error: "This action is only valid for PSA Appointment Endorsement types." };
        }

        const validStatuses = ["EVALUATED", "UNPAID", "FOR_INSPECTION", "FOR_REQUESTING"];
        if (!validStatuses.includes(transaction.status as string)) {
            return { success: false, error: "Transaction must be in EVALUATED, UNPAID, FOR_INSPECTION, or FOR_REQUESTING status." };
        }

        await prisma.transaction.update({
            where: { id },
            data: {
                status: "UNPAID",
                isPaid: false,
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
            "LCR_PSA_APPOINTMENT_ENDORSEMENT",
            "LCR_DEATH_PSA_APPOINTMENT_ENDORSEMENT",
            "LCR_MARRIAGE_PSA_APPOINTMENT_ENDORSEMENT"
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
            "LCR_PSA_APPOINTMENT_ENDORSEMENT",
            "LCR_DEATH_PSA_APPOINTMENT_ENDORSEMENT",
            "LCR_MARRIAGE_PSA_APPOINTMENT_ENDORSEMENT"
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
                    transferredToTreasuryBy: user.name || user.email || "Registrar"
                },
                updatedAt: new Date()
            }
        });

        revalidatePath("/admin/registrar");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");

        return { success: true };
    } catch (error: any) {
        console.error("Finish appointment error:", error);
        return { success: false, error: error?.message || "Failed to finish appointment" };
    }
}
