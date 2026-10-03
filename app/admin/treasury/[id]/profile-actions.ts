"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/audit";
import { revalidatePath } from "next/cache";

interface VerifyStaffPasswordParams {
    transactionId?: string;
    password: string;
    reason?: string;
}

/**
 * Verifies staff password to unlock editing for Profile and/or Declared Gross Income
 */
export async function verifyStaffPasswordToUnlockAction(params: VerifyStaffPasswordParams) {
    try {
        const session = await getServerSession(authOptions);
        const sessionUser = session?.user as any;
        if (!sessionUser || !sessionUser.id) {
            return { success: false, error: "Unauthorized: Session expired or invalid." };
        }

        const allowedRoles = ["TREASURY_STAFF", "ADMIN", "BARANGAY_ADMIN", "ADMIN_AIDE", "LGU_ADMIN", "SUPERADMIN"];
        if (!allowedRoles.includes(sessionUser.role)) {
            return { success: false, error: "Forbidden: You do not have permission to modify transaction records." };
        }

        const inputPassword = params.password?.trim();
        if (!inputPassword) {
            return { success: false, error: "Password is required for authorization." };
        }

        const dbStaff = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { id: true, name: true, email: true, role: true, department: true, password: true }
        });

        if (!dbStaff || !dbStaff.password) {
            return { success: false, error: "Staff user record not found or password not configured." };
        }

        const isMatch = await bcrypt.compare(inputPassword, dbStaff.password);
        if (!isMatch) {
            if (params.transactionId) {
                await logActivity({
                    action: "EVALUATION",
                    entityType: "TransactionProfile",
                    entityId: params.transactionId,
                    entityName: "Profile / Gross Adjustment Authorization (Failed Attempt)",
                    description: `Failed authorization unlock attempt on transaction ${params.transactionId} by ${dbStaff.name || dbStaff.email} (Incorrect Password).`,
                    metadata: {
                        attemptedBy: dbStaff.email,
                        attemptedAt: new Date().toISOString()
                    }
                });
            }
            return { success: false, error: "Incorrect password. Authorization denied." };
        }

        const staffName = dbStaff.name || dbStaff.email?.split("@")[0] || "Treasury Staff";
        return {
            success: true,
            data: {
                authorizedBy: staffName,
                authorizedEmail: dbStaff.email,
                authorizedRole: dbStaff.role,
                department: dbStaff.department || "TREASURY"
            }
        };
    } catch (error: any) {
        console.error("[verifyStaffPasswordToUnlockAction] error:", error);
        return { success: false, error: error?.message || "Failed to authenticate password." };
    }
}

interface UpdateTransactionProfileParams {
    transactionId: string;
    updatedProfile: {
        firstName?: string;
        middleName?: string;
        lastName?: string;
        suffix?: string;
        dateOfBirth?: string;
        gender?: string;
        civilStatus?: string;
        citizenship?: string;
        height?: string;
        weight?: string;
        placeOfBirth?: string;
        contactNumber?: string;
        occupation?: string;
        houseNumber?: string;
        street?: string;
        sitio?: string;
        purok?: string;
        barangay?: string;
        municipality?: string;
        province?: string;
    };
    declaredGross?: number;
    authorizedStaffName?: string;
    reason?: string;
}

/**
 * Saves all modified profile fields & declared gross income, and writes a full AuditLog entry
 */
export async function saveTransactionIdentityProfileAndGrossAction(params: UpdateTransactionProfileParams) {
    try {
        const session = await getServerSession(authOptions);
        const sessionUser = session?.user as any;
        if (!sessionUser || !sessionUser.id) {
            return { success: false, error: "Unauthorized: Session expired or invalid." };
        }

        const allowedRoles = ["TREASURY_STAFF", "ADMIN", "BARANGAY_ADMIN", "ADMIN_AIDE", "LGU_ADMIN", "SUPERADMIN"];
        if (!allowedRoles.includes(sessionUser.role)) {
            return { success: false, error: "Forbidden: You do not have permission to modify citizen identity profiles." };
        }

        const dbStaff = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { id: true, name: true, email: true, role: true, department: true }
        });

        if (!dbStaff) {
            return { success: false, error: "Staff user record not found." };
        }

        // Fetch target transaction
        const targetTx = await prisma.transaction.findUnique({
            where: { id: params.transactionId },
            include: {
                user: {
                    include: {
                        residentProfile: true
                    }
                },
                type: true
            }
        });

        if (!targetTx) {
            return { success: false, error: "Transaction record not found." };
        }

        const rawSnap = targetTx.residentSnapshot;
        const currentSnapshot = typeof rawSnap === "string"
            ? (() => { try { return JSON.parse(rawSnap); } catch { return {}; } })()
            : (rawSnap || {});

        const rawAdd = targetTx.additionalData;
        const currentAdditional = typeof rawAdd === "string"
            ? (() => { try { return JSON.parse(rawAdd); } catch { return {}; } })()
            : (rawAdd || {});

        const incoming = params.updatedProfile || {};

        // Track field-by-field diff
        const diffs: Record<string, { from: any; to: any }> = {};
        const fieldKeys: (keyof typeof incoming)[] = [
            "firstName", "middleName", "lastName", "suffix",
            "dateOfBirth", "gender", "civilStatus", "citizenship",
            "height", "weight", "placeOfBirth", "contactNumber",
            "occupation", "houseNumber", "street", "sitio",
            "purok", "barangay", "municipality", "province"
        ];

        for (const key of fieldKeys) {
            const oldVal = (currentSnapshot[key] ?? currentAdditional[key] ?? (targetTx.user?.residentProfile as any)?.[key] ?? "")?.toString().trim();
            const newVal = (incoming[key] ?? "")?.toString().trim();
            if (newVal !== undefined && newVal !== oldVal) {
                diffs[key] = { from: oldVal || "—", to: newVal || "—" };
            }
        }

        // Also track declared gross difference if provided
        if (params.declaredGross !== undefined) {
            const oldGross = Number(currentAdditional.income ?? (targetTx.fiscalSnapshot as any)?.income ?? 0);
            const newGross = Number(params.declaredGross);
            if (oldGross !== newGross) {
                diffs["declaredGross"] = {
                    from: `₱${oldGross.toLocaleString()}`,
                    to: `₱${newGross.toLocaleString()}`
                };
            }
        }

        if (Object.keys(diffs).length === 0) {
            return { success: false, error: "No changes detected. Profile and assessment values are identical." };
        }

        // Build updated snapshot
        const updatedSnapshot = {
            ...currentSnapshot,
            ...incoming,
            firstName: incoming.firstName ?? currentSnapshot.firstName,
            middleName: incoming.middleName ?? currentSnapshot.middleName,
            lastName: incoming.lastName ?? currentSnapshot.lastName,
            suffix: incoming.suffix ?? currentSnapshot.suffix,
            dateOfBirth: incoming.dateOfBirth ?? currentSnapshot.dateOfBirth,
            gender: incoming.gender ?? currentSnapshot.gender,
            civilStatus: incoming.civilStatus ?? currentSnapshot.civilStatus,
            citizenship: incoming.citizenship ?? currentSnapshot.citizenship,
            height: incoming.height ?? currentSnapshot.height,
            weight: incoming.weight ?? currentSnapshot.weight,
            placeOfBirth: incoming.placeOfBirth ?? currentSnapshot.placeOfBirth,
            contactNumber: incoming.contactNumber ?? currentSnapshot.contactNumber,
            occupation: incoming.occupation ?? currentSnapshot.occupation,
            houseNumber: incoming.houseNumber ?? currentSnapshot.houseNumber,
            street: incoming.street ?? currentSnapshot.street,
            barangay: incoming.barangay ?? currentSnapshot.barangay,
            municipality: incoming.municipality ?? currentSnapshot.municipality ?? "E-LGU",
            province: incoming.province ?? currentSnapshot.province ?? "{{PROVINCE_NAME}}",
        };

        // Build updated additionalData
        const updatedAdditionalData = {
            ...currentAdditional,
            placeOfBirth: incoming.placeOfBirth ?? currentAdditional.placeOfBirth,
            height: incoming.height ?? currentAdditional.height,
            weight: incoming.weight ?? currentAdditional.weight,
            civilStatus: incoming.civilStatus ?? currentAdditional.civilStatus,
            gender: incoming.gender ?? currentAdditional.gender,
            citizenship: incoming.citizenship ?? currentAdditional.citizenship,
            occupation: incoming.occupation ?? currentAdditional.occupation,
            ...(params.declaredGross !== undefined ? { income: params.declaredGross } : {}),
            lastModifiedByStaff: dbStaff.name || dbStaff.email,
            lastModifiedAt: new Date().toISOString()
        };

        // Perform transactional update
        await prisma.$transaction(async (txPrisma: any) => {
            // 1. Update the transaction
            await txPrisma.transaction.update({
                where: { id: params.transactionId },
                data: {
                    residentSnapshot: JSON.stringify(updatedSnapshot),
                    additionalData: JSON.stringify(updatedAdditionalData),
                }
            });

            // 2. If it's a registered citizen applying for SELF, synchronize their resident master profile
            const isSelf = currentAdditional.applicantTarget !== "RELATIVE";
            if (isSelf && targetTx.userId) {
                const residentRecord = await txPrisma.resident.findUnique({
                    where: { userId: targetTx.userId }
                });

                if (residentRecord) {
                    await txPrisma.resident.update({
                        where: { id: residentRecord.id },
                        data: {
                            firstName: incoming.firstName || residentRecord.firstName,
                            middleName: incoming.middleName !== undefined ? incoming.middleName : residentRecord.middleName,
                            lastName: incoming.lastName || residentRecord.lastName,
                            suffix: incoming.suffix !== undefined ? incoming.suffix : residentRecord.suffix,
                            dateOfBirth: incoming.dateOfBirth ? new Date(incoming.dateOfBirth) : residentRecord.dateOfBirth,
                            gender: incoming.gender || residentRecord.gender,
                            civilStatus: incoming.civilStatus || residentRecord.civilStatus,
                            citizenship: incoming.citizenship || residentRecord.citizenship,
                            height: incoming.height || residentRecord.height,
                            weight: incoming.weight || residentRecord.weight,
                            placeOfBirth: incoming.placeOfBirth || residentRecord.placeOfBirth,
                            contactNumber: incoming.contactNumber || residentRecord.contactNumber,
                            occupation: incoming.occupation || residentRecord.occupation,
                            houseNumber: incoming.houseNumber || residentRecord.houseNumber,
                            street: incoming.street || residentRecord.street,
                            barangay: incoming.barangay || residentRecord.barangay,
                        }
                    });
                }
            }
        });

        // 3. Create AuditLog entry with full diff metadata
        const staffName = params.authorizedStaffName || dbStaff.name || dbStaff.email?.split("@")[0] || "Treasury Staff";
        const sanitizedReason = params.reason ? params.reason.trim() : "Treasury Counter Adjustment";
        const changedFieldNames = Object.keys(diffs).join(", ");

        const diffSummary = Object.entries(diffs)
            .map(([field, delta]) => `${field} ("${delta.from}" ➔ "${delta.to}")`)
            .join("; ");

        await logActivity({
            action: "UPDATE",
            entityType: "TransactionProfile",
            entityId: params.transactionId,
            entityName: `${updatedSnapshot.firstName || ""} ${updatedSnapshot.lastName || ""}`.trim() || "Citizen Profile",
            description: `Staff ${staffName} authorized and updated transaction ${params.transactionId}. Modified: ${diffSummary}. Reason: ${sanitizedReason}`,
            metadata: {
                transactionId: params.transactionId,
                queueNumber: targetTx.queueNumber,
                serviceType: targetTx.type?.name || "Service",
                reason: sanitizedReason,
                changedFields: changedFieldNames,
                diffs: diffs,
                authorizedBy: dbStaff.email,
                authorizedRole: dbStaff.role,
                department: dbStaff.department || "TREASURY",
                authorizedAt: new Date().toISOString()
            }
        });

        revalidatePath(`/admin/treasury/${params.transactionId}`);
        revalidatePath("/admin/treasury");
        revalidatePath("/admin/audit-logs");

        return {
            success: true,
            data: {
                authorizedBy: staffName,
                authorizedAt: new Date().toISOString(),
                updatedSnapshot
            }
        };
    } catch (error: any) {
        console.error("[saveTransactionIdentityProfileAndGrossAction] error:", error);
        return { success: false, error: error?.message || "Failed to save profile changes." };
    }
}
