"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
