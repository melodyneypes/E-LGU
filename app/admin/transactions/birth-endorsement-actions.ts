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

        const isAppointment = [
            "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT",
            "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
        ].includes(transaction.type.code);

        const targetStatus = isAppointment
            ? (transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "RELEASED")
            : (transaction.eCopyUrl || eCopyUrl)
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


