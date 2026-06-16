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

export async function ensureDeathEndorsementTransactionType() {
    try {
        let psaType = await prisma.transactionType.findUnique({
            where: { code: "LCR_DEATH_PSA_ENDORSEMENT" }
        });

        if (!psaType) {
            psaType = await prisma.transactionType.create({
                data: {
                    code: "LCR_DEATH_PSA_ENDORSEMENT",
                    name: "Death PSA Endorsement",
                    description: "Request PSA Endorsement for Death Certificate.",
                    level: 1,
                    category: "Civil Registry",
                    baseFee: 200.00,
                    deliveryFee: 0.00,
                    isFixed: true,
                    requiredDocs: ["PSA Negative Certification"],
                    formSchema: {
                        type: "CIVIL_REGISTRY",
                        registryType: "DEATH_PSA_ENDORSEMENT",
                        fields: ["originalTransactionId", "psaNegCertUrl"]
                    },
                    requiresBusinessName: false,
                    supportsECopy: true,
                    processorRole: "TREASURY_STAFF"
                }
            });
        }
        return { success: true };
    } catch (error) {
        console.error("ensureDeathEndorsementTransactionType error:", error);
        return { success: false, error: "Failed to initialize Death PSA Endorsement service type" };
    }
}

/**
 * Get the latest completed death transaction for the current user that has an issued Form 2A document.
 */
export async function getLatestForm2AForCurrentUser() {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                type: {
                    code: {
                        in: ["LCR_DEATH", "LCR_DEATH_REG"]
                    }
                }
            },
            include: {
                type: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        for (const tx of transactions) {
            const addData = (tx.additionalData as any) || {};
            // For death, check registry verification or if form2a was uploaded/provided
            const hasForm2A = addData.registryBookVerification === "FORM_2A" || 
                              addData.registryBookVerification === "FORM_1A" || 
                              !!addData.form2a || 
                              !!addData.form2A;
            if (hasForm2A) {
                const docUrl = addData.scannedDocUrl || 
                               addData.verificationDocUrl || 
                               addData.form2a || 
                               addData.form2A || 
                               tx.eCopyUrl;
                if (docUrl) {
                    const snap = (tx.residentSnapshot as any) || {};
                    return {
                        success: true,
                        data: {
                            transactionId: tx.id,
                            docUrl: docUrl,
                            subjectName: addData.subjectName || addData.fullName || addData.deceasedName || (snap.firstName ? `${snap.firstName} ${snap.lastName}` : null),
                            dateOfDeath: addData.dateOfDeath || addData.dateOfEvent || null,
                            mothersMaidenName: addData.mothersMaidenName || addData.mothersName || addData.motherName || null,
                            fathersName: addData.fathersName || null,
                            placeOfDeath: addData.placeOfDeath || addData.placeOfEvent || null,
                            causeOfDeath: addData.causeOfDeath || null,
                            gender: addData.gender || null,
                            civilStatus: addData.civilStatus || null,
                            dateOfBirth: addData.dateOfBirth || null
                        }
                    };
                }
            }
        }

        return { success: false, error: "No issued Form 2A found for the user" };
    } catch (error) {
        console.error("getLatestForm2AForCurrentUser error:", error);
        return { success: false, error: "Failed to fetch latest Form 2A" };
    }
}

export async function releaseDeathPsaEndorsement(
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
                deathPsaEndorsementRequest: true
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

        const dpeExisting = (transaction as any).deathPsaEndorsementRequest;
        if (!dpeExisting && ["RELEASED", "FOR_PICKING", "FOR_CLAIM"].includes(targetStatus)) {
            const src: any = additionalData || {};

            // Required fields from death-psa-endorsement form
            const subjectFullName = src.subjectFullName || src.subjectName || src.deceasedName || "—";
            const subjectDateOfDeath = src.subjectDateOfDeath || src.dateOfDeath ? new Date(src.subjectDateOfDeath || src.dateOfDeath) : null;
            const mothersMaidenName = src.mothersMaidenName || null;
            const fathersName = src.fathersName || null;
            const placeOfDeath = src.placeOfDeath || null;
            const causeOfDeath = src.causeOfDeath || null;

            const relationship = src.relationship || "RELATIVE";
            const contactNumber = src.contactNumber || "—";
            const email = src.email || null;

            const psaNegativeCert = src.psaNegativeCert || "";
            const form2a = src.form2a || "";

            if (subjectFullName) {
                const generatedRegistryNumber = registryNumber?.trim() || src.registryNumber || `REQ-DEATH-PSA-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
                try {
                    await prisma.deathPsaEndorsementRequest.create({
                        data: {
                            transactionId: id,
                            registryNumber: generatedRegistryNumber,
                            subjectFullName,
                            subjectDateOfDeath,
                            mothersMaidenName,
                            fathersName,
                            placeOfDeath,
                            causeOfDeath,
                            relationship,
                            contactNumber,
                            email,
                            psaNegativeCert,
                            form2a,
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
                            verificationId: `VER-DPE-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                        }
                    });
                } catch (createErr) {
                    console.error("Failed to create DeathPsaEndorsementRequest:", createErr);
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
        console.error("Release death psa endorsement error:", error);
        return { success: false, error: error?.message || "Failed to release death psa endorsement." };
    }
}
