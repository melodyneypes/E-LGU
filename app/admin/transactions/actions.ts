"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateCedula } from "@/lib/cedula";
import { calculateBusinessPermit } from "@/lib/business-permit";

import { sendEmail } from "@/lib/mail";
import { uploadFile, validatePayloadFiles } from "@/lib/storage";
import { sanitizeString, sanitizeObject, sanitizeUrl } from "@/lib/validation";
import { updateDeceasedResidentStatus } from "./death-regis-actions";

const isUserAdminAide = (u: any) => u?.role === "ADMIN_AIDE" || (u?.role === "ADMIN" && u?.department?.toUpperCase() === "BPLO");


async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Asserts that a valid logged-in session exists and returns the user object.
 * Throws an error if unauthorized.
 */
async function assertSessionUser() {
    const session = await getSession();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }
    return session.user;
}

/**
 * Asserts that the user possesses one of the allowed roles.
 * Throws a Forbidden error if access is denied.
 */
function assertUserRoles(user: any, allowedRoles: string[]) {
    if (!user?.role || !allowedRoles.includes(user.role)) {
        throw new Error("Forbidden: Access Denied");
    }
}


/**
 * Fetches the current logged -in user's resident profile
 */
export async function getCurrentUserResident() {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const resident = await prisma.resident.findFirst({
            where: { userId: session.user.id },
            include: { user: true }
        });

        return { success: true, data: resident };
    } catch (error) {
        console.error("Get current resident error:", error);
        return { success: false, error: "Failed to fetch resident profile" };
    }
}

/**
 * Fetches all active barangays from BarangayInfo
 */
export async function getBarangaysList() {
    try {
        const barangays = await prisma.barangayInfo.findMany({
            select: {
                id: true,
                name: true
            },
            orderBy: {
                name: "asc"
            }
        });
        return { success: true, data: barangays.map((b: { id: string; name: string }) => b.name) };
    } catch (error) {
        console.error("Get barangays list error:", error);
        return { success: false, error: "Failed to fetch barangays list" };
    }
}

/**
 * Seed or ensure Cedula Transaction Types exist
 */
export async function ensureCedulaTransactionTypes() {
    try {
        const types = [
            {
                code: "CEDULA_IND",
                name: "Community Tax Certificate - Individual",
                description: "Tax certificate for individuals including employees, self-employed, and property owners.",
                level: 1,
                category: "CEDULA",
                baseFee: 5.00,
                deliveryFee: 50.00,
                isFixed: false,
                requiredDocs: ["Valid Government ID", "Proof of Income (Payslip/BIR 2316)"],
                formSchema: {
                    applicantType: "INDIVIDUAL",
                    fields: ["income", "propertyValue"]
                },
                requiresBusinessName: false,
                supportsECopy: true,
                logicCode: "cedula_calc_v1"
            },
            {
                code: "CEDULA_JUR",
                name: "Community Tax Certificate - Juridical",
                description: "Tax certificate for corporations, partnerships, and other juridical entities.",
                level: 1,
                category: "CEDULA",
                baseFee: 500.00,
                deliveryFee: 50.00,
                isFixed: false,
                requiredDocs: ["Valid ID of Representative", "Business Income Statement"],
                formSchema: {
                    applicantType: "JURIDICAL",
                    fields: ["businessName", "income", "propertyValue"]
                },
                requiresBusinessName: true,
                supportsECopy: true,
                logicCode: "cedula_calc_v1"
            }
        ];

        for (const t of types) {
            await prisma.transactionType.upsert({
                where: { code: t.code },
                update: {
                    requiresBusinessName: t.requiresBusinessName,
                    supportsECopy: t.supportsECopy
                },
                create: t
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Ensure transaction types error:", error);
        return { success: false, error: "Failed to initialize service types" };
    }
}

export async function ensureBusinessPermitTransactionTypes() {
    try {
        const types = [
            {
                code: "BUSINESS_PERMIT_NEW",
                name: "Business Permit - New",
                description: "Apply for a new business permit for starting a business in Mapandan, Pangasinan.",
                level: 1,
                category: "Business Permit",
                baseFee: 500.00,
                deliveryFee: 100.00,
                isFixed: false,
                requiredDocs: [
                    "Unified Form Community Tax Certificate (CTC)",
                    "DTI/SEC/CDA Registration",
                    "Barangay Clearance",
                    "Valid ID of Business Owner",
                    "Photo of Business Location",
                    "Sanitary Permit",
                    "Fire Safety Inspection Certificate"
                ],
                formSchema: {
                    businessType: "NEW",
                    fields: ["businessName", "tradeName", "orgType", "dtiSecNumber", "lineOfBusiness", "capitalInvestment", "employeeCount", "businessArea"]
                },
                requiresBusinessName: true,
                supportsECopy: true,
                logicCode: "business_permit_calc_v1"
            },
            {
                code: "BUSINESS_PERMIT_RENEW",
                name: "Business Permit - Renewal",
                description: "Renew your existing business permit. Calculated based on previous annual gross sales.",
                level: 1,
                category: "Business Permit",
                baseFee: 500.00,
                deliveryFee: 100.00,
                isFixed: false,
                requiredDocs: [
                    "Unified Form Community Tax Certificate (CTC)",
                    "DTI/SEC/CDA Registration",
                    "Barangay Clearance",
                    "Valid ID of Business Owner",
                    "Photo of Business Location",
                    "Sanitary Permit",
                    "Fire Safety Inspection Certificate"
                ],
                formSchema: {
                    businessType: "RENEWAL",
                    fields: ["businessName", "tradeName", "orgType", "permitNumber", "lineOfBusiness", "grossSales", "employeeCount", "businessArea"]
                },
                requiresBusinessName: true,
                supportsECopy: true,
                logicCode: "business_permit_calc_v1"
            }
        ];

        for (const t of types) {
            await prisma.transactionType.upsert({
                where: { code: t.code },
                update: {
                    requiresBusinessName: t.requiresBusinessName,
                    supportsECopy: t.supportsECopy,
                    requiredDocs: t.requiredDocs,
                    formSchema: t.formSchema
                },
                create: t
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Ensure business permit types error:", error);
        return { success: false, error: "Failed to initialize BPLO service types" };
    }
}

export async function ensureBuildingPermitTransactionTypes() {
    try {
        const types = [
            {
                code: "BUILDING_PERMIT",
                name: "Building Permit",
                description: "Apply for a new building permit online. Manage your construction requirements.",
                level: 1,
                category: "Building Permit",
                baseFee: 1000.00,
                deliveryFee: 100.00,
                isFixed: false,
                requiredDocs: [
                    "Plans duly signed & sealed by licensed professional",
                    "Certified true copy of Tax Declaration",
                    "Xerox copy of land title",
                    "Community Tax Certificate (Cedula)",
                    "Electrical & Sanitary permit",
                    "Locational clearance",
                    "Fire Safety clearance"
                ],
                formSchema: {
                    type: "BUILDING_PERMIT",
                    fields: ["applicantName", "projectType", "floorArea", "estimatedCost", "location"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            }
        ];

        for (const t of types) {
            await prisma.transactionType.upsert({
                where: { code: t.code },
                update: {
                    name: t.name,
                    description: t.description,
                    baseFee: t.baseFee,
                    deliveryFee: t.deliveryFee,
                    requiredDocs: t.requiredDocs,
                    formSchema: t.formSchema,
                    supportsECopy: t.supportsECopy
                },
                create: t
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Ensure building permit types error:", error);
        return { success: false, error: "Failed to initialize Building Permit service types" };
    }
}

export async function ensureCivilRegistryTransactionTypes() {
    try {
        const types = [
            {
                code: "LCR_BIRTH",
                name: "Birth Certificate (Certified Copy)",
                description: "Request for a certified true copy of a birth certificate from the Local Civil Registry.",
                level: 1,
                category: "Civil Registry",
                baseFee: 150.00,
                deliveryFee: 100.00,
                isFixed: true,
                requiredDocs: ["Valid ID of Applicant", "Authorization Letter (if not owner)"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "BIRTH",
                    fields: ["fullName", "dateOfBirth", "placeOfBirth", "fathersName", "mothersName"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            },
            {
                code: "LCR_BIRTH_REG",
                name: "Birth Registration",
                description: "Register a new birth record with the Local Civil Registry.",
                level: 1,
                category: "Civil Registry",
                baseFee: 100.00,
                deliveryFee: 100.00,
                isFixed: true,
                requiredDocs: ["Certificate of Live Birth", "Marriage Certificate of Parents", "Valid ID of Informant"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "BIRTH_REG",
                    fields: ["fullName", "dateOfBirth", "placeOfBirth", "fathersName", "mothersName"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            },
            {
                code: "LCR_MARRIAGE",
                name: "Marriage Certificate (Certified Copy)",
                description: "Request for a certified true copy of a marriage certificate from the Local Civil Registry.",
                level: 1,
                category: "Civil Registry",
                baseFee: 150.00,
                deliveryFee: 100.00,
                isFixed: true,
                requiredDocs: ["Valid ID of Applicant", "Authorization Letter (if not owner)"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "MARRIAGE",
                    fields: ["husbandName", "wifeName", "dateOfMarriage", "placeOfMarriage"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            },
            {
                code: "LCR_MARRIAGE_LICENSE",
                name: "Marriage License Application",
                description: "Apply for a marriage license to be married in Mapandan.",
                level: 1,
                category: "Civil Registry",
                baseFee: 862.00,
                deliveryFee: 0.00,
                isFixed: true,
                requiredDocs: [
                    "Municipal Form No. 90",
                    "Community Tax Certificate",
                    "Parental Consent of the father/mother",
                    "Certificate of Family Planning",
                    "Certificate of Pre-Marriage Counseling",
                    "Birth Certificate of Applicant 1",
                    "Birth Certificate of Applicant 2",
                    "Government ID of Applicant 1",
                    "Government ID of Applicant 2",
                    "Seminar Attendance Proof",
                    "Legal Capacity (if one party is a foreigner)"
                ],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "MARRIAGE_LICENSE",
                    fields: ["applicant1", "applicant2", "requiredDocs"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            },
            {
                code: "LCR_MARRIAGE_REG",
                name: "Marriage Registration",
                description: "Register a new marriage record with the Local Civil Registry.",
                level: 1,
                category: "Civil Registry",
                baseFee: 100.00,
                deliveryFee: 100.00,
                isFixed: true,
                requiredDocs: ["Accomplished Certificate of Marriage", "PSA Negative Certificate", "Affidavit of Delayed Registration", "Certified Copy of Marriage License"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "MARRIAGE_REG",
                    fields: ["applicant1", "applicant2", "dateOfMarriage", "placeOfMarriage"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            },
            {
                code: "LCR_DEATH",
                name: "Death Certificate (Certified Copy)",
                description: "Request for a certified true copy of a death certificate from the Local Civil Registry.",
                level: 1,
                category: "Civil Registry",
                baseFee: 150.00,
                deliveryFee: 100.00,
                isFixed: true,
                requiredDocs: ["Valid ID of Applicant"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "DEATH",
                    fields: ["deceasedName", "dateOfDeath", "placeOfDeath"]
                },
                requiresBusinessName: false,
                supportsECopy: true
            },
            {
                code: "LCR_DEATH_REG",
                name: "Death Registration",
                description: "Register a new death record with the Local Civil Registry.",
                level: 1,
                category: "Civil Registry",
                baseFee: 0.00,
                deliveryFee: 100.00,
                isFixed: true,
                requiredDocs: ["Municipal Form No. 103", "Valid ID of Informant"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "DEATH_REG",
                    fields: ["fullName", "dateOfBirth", "dateOfDeath", "placeOfDeath", "causeOfDeath", "gender", "civilStatus", "fathersName", "mothersName"]
                },
                requiresBusinessName: false,
                supportsECopy: true,
                lateFee: 300.00
            },
            {
                code: "LCR_PSA_ENDORSEMENT",
                name: "Birth PSA Endorsement",
                description: "Request PSA Endorsement for Birth Certificate.",
                level: 1,
                category: "Civil Registry",
                baseFee: 200.00,
                deliveryFee: 0.00,
                isFixed: true,
                requiredDocs: ["PSA Negative Certification"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "BIRTH_PSA_ENDORSEMENT",
                    fields: ["originalTransactionId", "psaNegCertUrl"]
                },
                requiresBusinessName: false,
                supportsECopy: true,
                processorRole: "TREASURY_STAFF"
            },
            {
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
            },
            {
                code: "LCR_MARRIAGE_PSA_ENDORSEMENT",
                name: "Marriage PSA Endorsement",
                description: "Request PSA Endorsement for Marriage Certificate.",
                level: 1,
                category: "Civil Registry",
                baseFee: 200.00,
                deliveryFee: 0.00,
                isFixed: true,
                requiredDocs: ["PSA Negative Certification"],
                formSchema: {
                    type: "CIVIL_REGISTRY",
                    registryType: "MARRIAGE_PSA_ENDORSEMENT",
                    fields: ["originalTransactionId", "psaNegCertUrl"]
                },
                requiresBusinessName: false,
                supportsECopy: true,
                processorRole: "TREASURY_STAFF"
            }
        ];

        for (const t of types) {
            await prisma.transactionType.upsert({
                where: { code: t.code },
                update: {
                    name: t.name,
                    description: t.description,
                    requiredDocs: t.requiredDocs,
                    formSchema: t.formSchema,
                    supportsECopy: t.supportsECopy
                },
                create: t as any
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Ensure civil registry types error:", error);
        return { success: false, error: "Failed to initialize Civil Registry service types" };
    }
}

function getPHTimeISOString() {
    const phOffset = 8 * 60 * 60 * 1000; // UTC+8
    const phTime = new Date(Date.now() + phOffset);
    return phTime.toISOString().replace("Z", "+08:00");
}

export async function submitCivilRegistryTransaction(formData: FormData) {
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

        // Dynamic file extraction from FormData -- accept File-like blobs too
        const isFileLike = (v: any) => {
            return v && (v instanceof File || (typeof v === 'object' && typeof v.arrayBuffer === 'function' && typeof v.name === 'string'));
        };

        for (const [key, value] of formData.entries()) {
            if (isFileLike(value)) {
                const fileLike = value as File;
                if ((fileLike as any).size && (fileLike as any).size > 0) {
                    // Use a standard bucket and specific folder
                    const url = await processFileUpload(fileLike, `lcr/${registryType.toLowerCase()}`);
                    if (!url) {
                        return { success: false, error: `Failed to upload required document: ${key}. Please check your connection and try again.` };
                    }
                    files[key] = url;
                }
            }
        }

        // Debug: log incoming additionalData and files to help trace missing fields
        console.log("[submitCivilRegistryTransaction] additionalData:", additionalData);
        console.log("[submitCivilRegistryTransaction] files:", files);

        // Handle default miscFee for Birth/Death/Marriage requests (both certificates and registrations/licenses)
        let initialMiscFee = additionalData.miscFee;
        let initialTotalAmount = additionalData.totalAmount;
        let initialFiscalSnapshot: any = null;

        const isLCRType = [
            "BIRTH", "DEATH", "MARRIAGE",
            "BIRTH_REG", "DEATH_REG", "MARRIAGE_REG",
            "MARRIAGE_LICENSE", "PSA_ENDORSEMENT",
            "BIRTH_PSA_ENDORSEMENT", "DEATH_PSA_ENDORSEMENT", "MARRIAGE_PSA_ENDORSEMENT"
        ].includes(registryType);

        if (isLCRType) {
            const transType = await prisma.transactionType.findUnique({
                where: { id: typeId }
            });
            if (initialMiscFee === undefined || initialMiscFee === null || Number(initialMiscFee) === 0) {
                initialMiscFee = (additionalData.totalAmount && Number(additionalData.totalAmount) > 0)
                    ? Number(additionalData.totalAmount)
                    : (transType ? Number(transType.baseFee) : 0);
            }
            // No basicTax. Total is just the miscFee.
            initialTotalAmount = Number(initialMiscFee);
            initialFiscalSnapshot = {
                basicTax: 0,
                additionalTax: 0,
                penaltyCharge: 0,
                deliveryFee: 0,
                miscFee: Number(initialMiscFee),
                totalAmount: initialTotalAmount
            };
        }

        const updatedAdditionalData = {
            ...existingAddData,
            ...additionalData,
            ...files,
            registryType,
            submittedAt: getPHTimeISOString(),
            ...(initialMiscFee !== undefined ? { miscFee: initialMiscFee } : {})
        };
        console.log("[submitCivilRegistryTransaction] updatedAdditionalData:", updatedAdditionalData);

        // Validate magic numbers of all uploaded files
        const fileCheck = await validatePayloadFiles(updatedAdditionalData);
        if (!fileCheck.success) {
            return { success: false, error: fileCheck.error || "File validation failed." };
        }

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
                        ...(initialFiscalSnapshot ? { fiscalSnapshot: initialFiscalSnapshot } : {})
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
        // No payment record created at submission time for civil registry.

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        return { success: true, data: transaction };
    } catch (error: any) {
        console.error("Submit civil registry error:", error);
        // Include the error message for better debugging
        return {
            success: false,
            error: error?.message || "Failed to submit registry request"
        };
    }
}

export async function submitBirthRegistration(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        // Validate required fields before parsing to avoid runtime exceptions
        const missing: string[] = [];
        const typeIdRaw = formData.get("typeId");
        const residentSnapshotRaw = formData.get("residentSnapshot");
        const additionalDataRaw = formData.get("additionalData");

        if (!typeIdRaw) missing.push("typeId");
        if (!residentSnapshotRaw) missing.push("residentSnapshot");
        if (!additionalDataRaw) missing.push("additionalData");

        if (missing.length > 0) {
            return { success: false, error: "Missing required fields", missingFields: missing };
        }

        const typeId = sanitizeString(typeIdRaw as string);
        const residentSnapshot = sanitizeObject(JSON.parse(residentSnapshotRaw as string));
        const additionalData = sanitizeObject(JSON.parse(additionalDataRaw as string));

        // File uploads
        const files: Record<string, string | null> = {};
        for (const [key, value] of formData.entries()) {
            if (value instanceof File && value.size > 0) {
                const url = await processFileUpload(value, "lcr_birth_reg");
                files[key] = url;
            }
        }

        const updatedAdditionalData = {
            ...additionalData,
            ...files,
            registryType: "BIRTH_REG",
            submittedAt: getPHTimeISOString()
        };

        // Server-side validation: ensure required documents are present
        const regType = additionalData.registrationType || "STANDARD";
        const parentsMarried = typeof additionalData.parentsMarried !== 'undefined' ? !!additionalData.parentsMarried : true;
        const requiredDocsStandard = parentsMarried ? ["marriageCertificate", "municipalForm102"] : ["communityTaxCertificate"];
        const requiredDocsLate = ["negativePSA", "colb", "affidavitDelayed", "supportingEvidence1", "supportingEvidence2"];
        const requiredKeys = regType === "STANDARD" ? requiredDocsStandard : requiredDocsLate;
        const missingDocs = requiredKeys.filter(k => !updatedAdditionalData[k]);
        if (missingDocs.length > 0) {
            return { success: false, error: "Missing required documents", missingDocuments: missingDocs };
        }

        const transaction = await prisma.$transaction(async (tx: any) => {
            // Create the transaction record for tracking
            const t = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: "FOR_REQUESTING",
                    fulfillmentType: additionalData.fulfillmentType || null,
                    paymentType: null,
                    residentSnapshot,
                    additionalData: updatedAdditionalData,
                    totalAmount: additionalData.miscFee ?? additionalData.totalAmount ?? 0,
                    businessName: null,
                }
            });

            // Update resident contact info
            await tx.resident.update({
                where: { userId: session.user.id },
                data: {
                    contactNumber: residentSnapshot.contactNumber,
                    email: residentSnapshot.email,
                }
            });

            return t;
        });

        // No payment record created at submission time for birth registration.

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        return { success: true, data: transaction };
    } catch (error) {
        console.error("Submit birth registration error:", error);
        return { success: false, error: "Failed to submit birth registration" };
    }
}

export async function searchCivilRegistryRecords(type: string, query: string) {
    try {
        const user = await assertSessionUser();
        assertUserRoles(user, ["ADMIN", "TREASURY_STAFF", "ADMIN_AIDE"]);
        if (type === "BIRTH") {
            const records = await prisma.birthCertificateRegistry.findMany({
                where: {
                    subjectName: {
                        contains: query,
                        mode: 'insensitive'
                    }
                },
                take: 5
            });
            return { success: true, data: records };
        }
        return { success: true, data: [] };
    } catch (error: any) {
        console.error("Search LCR records error:", error);
        return { success: false, error: error?.message || "Failed to search records" };
    }
}

export async function getAllResidents() {
    try {
        const user = await assertSessionUser();
        assertUserRoles(user, ["ADMIN", "TREASURY_STAFF", "ADMIN_AIDE"]);

        const residents = await prisma.resident.findMany({
            where: { registrationStatus: "APPROVED" },
            orderBy: { lastName: "asc" }
        });

        return { success: true, data: residents };
    } catch (error: any) {
        console.error("Get all residents error:", error);
        return { success: false, error: error?.message || "Failed to fetch residents" };
    }
}

export async function submitBusinessPermitTransaction(formData: FormData) {
    try {
        const user = await assertSessionUser();

        // Validate required fields before parsing to avoid runtime exceptions and provide helpful feedback
        const missing: string[] = [];
        const typeIdRaw = formData.get("typeId");
        const residentSnapshotRaw = formData.get("residentSnapshot");
        const additionalDataRaw = formData.get("additionalData");

        if (!typeIdRaw) missing.push("typeId");
        if (!residentSnapshotRaw) missing.push("residentSnapshot");
        if (!additionalDataRaw) missing.push("additionalData");

        if (missing.length > 0) {
            return { success: false, error: "Missing required fields", missingFields: missing };
        }

        const typeId = sanitizeString(typeIdRaw as string);
        const residentSnapshot = sanitizeObject(JSON.parse(residentSnapshotRaw as string));
        const additionalData = sanitizeObject(JSON.parse(additionalDataRaw as string));
        const revisionId = formData.get("revisionId") ? sanitizeString(formData.get("revisionId") as string) : null;
        // Strike penalty check
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { rejectionCount: true }
        });
        if (dbUser && dbUser.rejectionCount >= 3) {
            return { success: false, error: "Submission blocked: Account suspended due to 3 rejection strikes. Please apply onsite at the Municipal Hall." };
        }

        // Fetch existing transaction if under revision to reuse existing file uploads
        let existingTx: any = null;
        if (revisionId) {
            existingTx = await prisma.transaction.findUnique({
                where: { id: revisionId }
            });
        }
        const existingAddData = existingTx?.additionalData as any;

        // Process BPLO Checklist file uploads with fallbacks for revision files
        const ctcFile = formData.get("ctcFile") as File | null;
        const dtiSecFile = formData.get("dtiSecFile") as File | null;
        const brgyClearanceFile = formData.get("brgyClearanceFile") as File | null;
        const ownerIdFile = formData.get("ownerIdFile") as File | null;
        const locationPhotoFile = formData.get("locationPhotoFile") as File | null;
        const sanitaryPermitFile = formData.get("sanitaryPermitFile") as File | null;
        const fireSafetyFile = formData.get("fireSafetyFile") as File | null;
        const birCorFile = formData.get("birCorFile") as File | null;
        const previousPermitFile = formData.get("previousPermitFile") as File | null;

        const ctcUrl = ctcFile ? await processFileUpload(ctcFile, "bp_ctc") : (additionalData.ctcUrl || existingAddData?.ctcUrl);
        const dtiSecUrl = dtiSecFile ? await processFileUpload(dtiSecFile, "bp_dti") : (additionalData.dtiSecUrl || existingAddData?.dtiSecUrl);
        const brgyClearanceUrl = brgyClearanceFile ? await processFileUpload(brgyClearanceFile, "bp_brgy") : (additionalData.brgyClearanceUrl || existingAddData?.brgyClearanceUrl);
        const ownerIdUrl = ownerIdFile ? await processFileUpload(ownerIdFile, "bp_owner_id") : (additionalData.ownerIdUrl || existingAddData?.ownerIdUrl || residentSnapshot?.idFrontUrl);
        const locationPhotoUrl = locationPhotoFile ? await processFileUpload(locationPhotoFile, "bp_location") : (additionalData.locationPhotoUrl || existingAddData?.locationPhotoUrl);
        const sanitaryPermitUrl = sanitaryPermitFile ? await processFileUpload(sanitaryPermitFile, "bp_sanitary") : (additionalData.sanitaryPermitUrl || existingAddData?.sanitaryPermitUrl);
        const fireSafetyUrl = fireSafetyFile ? await processFileUpload(fireSafetyFile, "bp_fire") : (additionalData.fireSafetyUrl || existingAddData?.fireSafetyUrl);
        const birCorUrl = birCorFile ? await processFileUpload(birCorFile, "bp_bir") : (additionalData.birCorUrl || existingAddData?.birCorUrl);
        const previousPermitUrl = previousPermitFile ? await processFileUpload(previousPermitFile, "bp_prev_permit") : (additionalData.previousPermitUrl || existingAddData?.previousPermitUrl);

        // Merge all BPLO file URLs into additionalData
        const updatedAdditionalData = {
            ...additionalData,
            ctcUrl,
            dtiSecUrl,
            brgyClearanceUrl,
            ownerIdUrl,
            locationPhotoUrl,
            sanitaryPermitUrl,
            fireSafetyUrl,
            birCorUrl,
            previousPermitUrl
        };

        // Validate magic numbers of all uploaded files
        const fileCheck = await validatePayloadFiles(updatedAdditionalData);
        if (!fileCheck.success) {
            return { success: false, error: fileCheck.error || "File validation failed." };
        }

        const txData = {
            userId: user.id,
            typeId,
            status: "FOR_INSPECTION",
            fulfillmentType: additionalData.fulfillmentType || null,
            paymentType: null,
            residentSnapshot,
            additionalData: updatedAdditionalData,
            totalAmount: 0,
            businessName: additionalData.businessName || null,
            rejectionRemarks: null, // Reset rejection remarks on resubmit!
            updatedAt: new Date()
        } as any;

        const [transaction] = await prisma.$transaction([
            // 1. Create or Update BPLO Transaction
            revisionId
                ? prisma.transaction.update({
                    where: { id: revisionId },
                    data: txData
                })
                : prisma.transaction.create({
                    data: txData
                }),
            // 2. Update permanent resident snapshot profile
            prisma.resident.update({
                where: { userId: user.id },
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
    } catch (error) {
        console.error("Submit business permit error:", error);
        return { success: false, error: "Failed to submit permit request" };
    }
}

export async function uploadECopyAction(formData: FormData) {
    try {
        const user = await assertSessionUser();
        assertUserRoles(user, ["ADMIN", "TREASURY_STAFF", "ADMIN_AIDE", "ENGINEER", "USER"]);
        const file = formData.get("file") as File;
        if (!file) return { success: false, error: "No file provided" };

        const url = await processFileUpload(file, "ecopies");
        if (!url) return { success: false, error: "Upload failed" };

        return { success: true, data: url };
    } catch (error) {
        console.error("Upload E-Copy error:", error);
        return { success: false, error: `Failed to upload file: ${error instanceof Error ? error.message : String(error)}` };
    }
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

// --- ACTIONS ---

/**
 * Fetch available transaction types (services)
 */
export async function getTransactionTypes(level?: number) {
    try {
        const where: any = { isActive: true };
        if (level) where.level = level;

        const types = await prisma.transactionType.findMany({
            where,
            orderBy: { name: "asc" }
        });
        return { success: true, data: types };
    } catch (error) {
        console.error("Fetch transaction types error:", error);
        return { success: false, error: "Failed to fetch services" };
    }
}

/**
 * Fetch a single transaction by ID (Resident/Admin)
 */
export async function getTransactionById(id: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: {
                type: true,
                cedula: true,
                businessPermit: true,
                birthCertificateRequest: true,
                birthCertificateRegistry: true,
                deathRegistration: true,
                deathCertificateRequest: true,
                marriageRegistration: true,
                marriageLicenseApplication: true,
                marriageCertificateRequest: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        residentProfile: true
                    }
                }
            }
        });
        if (!transaction) return { success: false, error: "Transaction not found" };

        const isBusinessPermit = transaction.type.code.startsWith("BUSINESS_PERMIT");

        // TREASURY_STAFF should not be able to view Business Permits in pre-screening status (FOR_INSPECTION)
        if (isBusinessPermit && user?.role === "TREASURY_STAFF" && ["FOR_INSPECTION"].includes(transaction.status)) {
            return { success: false, error: "Forbidden: Pre-screening and evaluation must be handled by an Admin Aide first." };
        }

        // ADMIN_AIDE should only be able to view Business Permit transactions
        if (isUserAdminAide(user) && !isBusinessPermit) {
            return { success: false, error: "Forbidden: Admin Aides can only access Business Permit transactions." };
        }

        // ENGINEER should only be able to view Building Permit transactions
        const isBuildingPermit = transaction.type.code.startsWith("BUILDING_PERMIT");
        if (user?.role === "ENGINEER" && !isBuildingPermit) {
            return { success: false, error: "Forbidden: Engineers can only access Building Permit transactions." };
        }

        // Ordinary resident check: can only fetch their own transactions
        if (user?.role === "USER" && transaction.userId !== user.id) {
            return { success: false, error: "Forbidden" };
        }

        return { success: true, data: transaction as any };
    } catch (error: any) {
        console.error("Fetch transaction by id error:", error);
        return { success: false, error: error?.message || "Failed to fetch transaction details" };
    }
}

/**
 * Fetch delivery fee configuration for a specific barangay
 */
export async function getDeliveryFeeByBarangay(name: string) {
    try {
        const brgy = await prisma.barangayInfo.findUnique({
            where: { name }
        });
        return {
            success: true,
            data: {
                fee: (brgy as any)?.deliveryFee || 0,
                isActive: (brgy as any)?.isLogisticsActive ?? true
            }
        };
    } catch (error) {
        console.error("Error fetching barangay logistics:", error);
        return { success: false, error: "Failed to fetch logistics data" };
    }
}

/**
 * Fetch active barangays and their delivery fees for public/citizen use
 */
export async function getPublicBarangayLogistics() {
    try {
        const barangays = await prisma.barangayInfo.findMany({
            where: { isLogisticsActive: true } as any,
            select: {
                name: true,
                deliveryFee: true,
                estimatedDeliveryDays: true
            } as any,
            orderBy: { name: 'asc' }
        });
        return { success: true, data: barangays };
    } catch (error) {
        console.error("Error fetching public logistics:", error);
        return { success: false, error: "Failed to fetch logistics data" };
    }
}

/**
 * Fetch all barangays and their logistics configuration
 */
export async function getAllBarangayLogistics() {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || user.role !== "ADMIN") {
            // Optional: You can allow TREASURY_STAFF to view but not edit, 
            // but for now, let's stick to ADMIN.
            return { success: false, error: "Forbidden" };
        }

        const barangays = await prisma.barangayInfo.findMany({
            orderBy: { name: 'asc' }
        });
        return { success: true, data: barangays };
    } catch (error) {
        console.error("Error fetching all logistics:", error);
        return { success: false, error: "Failed to fetch logistics data" };
    }
}

/**
 * Update logistics configuration for a barangay
 */
export async function updateBarangayLogistics(id: string, data: { deliveryFee: number, isLogisticsActive: boolean, estimatedDeliveryDays: number }) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "Forbidden" };
        }

        const updated = await prisma.barangayInfo.update({
            where: { id },
            data: {
                deliveryFee: data.deliveryFee,
                isLogisticsActive: data.isLogisticsActive,
                estimatedDeliveryDays: data.estimatedDeliveryDays
            } as any
        });

        revalidatePath("/admin/logistics");
        return { success: true, data: updated };
    } catch (error) {
        console.error("Error updating logistics:", error);
        return { success: false, error: "Failed to update configuration" };
    }
}

/**
 * Fetch a system setting by key
 */
export async function getSystemSettingAction(key: string, defaultValue: string = "") {
    try {
        await assertSessionUser();
        const setting = await prisma.systemSetting.findUnique({
            where: { key }
        });
        return { success: true, data: setting?.value || defaultValue };
    } catch (error) {
        console.error(`Error fetching system setting ${key}:`, error);
        return { success: false, error: "Failed to fetch setting", data: defaultValue };
    }
}

/**
 * Submit a new transaction request (Citizen side)
 */
export async function submitTransaction(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const typeId = sanitizeString(formData.get("typeId") as string);
        const transactionType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        const isBusinessPermit = transactionType?.code.startsWith("BUSINESS_PERMIT") || false;
        const initialStatus = isBusinessPermit ? "FOR_INSPECTION" : "FOR_REQUESTING";

        // Snapshots and Data
        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));

        // Files
        const idFile = formData.get("idFile") as File;
        const proofFile = formData.get("proofFile") as File;
        const existingIdUrl = sanitizeUrl(formData.get("existingIdUrl") as string);

        let idUrl = await processFileUpload(idFile, "ids");
        if (!idUrl && existingIdUrl) idUrl = existingIdUrl;

        const proofUrl = await processFileUpload(proofFile, "proofs");

        // Merge file URLs into additionalData
        const updatedAdditionalData = {
            ...additionalData,
            validIdUrl: idUrl,
            proofOfIncomeUrl: proofUrl
        };

        // --- BEST PRACTICE: ATOMICITY ---
        // We use a prisma.$transaction here to ensure that both the transaction record 
        // and the profile update happen together. If one fails, the entire move rolls back 
        // to keep your database super clean and consistent!
        const [transaction] = await prisma.$transaction([
            // 1. Create the Transaction Record
            prisma.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: initialStatus,
                    fulfillmentType: null,
                    paymentType: null,
                    residentSnapshot,
                    additionalData: updatedAdditionalData,
                    totalAmount: 0,
                    businessName: additionalData.businessName || null,
                } as any
            }),
            // 2. Update the Permanent Resident Profile
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
        revalidatePath("/admin/transactions"); // Also update admin view
        return { success: true, data: transaction };
    } catch (error) {
        console.error("Submit transaction error:", error);
        return { success: false, error: "Failed to submit request" };
    }
}

/**
 * Evaluate a Cedula Transaction (Treasury Staff side)
 */
export async function evaluateCedulaTransaction(id: string, deliveryFeeOverride?: number, adminNotes?: string, bpFeeLineItems?: { label: string; amount: number }[], registryBookVerification?: string, scannedDocUrl?: string, orSeriesNumber?: string, miscFeeOverride?: number) {
    try {
        const sanitizedId = sanitizeString(id);
        const sanitizedAdminNotes = adminNotes ? sanitizeString(adminNotes) : undefined;
        const sanitizedBpFeeLineItems = bpFeeLineItems
            ? bpFeeLineItems
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
        // Check for TREASURY_STAFF or ADMIN role
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER" && user.role !== "REGISTRAR")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const isBusinessPermit = transaction.type.code.startsWith("BUSINESS_PERMIT");
        const isBuildingPermit = transaction.type.code.startsWith("BUILDING_PERMIT");
        const isLCR = transaction.type.code.startsWith("LCR_");

        // ADMIN_AIDE can only evaluate Business Permits in the inspection phases (FOR_INSPECTION or FOR_REINSPECTION)
        if (isBusinessPermit && isUserAdminAide(user) && !["FOR_INSPECTION", "FOR_REINSPECTION"].includes(transaction.status as any)) {
            return { success: false, error: "Forbidden: Admin Aides can only process Business Permits in the inspection phase." };
        }

        // TREASURY_STAFF cannot pre-screen or evaluate Business Permits that are in pre-screening states
        if (isBusinessPermit && user.role === "TREASURY_STAFF" && ["FOR_INSPECTION"].includes(transaction.status)) {
            return { success: false, error: "Forbidden: Pre-screening and evaluation must be handled by an Admin Aide first." };
        }
        const isCedula = transaction.type.code.includes("CEDULA");

        // Allow Cedula, Business Permit, Civil Registry (LCR), and Building Permit transactions to be evaluated here.
        if (!isCedula && !isBusinessPermit && !isLCR && !isBuildingPermit) {
            return { success: false, error: "Unsupported transaction type" };
        }

        const additionalData = transaction.additionalData as any;

        // Dynamic Delivery Fee Lookup from BarangayInfo
        let dynamicDeliveryFee = transaction.type.deliveryFee; // Initial fallback

        if (transaction.fulfillmentType === "DELIVERY" && (transaction.deliveryAddress || (transaction as any).residentSnapshot)) {
            const addr = (typeof transaction.deliveryAddress === 'string'
                ? JSON.parse(transaction.deliveryAddress || '{}')
                : transaction.deliveryAddress) || (transaction as any).residentSnapshot;

            if (addr?.barangay) {
                const brgyLogistics = await prisma.barangayInfo.findUnique({
                    where: { name: addr.barangay }
                }) as any;

                // Priority Logic: Use Barangay Fee if it exists and is greater than 0, 
                // otherwise keep the service type default fee.
                if (brgyLogistics && (brgyLogistics as any).isLogisticsActive && (brgyLogistics as any).deliveryFee > 0) {
                    dynamicDeliveryFee = (brgyLogistics as any).deliveryFee;
                }
            }
        }

        // Compute the tax
        let result: {
            basicTax: number;
            additionalTax: number;
            penalty: number;
            deliveryFee: number;
            totalAmount: number;
            miscFee?: number;
        } = {
            basicTax: 0,
            additionalTax: 0,
            penalty: 0,
            deliveryFee: 0,
            totalAmount: 0
        };

        if (isBusinessPermit || isBuildingPermit) {
            if (sanitizedBpFeeLineItems && sanitizedBpFeeLineItems.length > 0) {
                const itemsSum = sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
                const deliveryFee = transaction.fulfillmentType === "DELIVERY"
                    ? (deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee || 0)
                    : 0;
                const total = itemsSum + deliveryFee;
                result = {
                    basicTax: itemsSum,
                    additionalTax: 0,
                    penalty: 0,
                    deliveryFee: deliveryFee,
                    totalAmount: total
                };
            } else if (isBusinessPermit) {
                const cap = Number(additionalData.capitalInvestment || 0);
                const sales = Number(additionalData.grossSales || 0);
                const bploCalc = calculateBusinessPermit({
                    type: additionalData.businessType === "NEW" ? "NEW" : "RENEWAL",
                    capitalization: cap,
                    grossSales: sales,
                    fulfillmentType: transaction.fulfillmentType,
                    deliveryFee: deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee
                });
                result = {
                    basicTax: bploCalc.baseFee,
                    additionalTax: bploCalc.taxAmount,
                    penalty: 0,
                    deliveryFee: bploCalc.deliveryFee,
                    totalAmount: bploCalc.totalAmount
                };
            }
        } else if (isCedula) {
            const cedulaCalc = calculateCedula({
                type: additionalData.applicantType || "INDIVIDUAL",
                income: additionalData.income || 0,
                propertyValue: additionalData.propertyValue || 0,
                fulfillmentType: transaction.fulfillmentType,
                deliveryFee: deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee,
                baseFee: transaction.type?.baseFee
            });
            result = {
                basicTax: cedulaCalc.basicTax,
                additionalTax: cedulaCalc.additionalTax,
                penalty: cedulaCalc.penalty,
                deliveryFee: cedulaCalc.deliveryFee,
                totalAmount: cedulaCalc.totalAmount
            };
        } else if (isLCR) {
            // Civil Registry (LCR) services like marriage/death/birth should use the
            // persisted transaction total when available (e.g., provided by registry
            // at submission). If not present, fall back to type base fee + delivery.
            const typeCode = (transaction.type?.code || "").toUpperCase();
            const additional = transaction.additionalData as any || {};
            const isLate = (additional.registrationType || "").toUpperCase() === "LATE";
            const isMarriageReg = typeCode === "LCR_MARRIAGE_REG";
            const isCertifiedCopy = ["LCR_BIRTH", "LCR_DEATH", "LCR_MARRIAGE"].includes(typeCode);
            const isBirthReg = typeCode === "LCR_BIRTH_REG";
            const isDeathReg = typeCode === "LCR_DEATH_REG";

            const baseFee = isCertifiedCopy
                ? 0
                : ((isMarriageReg && !isLate) || isBirthReg || isDeathReg)
                    ? 0
                    : Number(transaction.type?.baseFee || 0);
            const feeDelivery = Number(transaction.type?.deliveryFee || 0);
            const deliveryFeeUsed = deliveryFeeOverride !== undefined ? deliveryFeeOverride : dynamicDeliveryFee || feeDelivery;

            const miscFee = sanitizedMiscFeeOverride !== undefined
                ? sanitizedMiscFeeOverride
                : (additional.miscFee !== undefined ? Number(additional.miscFee) : (isLate ? 300 : 0));

            const itemsSum = sanitizedBpFeeLineItems ? sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0) : 0;
            const total = baseFee + (transaction.fulfillmentType === "DELIVERY" ? deliveryFeeUsed : 0) + miscFee + itemsSum;

            result = {
                basicTax: baseFee,
                additionalTax: 0,
                penalty: 0,
                deliveryFee: deliveryFeeUsed,
                miscFee: miscFee,
                totalAmount: total
            };
        }

        if (!isBusinessPermit && !isBuildingPermit && sanitizedBpFeeLineItems && sanitizedBpFeeLineItems.length > 0 && !isLCR) {
            const itemsSum = sanitizedBpFeeLineItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            result.totalAmount += itemsSum;
        }

        // Determine New Status.
        // New BPLO requests that pass inspection move to Treasury requesting.
        // Re-inspection keeps the existing later-phase flow and returns to processing.
        let newStatus = (isUserAdminAide(user) && isBusinessPermit) ? "FOR_REQUESTING" : "EVALUATED" as any;
        if (isLCR && transaction.status === "FOR_INSPECTION") {
            const typeCode = (transaction.type?.code || "").toUpperCase();
            const regType = (additionalData?.registrationType || "").toUpperCase();
            const hasAdditionalFees = sanitizedBpFeeLineItems && sanitizedBpFeeLineItems.length > 0;
            const isCertifiedCopy = ["LCR_BIRTH", "LCR_MARRIAGE"].includes(typeCode);
            if (isCertifiedCopy) {
                newStatus = "FOR_REQUESTING";
            } else if (typeCode === "LCR_DEATH_REG" && (regType === "STANDARD" || !regType) && !hasAdditionalFees) {
                newStatus = "EVALUATED";
            } else {
                newStatus = "FOR_REQUESTING";
            }
        }
        if (isBusinessPermit && transaction.status === "FOR_REINSPECTION") {
            newStatus = "FOR_PROCESSING";
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: newStatus,
                totalAmount: result!.totalAmount, // This is the Base Tax + Penalty
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
                    basicTax: result!.basicTax,
                    additionalTax: result!.additionalTax,
                    penaltyCharge: result!.penalty,
                    deliveryFee: result!.deliveryFee, // Persist delivery fee here
                    totalAmount: result!.totalAmount,
                    ...(result!.miscFee !== undefined ? { miscFee: result!.miscFee } : {}),
                    ...(sanitizedBpFeeLineItems ? { lineItems: sanitizedBpFeeLineItems } : {})
                }
            } as any,
            include: { user: true }
        }) as any;

        // Trigger email notification for payment / processing
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            if (newStatus === "EVALUATED") {
                await sendEmail({
                    type: "FOR_PAYMENT",
                    to: updatedTransaction.user.email,
                    name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                    transactionId: sanitizedId.slice(-8).toUpperCase(),
                    amount: result!.totalAmount,
                    remarks: sanitizedAdminNotes,
                    serviceName: updatedTransaction.type?.name
                });
            } else if (newStatus === "FOR_PROCESSING") {
                await sendEmail({
                    type: "PROCESSING",
                    to: updatedTransaction.user.email,
                    name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                    transactionId: sanitizedId.slice(-8).toUpperCase(),
                    remarks: sanitizedAdminNotes,
                    serviceName: updatedTransaction.type?.name || "Business Permit"
                });
            }
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/requests");
        return { success: true, data: updatedTransaction, calculation: result };
    } catch (error) {
        console.error("Evaluate transaction error:", error);
        return { success: false, error: "Failed to evaluate transaction" };
    }
}

/**
 * Finalize Transaction Fulfillment (Resident side)
 * Called when status is EVALUATED
 */
export async function finalizeTransactionFulfillment(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transactionId = sanitizeString(formData.get("transactionId") as string);
        const fulfillmentType = sanitizeString(formData.get("fulfillmentType") as string) as "PICK_UP" | "DELIVERY" | "E_COPY";
        const paymentType = sanitizeString(formData.get("paymentType") as string);
        const gcashReferenceNo = formData.get("gcashReferenceNo") ? sanitizeString(formData.get("gcashReferenceNo") as string) : "";

        // Delivery Details
        const deliveryAddress = formData.get("deliveryAddress") ? sanitizeObject(JSON.parse(formData.get("deliveryAddress") as string)) : null;
        const deliveryLat = formData.get("deliveryLat") ? Number(formData.get("deliveryLat")) : null;
        const deliveryLng = formData.get("deliveryLng") ? Number(formData.get("deliveryLng")) : null;
        const deliveryLandmark = formData.get("deliveryLandmark") ? sanitizeString(formData.get("deliveryLandmark") as string) : "";

        // Payment Proof File
        const paymentFile = formData.get("paymentFile") as File;
        const paymentProofUrl = await processFileUpload(paymentFile, "proofs");

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { type: true, user: true }
        });

        if (!transaction || transaction.userId !== session.user.id) {
            return { success: false, error: "Transaction not found" };
        }

        if (transaction.status !== "EVALUATED" && transaction.status !== "UNPAID") {
            return { success: false, error: "Transaction is not in evaluation phase" };
        }

        const fiscal = (typeof transaction.fiscalSnapshot === "string" ? JSON.parse(transaction.fiscalSnapshot) : transaction.fiscalSnapshot) as any || {};
        
        // Sum any line items inside fiscalSnapshot (excluding Business/Building permits as their lineItems are already in basicTax)
        const isBusinessOrBuilding = transaction.type.code.startsWith("BUSINESS_PERMIT") || transaction.type.code.startsWith("BUILDING_PERMIT");
        const lineItemsSum = (!isBusinessOrBuilding && Array.isArray(fiscal.lineItems))
            ? fiscal.lineItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
            : 0;

        const baseAmount = Number(fiscal.basicTax || 0) + 
                           Number(fiscal.additionalTax || 0) + 
                           Number(fiscal.penaltyCharge || fiscal.penalty || 0) +
                           (!isBusinessOrBuilding ? Number(fiscal.miscFee || 0) : 0) +
                           lineItemsSum;

        // Subtract any previously saved delivery fee to get a clean base amount
        const existingDeliveryFee = Number(fiscal.deliveryFee || 0);
        const resolvedBase = baseAmount > 0
            ? baseAmount
            : Math.max(0, Number(transaction.totalAmount) - existingDeliveryFee);

        let finalAmount = resolvedBase;
        if (fulfillmentType === "DELIVERY") {
            let actualDeliveryFee = transaction.type.deliveryFee || 0;
            const barangayName = deliveryAddress?.barangay;

            if (barangayName) {
                const brgy = await prisma.barangayInfo.findUnique({
                    where: { name: barangayName }
                }) as any;

                // Priority Logic: Use Barangay Fee if it exists and is > 0, else use type default
                if (brgy && brgy.deliveryFee > 0) {
                    actualDeliveryFee = brgy.deliveryFee;
                }
            }

            finalAmount += actualDeliveryFee;
        }

        // Determine next status: 
        // - All PICK_UP go to FOR_PROCESSING
        // - DELIVERY with CASH_ON_DELIVERY also goes to FOR_PROCESSING
        let newStatus = (fulfillmentType === "PICK_UP" || paymentType === "CASH_ON_DELIVERY") ? "FOR_PROCESSING" : "UNPAID";
        if (paymentType === "E_PAYMENT" || paymentType === "BANK_TRANSFER") {
            newStatus = "PAID";
        }
        if (finalAmount === 0) {
            newStatus = "FOR_PROCESSING";
        }

        // Dedicated rule for free timely Death Registration with Office Pickup transitioning to FOR_REINSPECTION
        const typeCode = (transaction.type?.code || "").toUpperCase();
        const additional = (transaction.additionalData as any) || {};
        const regType = (additional.registrationType || "").toUpperCase();
        if ((
            typeCode === "LCR_DEATH_REG" || 
            transaction.typeId === "cmpgkxxke0019vpjkquvcxggu" ||
            typeCode === "LCR_MARRIAGE_REG" ||
            typeCode === "LCR_BIRTH_REG"
        ) && 
            (regType === "STANDARD" || regType === "") && 
            finalAmount === 0) {
            newStatus = "FOR_REINSPECTION";
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                fulfillmentType,
                paymentType: paymentType as any,
                deliveryAddress: fulfillmentType === "DELIVERY" ? deliveryAddress : null,
                deliveryLat: fulfillmentType === "DELIVERY" ? deliveryLat : null,
                deliveryLng: fulfillmentType === "DELIVERY" ? deliveryLng : null,
                deliveryLandmark: fulfillmentType === "DELIVERY" ? deliveryLandmark : null,
                paymentReference: paymentProofUrl || transaction.paymentReference, // Store the image URL here
                totalAmount: finalAmount,
                status: newStatus as any,
                additionalData: {
                    ...(transaction.additionalData as any || {}),
                    gcashReferenceNo: gcashReferenceNo || null
                },
                fiscalSnapshot: {
                    ...(transaction.fiscalSnapshot as any || {}),
                    deliveryFee: (fulfillmentType === "DELIVERY" ? (finalAmount - Number(transaction.totalAmount)) : 0),
                    totalAmount: finalAmount
                },
                updatedAt: new Date()
            } as any
        });

        revalidatePath("/user/services/requests");
        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Finalize fulfillment error:", error);
        return { success: false, error: "Failed to finalize selection" };
    }
}

/**
 * Get count of transactions needing immediate treasury attention
 */
export async function getPendingTreasuryCount() {
    try {
        await getSession();

        const where: any = {
            type: { processorRole: "TREASURY_STAFF" },
            status: { in: ["FOR_REQUESTING", "PAID", "FOR_CLAIM", "FOR_PROCESSING"] as any },
            isCancelled: false
        };

        // TREASURY_STAFF should not count Business Permits in pre-screening status
        where.NOT = {
            AND: [
                { type: { code: { startsWith: "BUSINESS_PERMIT" } } },
                { status: { in: ["FOR_INSPECTION"] } }
            ]
        };

        const count = await prisma.transaction.count({
            where
        });
        return { success: true, count };
    } catch (error) {
        console.error("Fetch pending count error:", error);
        return { success: false, count: 0 };
    }
}

/**
 * Fetch counts per status for Treasury transactions (for tab badges)
 */
export async function getTreasuryStatusCounts() {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden", data: {} };
        }

        // Group by status for non-cancelled transactions
        const where: any = {
            type: { processorRole: "TREASURY_STAFF" },
            isCancelled: false
        };

        where.NOT = {
            AND: [
                { type: { code: { startsWith: "BUSINESS_PERMIT" } } },
                { status: { in: ["FOR_INSPECTION"] } }
            ]
        };

        const grouped = await prisma.transaction.groupBy({
            by: ["status"],
            where,
            _count: { _all: true }
        });

        // Count cancelled separately
        const cancelledWhere: any = {
            type: { processorRole: "TREASURY_STAFF" },
            isCancelled: true
        };

        cancelledWhere.NOT = {
            AND: [
                { type: { code: { startsWith: "BUSINESS_PERMIT" } } },
                { status: { in: ["FOR_INSPECTION"] } }
            ]
        };

        const cancelledCount = await prisma.transaction.count({
            where: cancelledWhere
        });

        const counts: Record<string, number> = {};
        for (const group of grouped) {
            counts[group.status] = group._count?._all ?? 0;
        }
        counts["CANCELLED"] = cancelledCount;

        return { success: true, data: counts };
    } catch (error) {
        console.error("Fetch treasury status counts error:", error);
        return { success: false, error: "Failed to fetch counts", data: {} };
    }
}

/**
 * Fetch all transactions relevant to BPLO (Business Permits)
 */
export async function getBploTransactions(status?: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, error: "Forbidden" };
        }

        const where: any = {
            type: {
                processorRole: "TREASURY_STAFF",
                code: { startsWith: "BUSINESS_PERMIT" }
            }
        };

        if (status && status !== "ALL") {
            if (status === "CANCELLED") {
                where.isCancelled = true;
            } else if (status === "PAID") {
                where.status = "PAID" as any;
                where.isCancelled = false;
            } else {
                where.status = status;
                where.isCancelled = false;
            }
        } else {
            // Default statuses BPLO can handle/see (all statuses)
            where.status = {
                in: [
                    "DRAFT",
                    "FOR_REQUESTING",
                    "FOR_REVISION",
                    "FOR_INSPECTION",
                    "FOR_REINSPECTION",
                    "FOR_PROCESSING",
                    "EVALUATED",
                    "FOR_CLAIM",
                    "FOR_PICKING",
                    "IN_ROUTE",
                    "DELIVERED",
                    "UNPAID",
                    "PAID",
                    "RELEASED",
                    "REJECTED",
                    "RETURN_REQUESTED",
                    "REFUND_REQUESTED",
                    "RETURNED",
                    "REFUNDED",
                    "DISPUTE_REJECTED"
                ]
            };
            where.isCancelled = false;
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                user: true,
                type: true,
                cedula: true,
                businessPermit: true
            },
            orderBy: { createdAt: "desc" }
        });

        // Fetch staff users to map processedBy
        const staff = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        const staffMap = new Map(staff.map(s => [s.id, s.name || s.email || "Unknown"]));

        const mappedTransactions = transactions.map(tx => ({
            ...tx,
            processorName: tx.processedBy ? (staffMap.get(tx.processedBy) || "Unknown Staff") : "Not Processed"
        }));

        return { success: true, data: mappedTransactions as any[] };
    } catch (error) {
        console.error("Fetch BPLO transactions error:", error);
        return { success: false, error: "Failed to fetch BPLO transactions" };
    }
}

/**
 * Get count of transactions needing BPLO attention (Pending Inspection/Re-inspection & disputes)
 */
export async function getPendingBploCount() {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, count: 0 };
        }

        const where: any = {
            type: {
                processorRole: "TREASURY_STAFF",
                code: { startsWith: "BUSINESS_PERMIT" }
            },
            status: { in: ["FOR_INSPECTION", "FOR_REINSPECTION", "RETURN_REQUESTED", "REFUND_REQUESTED"] as any },
            isCancelled: false
        };

        const count = await prisma.transaction.count({ where });
        return { success: true, count };
    } catch (error) {
        console.error("Fetch pending BPLO count error:", error);
        return { success: false, count: 0 };
    }
}

/**
 * Get count of BPLO transactions in FOR_INSPECTION or FOR_REINSPECTION status
 */
export async function getBploInspectionCount() {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, count: 0 };
        }

        const count = await prisma.transaction.count({
            where: {
                type: {
                    processorRole: "TREASURY_STAFF",
                    code: { startsWith: "BUSINESS_PERMIT" }
                },
                status: { in: ["FOR_INSPECTION", "FOR_REINSPECTION"] as any },
                isCancelled: false
            }
        });
        return { success: true, count };
    } catch (error) {
        console.error("Fetch BPLO inspection count error:", error);
        return { success: false, count: 0 };
    }
}


/**
 * Fetch counts per status for BPLO transactions
 */
export async function getBploStatusCounts() {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && !isUserAdminAide(user))) {
            return { success: false, error: "Forbidden", data: {} };
        }

        const where: any = {
            type: {
                processorRole: "TREASURY_STAFF",
                code: { startsWith: "BUSINESS_PERMIT" }
            },
            isCancelled: false
        };

        const grouped = await prisma.transaction.groupBy({
            by: ["status"],
            where,
            _count: { _all: true }
        });

        const cancelledCount = await prisma.transaction.count({
            where: {
                type: {
                    processorRole: "TREASURY_STAFF",
                    code: { startsWith: "BUSINESS_PERMIT" }
                },
                isCancelled: true
            }
        });

        const counts: Record<string, number> = {};
        for (const group of grouped) {
            counts[group.status] = group._count?._all ?? 0;
        }
        counts["CANCELLED"] = cancelledCount;

        return { success: true, data: counts };
    } catch (error) {
        console.error("Fetch BPLO status counts error:", error);
        return { success: false, error: "Failed to fetch BPLO counts", data: {} };
    }
}


/**
 * Reject a transaction (Treasury/Admin side)
 */
export async function rejectTransaction(id: string, remarks: string) {
    try {
        id = sanitizeString(id);
        remarks = sanitizeString(remarks);

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER" && user.role !== "REGISTRAR")) {
            return { success: false, error: "Forbidden" };
        }

        // 1. Fetch transaction with user and type details to check rejection history and type checks
        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });

        if (!tx) return { success: false, error: "Transaction inaccessible" };

        const isBusinessPermit = tx.type.code.startsWith("BUSINESS_PERMIT");

        if (isBusinessPermit && isUserAdminAide(user) && !["FOR_INSPECTION", "FOR_PROCESSING", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING"].includes(tx.status as any)) {
            return { success: false, error: "Forbidden: BPLO Admins can only reject Business Permits in active inspection, processing, or release phases." };
        }

        // TREASURY_STAFF cannot pre-screen or evaluate Business Permits that are in pre-screening states
        if (isBusinessPermit && user.role === "TREASURY_STAFF" && ["FOR_INSPECTION"].includes(tx.status)) {
            return { success: false, error: "Forbidden: Pre-screening and evaluation must be handled by an Admin Aide first." };
        }

        // 2. Update transaction status to REJECTED
        const transaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectionRemarks: remarks,
                processedBy: user.id
            }
        });

        // 3. Anti-Spam Protocol: Increment rejectionCount based on per-category limits for citizen accounts
        if (tx.userId && tx.user?.role === "USER") {
            // Count all rejected transactions for this user
            const rejectedTransactions = await prisma.transaction.findMany({
                where: {
                    userId: tx.userId,
                    status: "REJECTED",
                    createdAt: (tx.user as any).rejectionResetAt ? { gt: (tx.user as any).rejectionResetAt } : undefined
                },
                include: {
                    type: true
                }
            });

            const activeRejectedTransactions = rejectedTransactions;

            let maxCategoryRejections;
            if (tx.type?.code === "BUILDING_PERMIT") {
                maxCategoryRejections = activeRejectedTransactions.filter((rTx: any) => rTx.type?.code === "BUILDING_PERMIT").length;
            } else {
                // Group and find the maximum rejection count in any single category
                const categoryCounts: Record<string, number> = {};
                for (const rTx of activeRejectedTransactions) {
                    const category = rTx.type.category || "General";
                    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                }
                maxCategoryRejections = Math.max(0, ...Object.values(categoryCounts));
            }

            const updatedUser = await prisma.user.update({
                where: { id: tx.userId },
                data: { rejectionCount: maxCategoryRejections } as any
            }) as any;

            // Check if deactivation threshold reached (3 rejections in any single category)
            if (updatedUser.rejectionCount >= 3) {
                // LOCK ACCOUNT: Set isEmailVerified to false
                await prisma.user.update({
                    where: { id: tx.userId },
                    data: { isEmailVerified: false }
                });

                // Trigger URGENT Deactivation Email
                if (updatedUser.email) {
                    await sendEmail({
                        type: "DEACTIVATED",
                        to: updatedUser.email,
                        name: updatedUser.name || "Resident",
                    });
                }
            } else {
                // Trigger standard Rejection Email
                if (updatedUser.email) {
                    const resident = tx.residentSnapshot as any;
                    await sendEmail({
                        type: "REJECTED",
                        to: updatedUser.email,
                        name: resident?.firstName || updatedUser.name || "Resident",
                        remarks: remarks,
                        transactionId: tx.id.slice(-8).toUpperCase(),
                        serviceName: tx.type?.name
                    });
                }
            }
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: transaction };
    } catch (error) {
        console.error("Reject transaction error:", error);
        return { success: false, error: "Failed to reject transaction" };
    }
}

/**
 * Send a transaction back to the resident for revision
 */
export async function sendForRevision(id: string, remarks: string) {
    try {
        id = sanitizeString(id);
        remarks = sanitizeString(remarks);

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN" && !isUserAdminAide(user) && user.role !== "ENGINEER" && user.role !== "REGISTRAR")) {
            return { success: false, error: "Forbidden" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true, type: true }
        });

        if (!tx) return { success: false, error: "Transaction inaccessible" };

        const isBusinessPermit = tx.type.code.startsWith("BUSINESS_PERMIT");
        if (isBusinessPermit && isUserAdminAide(user) && !["FOR_INSPECTION", "FOR_PROCESSING", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING"].includes(tx.status as any)) {
            return { success: false, error: "Forbidden: BPLO Admins can only request revisions for Business Permits in active inspection, processing, or release phases." };
        }

        const nextRevisionCount = (tx.revisionCount || 0) + 1;

        if (nextRevisionCount > 3) {
            // 🚨 AUTOMATIC DECLINE / REJECTION!
            const autoRemarks = `${remarks} (System: Automatically declined due to reaching the maximum limit of 3 revision requests.)`;
            const transaction = await prisma.transaction.update({
                where: { id },
                data: {
                    status: "REJECTED",
                    rejectionRemarks: autoRemarks,
                    processedBy: user.id,
                    revisionCount: nextRevisionCount
                }
            });

            // Anti-Spam Protocol: Increment rejectionCount based on per-category limits for citizen accounts
            if (tx.userId && tx.user?.role === "USER") {
                const rejectedTransactions = await prisma.transaction.findMany({
                    where: {
                        userId: tx.userId,
                        status: "REJECTED",
                        createdAt: (tx.user as any).rejectionResetAt ? { gt: (tx.user as any).rejectionResetAt } : undefined
                    },
                    include: {
                        type: true
                    }
                });

                let maxCategoryRejections;
                if (tx.type?.code === "BUILDING_PERMIT") {
                    maxCategoryRejections = rejectedTransactions.filter((rTx: any) => rTx.type?.code === "BUILDING_PERMIT").length;
                } else {
                    const categoryCounts: Record<string, number> = {};
                    for (const rTx of rejectedTransactions) {
                        const category = rTx.type.category || "General";
                        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
                    }
                    maxCategoryRejections = Math.max(0, ...Object.values(categoryCounts));
                }

                const updatedUser = await prisma.user.update({
                    where: { id: tx.userId },
                    data: { rejectionCount: maxCategoryRejections } as any
                }) as any;

                // Check if deactivation threshold reached (3 rejections in any single category)
                if (updatedUser.rejectionCount >= 3) {
                    await prisma.user.update({
                        where: { id: tx.userId },
                        data: { isEmailVerified: false }
                    });

                    if (updatedUser.email) {
                        await sendEmail({
                            type: "DEACTIVATED",
                            to: updatedUser.email,
                            name: updatedUser.name || "Resident",
                        });
                    }
                } else {
                    if (updatedUser.email) {
                        const resident = tx.residentSnapshot as any;
                        await sendEmail({
                            type: "REJECTED",
                            to: updatedUser.email,
                            name: resident?.firstName || updatedUser.name || "Resident",
                            remarks: autoRemarks,
                            transactionId: tx.id.slice(-8).toUpperCase(),
                            serviceName: tx.type?.name
                        });
                    }
                }
            }

            revalidatePath("/admin/treasury");
            revalidatePath("/user/services");
            return { success: true, data: transaction, isAutoRejected: true };
        } else {
            // Standard Revision Request
            const transaction = await prisma.transaction.update({
                where: { id },
                data: {
                    status: "FOR_REVISION" as any,
                    rejectionRemarks: remarks,
                    processedBy: user.id,
                    revisionCount: nextRevisionCount
                }
            });

            if (tx.userId && tx.user?.role === "USER" && tx.user?.email) {
                const resident = tx.residentSnapshot as any;
                await sendEmail({
                    type: "FOR_REVISION" as any,
                    to: tx.user.email,
                    name: resident?.firstName || tx.user.name || "Resident",
                    remarks: remarks,
                    transactionId: tx.id.slice(-8).toUpperCase(),
                    serviceName: tx.type?.name
                });
            }

            revalidatePath("/admin/treasury");
            revalidatePath("/user/services");
            return { success: true, data: transaction, isAutoRejected: false };
        }
    } catch (error) {
        console.error("Send for revision error:", error);
        return { success: false, error: "Failed to request revision" };
    }
}

/**
 * Resubmit a transaction after revision (Resident side)
 */
export async function resubmitTransaction(id: string, formData: FormData) {
    try {
        id = sanitizeString(id);
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const tx = await prisma.transaction.findUnique({
            where: { id, userId: session.user.id },
            include: { type: true }
        });

        if (!tx || tx.status !== "FOR_REVISION") {
            return { success: false, error: "Invalid transaction for resubmission" };
        }

        const additionalData = tx.additionalData as any || {};

        // Parse and merge additionalData JSON if provided
        const additionalDataStr = formData.get("additionalData") as string;
        if (additionalDataStr) {
            try {
                const parsed = JSON.parse(additionalDataStr);
                Object.assign(additionalData, sanitizeObject(parsed));
            } catch (e) {
                console.error("Failed to parse additionalData during resubmit:", e);
            }
        }
        const isBusinessPermit = tx.typeId?.includes("BUSINESS_PERMIT") || tx.type?.code?.startsWith("BUSINESS_PERMIT");
        const isCedula = tx.typeId?.includes("CEDULA") || tx.type?.code?.startsWith("CEDULA");

        // Helper to process optional re-uploaded files
        const processReupload = async (key: string, folder: string) => {
            const file = formData.get(key) as File;
            if (file && file.size > 0 && file.name !== "undefined") {
                return await processFileUpload(file, folder);
            }
            return additionalData[key]; // keep existing
        };

        // Parse optional resident snapshot updates if provided (e.g. from the interactive revision wizards)
        const residentSnapshotStr = formData.get("residentSnapshot") as string;
        let residentSnapshot = tx.residentSnapshot;
        if (residentSnapshotStr) {
            try {
                residentSnapshot = sanitizeObject(JSON.parse(residentSnapshotStr));
            } catch (e) {
                console.error("Failed to parse resident snapshot during resubmit:", e);
            }
        }

        if (isBusinessPermit) {
            additionalData.ctcUrl = await processReupload("ctcFile", "bp_ctc") || additionalData.ctcUrl;
            additionalData.dtiSecUrl = await processReupload("dtiSecFile", "bp_dti") || additionalData.dtiSecUrl;
            additionalData.brgyClearanceUrl = await processReupload("brgyClearanceFile", "bp_brgy") || additionalData.brgyClearanceUrl;
            additionalData.ownerIdUrl = await processReupload("ownerIdFile", "bp_owner_id") || additionalData.ownerIdUrl;
            additionalData.locationPhotoUrl = await processReupload("locationPhotoFile", "bp_location") || additionalData.locationPhotoUrl;
            additionalData.sanitaryPermitUrl = await processReupload("sanitaryPermitFile", "bp_sanitary") || additionalData.sanitaryPermitUrl;
            additionalData.fireSafetyUrl = await processReupload("fireSafetyFile", "bp_fire") || additionalData.fireSafetyUrl;
            additionalData.birCorUrl = await processReupload("birCorFile", "bp_bir") || additionalData.birCorUrl;

            // Also update text fields if provided
            const fields = ["businessName", "orgType", "lineOfBusiness", "barangay", "capitalInvestment", "grossSales", "employeeCount", "businessArea"];
            for (const f of fields) {
                if (formData.has(f)) {
                    const val = formData.get(f) as string;
                    if (val) {
                        const cleanVal = sanitizeString(val);
                        additionalData[f] = isNaN(Number(cleanVal)) ? cleanVal : Number(cleanVal);
                    }
                }
            }
        } else if (isCedula) {
            // Cedula-specific uploads and data updates
            additionalData.validIdUrl = await processReupload("idFile", "ids") || additionalData.validIdUrl;
            additionalData.proofOfIncomeUrl = await processReupload("proofFile", "proofs") || additionalData.proofOfIncomeUrl;

            // Update Cedula specific text fields
            const fields = ["applicantType", "income", "propertyValue", "businessName"];
            for (const f of fields) {
                if (formData.has(f)) {
                    const val = formData.get(f) as string;
                    if (val) {
                        const cleanVal = sanitizeString(val).replace(/,/g, ""); // Strip out commas from gross income if any
                        additionalData[f] = isNaN(Number(cleanVal)) ? cleanVal : Number(cleanVal);
                    }
                }
            }
        } else {
            // General basic/civil registry
            additionalData.validIdUrl = await processReupload("idFile", "ids") || additionalData.validIdUrl;
            additionalData.proofOfIncomeUrl = await processReupload("proofFile", "proofs") || additionalData.proofOfIncomeUrl;
        }

        const isLCR = tx?.type?.code?.startsWith("LCR_") || tx?.type?.code?.startsWith("CIVIL_REGISTRY");

        const transaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: sanitizeObject(additionalData),
                residentSnapshot: residentSnapshot ? sanitizeObject(residentSnapshot as any) : null,
                status: isLCR ? "FOR_INSPECTION" : "FOR_REQUESTING",
                rejectionRemarks: null
            }
        });

        revalidatePath("/user/services");
        revalidatePath("/user/services/requests");
        return { success: true, data: transaction };
    } catch (error) {
        console.error("Resubmit transaction error:", error);
        return { success: false, error: "Failed to resubmit request" };
    }
}


/**
 * Fetch all transactions for the currently logged-in resident
 */
export async function getUserTransactions() {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            where: { userId: session.user.id },
            include: {
                type: true,
                cedula: true,
                businessPermit: true
            },
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: transactions as any[] };
    } catch (error) {
        console.error("Fetch user transactions error:", error);
        return { success: false, error: "Failed to fetch your requests" };
    }
}

/**
 * Logistics: Scan to Dispatch (Rider Side)
 */
export async function handoverTransaction(transactionId: string) {
    try {
        transactionId = sanitizeString(transactionId);
        const session = await getSession();
        const user = session?.user as any;

        // Security: Only Riders can scan to pick up
        if (!user || user.role !== "RIDER") {
            return { success: false, error: "Unauthorized. Logistics Personnel only." };
        }

        const transaction = await (prisma.transaction.findUnique as any)({
            where: { id: transactionId },
            include: { user: true, type: true }
        });

        if (!transaction || (transaction as any).status !== "FOR_PICKING") {
            return { success: false, error: "Transaction is not in the 'Ready for Picking' stage." };
        }

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: "IN_ROUTE",
                driverId: user.id
            } as any
        });

        // Trigger Notification: Notify resident that document is OTW
        const snapshot = transaction.residentSnapshot as any;
        if (transaction.user?.email) {
            await sendEmail({
                type: "IN_ROUTE",
                to: transaction.user.email,
                name: `${snapshot?.firstName} ${snapshot?.lastName}`,
                transactionId: transaction.id.slice(-8).toUpperCase(),
                amount: transaction.totalAmount,
                serviceName: transaction.type?.name
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath(`/admin/treasury/${transactionId}`);
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Handover error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Logistics: Confirm Delivery (Rider Side)
 */
export async function deliverTransaction(transactionId: string, podUrl: string) {
    try {
        transactionId = sanitizeString(transactionId);
        podUrl = sanitizeUrl(podUrl);

        const session = await getSession();
        const user = session?.user as any;

        if (!user || user.role !== "RIDER") {
            return { success: false, error: "Unauthorized." };
        }

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: "DELIVERED",
                podUrl: podUrl,
                deliveredAt: new Date()
            } as any
        });

        await updateDeceasedResidentStatus(transactionId);

        revalidatePath("/admin/treasury");
        revalidatePath(`/admin/treasury/${transactionId}`);
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Delivery confirmation error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Cancel a transaction (Resident side)
 */
export async function cancelTransaction(id: string) {
    try {
        id = sanitizeString(id);
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const tx = await (prisma.transaction.findUnique as any)({
            where: { id }
        });

        if (!tx) return { success: false, error: "Transaction not found" };
        if (tx.userId !== session.user.id) return { success: false, error: "Forbidden" };
        if (tx.isCancelled) return { success: false, error: "This request is already cancelled." };

        // Only allow cancellation if the request is still in DRAFT or FOR_REQUESTING phase
        const restrictedStatuses = [
            "FOR_PROCESSING",
            "EVALUATED",
            "FOR_CLAIM",
            "FOR_PICKING",
            "IN_ROUTE",
            "DELIVERED",
            "UNPAID",
            "PAID",
            "RELEASED",
            "REJECTED"
        ];
        if (restrictedStatuses.includes(tx.status)) {
            return { success: false, error: "Cannot cancel transaction at this stage. Please contact support if you need assistance." };
        }

        await (prisma.transaction.update as any)({
            where: { id },
            data: { isCancelled: true }
        });

        revalidatePath("/user/services/requests");
        revalidatePath(`/user/services/requests/${id}`);
        return { success: true };
    } catch (error) {
        console.error("Cancel transaction error:", error);
        return { success: false, error: "Failed to cancel transaction" };
    }
}

/**
 * Request Return or Refund (Resident side)
 */
export async function requestReturnOrRefund(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const id = sanitizeString(formData.get("id") as string);
        const type = sanitizeString(formData.get("type") as string) as "RETURN" | "REFUND";
        const reason = sanitizeString(formData.get("reason") as string);
        const proofFile = formData.get("proofFile") as File;

        const tx = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!tx || tx.userId !== session.user.id) {
            return { success: false, error: "Transaction not found" };
        }

        if (tx.status !== "DELIVERED") {
            return { success: false, error: "Only delivered transactions can be returned or refunded." };
        }

        let proofUrl = null;
        if (proofFile && proofFile.size > 0) {
            proofUrl = await processFileUpload(proofFile, "disputes");
        }

        const newStatus = type === "RETURN" ? "RETURN_REQUESTED" : "REFUND_REQUESTED";

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: newStatus as any,
                disputeReason: reason,
                disputeProofUrl: proofUrl,
                updatedAt: new Date()
            } as any
        });

        revalidatePath("/user/services/requests");
        revalidatePath(`/user/services/requests/${id}`);
        return { success: true, data: updated };
    } catch (error) {
        console.error("Dispute request error:", error);
        return { success: false, error: "Failed to submit dispute request" };
    }
}

/**
 * Resolve a Dispute (Admin side)
 */
export async function resolveDispute(transactionId: string, action: 'APPROVE' | 'REJECT', remarks: string) {
    try {
        transactionId = sanitizeString(transactionId);
        remarks = sanitizeString(remarks);

        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const user = session.user as any;

        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { user: true, type: true }
        });

        if (!tx) return { success: false, error: "Transaction not found" };

        const isBusinessPermit = tx.type?.code?.startsWith("BUSINESS_PERMIT");
        if (isBusinessPermit) {
            const isBPLOAdmin = user.role === "ADMIN" && user.department?.toUpperCase() === "BPLO";
            if (user.role === "TREASURY_STAFF" || (!isBPLOAdmin && !isUserAdminAide(user) && user.role !== "ADMIN")) {
                return { success: false, error: "Forbidden: Only BPLO Admin can resolve Return/Refund disputes." };
            }
        } else {
            if (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN") {
                return { success: false, error: "Forbidden: Only Treasury Staff or Admin can resolve Generic Service disputes." };
            }
        }

        let newStatus: string;
        if (action === 'APPROVE') {
            newStatus = (tx.status as any) === "RETURN_REQUESTED" ? "FOR_PICKING" : "REFUNDED";
        } else {
            newStatus = "DELIVERED";
        }

        const updated = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: newStatus as any,
                disputeRemarks: remarks,
                updatedAt: new Date()
            } as any
        });

        // Trigger Email Notification for Approved Returns
        if (action === 'APPROVE' && (tx.status as any) === "RETURN_REQUESTED") {
            if (tx.user?.email) {
                await sendEmail({
                    type: "DISPUTE_APPROVED",
                    to: tx.user.email,
                    name: tx.user.name || "Resident",
                    transactionId: transactionId.slice(-8).toUpperCase(),
                    remarks: remarks,
                    serviceName: tx.type?.name
                });
            }
        }

        // Trigger Email Notification for Rejected Disputes
        if (action === 'REJECT') {
            if (tx.user?.email) {
                await sendEmail({
                    type: "DISPUTE_REJECTED",
                    to: tx.user.email,
                    name: tx.user.name || "Resident",
                    transactionId: transactionId.slice(-8).toUpperCase(),
                    remarks: remarks,
                    serviceName: tx.type?.name
                });
            }
        }

        revalidatePath("/admin/treasury");
        revalidatePath(`/admin/treasury/${transactionId}`);
        revalidatePath("/user/services/requests");
        revalidatePath(`/user/services/requests/${transactionId}`);

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Dispute resolution error:", error);
        return { success: false, error: error.message };
    }
}

export async function getLatestSuccessfulBusinessPermit() {
    try {
        const user = await assertSessionUser();

        const transaction = await prisma.transaction.findFirst({
            where: {
                userId: user.id,
                status: {
                    in: ["DELIVERED", "RELEASED"]
                },
                type: {
                    code: {
                        in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"]
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

        if (!transaction) {
            return { success: true, data: null };
        }

        return { success: true, data: transaction };
    } catch (error: any) {
        console.error("Get latest successful permit error:", error);
        return { success: false, error: error?.message || "Failed to fetch permit" };
    }
}

export async function getAllSuccessfulBusinessPermits() {
    try {
        const user = await assertSessionUser();

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: user.id,
                status: {
                    in: ["DELIVERED", "RELEASED"]
                },
                type: {
                    code: {
                        in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"]
                    }
                }
            },
            include: {
                type: true,
                businessPermit: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return { success: true, data: transactions };
    } catch (error: any) {
        console.error("Get all successful permits error:", error);
        return { success: false, error: error?.message || "Failed to fetch permits" };
    }
}

/**
 * Fetch all Building Permit transactions for Engineer Hub
 */
export async function getEngineerTransactions(status?: string) {
    try {
        const user = await assertSessionUser();
        assertUserRoles(user, ["ENGINEER", "ADMIN"]);

        const where: any = {
            type: { code: { startsWith: "BUILDING_PERMIT" } }
        };

        if (status && status !== "ALL") {
            if (status === "CANCELLED") {
                where.isCancelled = true;
            } else if (status === "PAID") {
                where.status = "PAID" as any;
                where.isCancelled = false;
            } else {
                where.status = status;
                where.isCancelled = false;
            }
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                user: true,
                type: true,
                buildingPermit: true
            } as any,
            orderBy: { createdAt: "desc" }
        });

        return { success: true, data: transactions as any[] };
    } catch (error: any) {
        console.error("Fetch engineer transactions error:", error);
        return { success: false, error: error?.message || "Failed to fetch transactions" };
    }
}

/**
 * Get count of pending building permit transactions for Engineer
 */
export async function getEngineerPendingCount() {
    try {
        const user = await assertSessionUser();
        assertUserRoles(user, ["ENGINEER", "ADMIN"]);

        const count = await prisma.transaction.count({
            where: {
                type: { code: { startsWith: "BUILDING_PERMIT" } },
                status: { in: ["FOR_REQUESTING", "FOR_INSPECTION", "PAID", "FOR_CLAIM", "FOR_PROCESSING"] as any }
            }
        });
        return { success: true, count };
    } catch (error: any) {
        console.error("Fetch engineer pending count error:", error);
        return { success: false, error: error?.message || "Failed to fetch pending count", count: 0 };
    }
}

/**
 * Fetch counts per status for Engineer Hub building permit transactions (for tab badges)
 */
export async function getEngineerStatusCounts() {
    try {
        const user = await assertSessionUser();
        assertUserRoles(user, ["ENGINEER", "ADMIN"]);

        const where: any = {
            type: { code: { startsWith: "BUILDING_PERMIT" } },
            isCancelled: false
        };

        const grouped = await prisma.transaction.groupBy({
            by: ["status"],
            where,
            _count: { _all: true }
        });

        const cancelledCount = await prisma.transaction.count({
            where: {
                type: { code: { startsWith: "BUILDING_PERMIT" } },
                isCancelled: true
            }
        });

        const counts: Record<string, number> = {};
        for (const group of grouped) {
            counts[group.status] = group._count?._all ?? 0;
        }
        counts["CANCELLED"] = cancelledCount;

        return { success: true, data: counts };
    } catch (error: any) {
        console.error("Fetch engineer status counts error:", error);
        return { success: false, error: error?.message || "Failed to fetch counts", data: {} };
    }
}

/**
 * Schedule Building Permit Inspection
 */
export async function scheduleBuildingInspection(id: string, details: any) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || user.role !== "ENGINEER") {
            return { success: false, error: "Forbidden: Only Engineers can schedule inspections" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        if (!transaction.type.code.startsWith("BUILDING_PERMIT")) {
            return { success: false, error: "Not a Building Permit transaction" };
        }

        const existingAdditionalData = (transaction.additionalData as any) || {};

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: "FOR_INSPECTION", // Move to inspection phase
                additionalData: {
                    ...existingAdditionalData,
                    inspectionSchedule: details
                },
                processedBy: user.id,
                updatedAt: new Date()
            },
            include: { type: true, user: true }
        });

        // Send an email notification about the inspection
        if (transaction.user?.email) {
            const resident = transaction.residentSnapshot as any;
            await sendEmail({
                type: "FOR_INSPECTION",
                to: transaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : transaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: transaction.type?.name || "Building Permit",
                remarks: `Inspector: ${details.inspectorName} | Date: ${details.date} | Time: ${details.time} | Notes: ${details.notes || 'None'}`
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Schedule inspection error:", error);
        return { success: false, error: "Failed to schedule inspection" };
    }
}

/**
 * Mark Building Permit for Re-inspection
 */
export async function markForReinspection(id: string, reason: string, details?: any) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || user.role !== "ENGINEER") {
            return { success: false, error: "Forbidden: Only Engineers can re-inspect" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const additionalData = (transaction.additionalData as any) || {};
        const count = (additionalData.reinspectionCount || 0) + 1;

        const history = additionalData.reinspectionHistory || [];
        const newHistory = [...history];

        // Archive the original site inspection schedule before it gets overwritten
        if ((!additionalData.reinspectionCount || additionalData.reinspectionCount === 0) && additionalData.inspectionSchedule) {
            newHistory.push({
                isOriginal: true,
                date: additionalData.inspectionSchedule.date,
                time: additionalData.inspectionSchedule.time,
                type: additionalData.inspectionSchedule.type || "Initial Inspection",
                inspectorName: additionalData.inspectionSchedule.inspectorName,
                notes: additionalData.inspectionSchedule.notes || "",
                reason: "Initial Site Inspection",
                count: 0
            });
        }

        newHistory.push({ date: new Date().toISOString(), reason, count });

        let newStatus = "FOR_REINSPECTION";
        let rejectionRemarks = null;

        if (count >= 3) {
            newStatus = "REJECTED";
            rejectionRemarks = `Automatically rejected after 3 re-inspection attempts. Final Reason: ${reason}`;
        }

        const newAdditionalData = {
            ...additionalData,
            reinspectionCount: count,
            reinspectionHistory: newHistory
        };

        if (details && count < 3) {
            newAdditionalData.inspectionSchedule = {
                type: details.type,
                date: details.date,
                time: details.time,
                inspectorName: details.inspectorName,
                notes: `Re-inspection Reason: ${reason}`
            };
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: newStatus as any,
                rejectionRemarks,
                additionalData: newAdditionalData,
                processedBy: user.id,
                revisionCount: 0,
                updatedAt: new Date()
            },
            include: { type: true, user: true }
        });

        // Email notification
        if (transaction.user?.email) {
            const resident = transaction.residentSnapshot as any;

            await sendEmail({
                type: count >= 3 ? "REJECTED" : "FOR_REINSPECTION",
                to: transaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : transaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: transaction.type?.name || "Building Permit",
                remarks: count >= 3 ? reason : `Attempt ${count} of 3. Reason: ${reason} ${details ? `| Date: ${details.date} | Time: ${details.time}` : ''}`
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Mark for re-inspection error:", error);
        return { success: false, error: "Failed to mark for re-inspection" };
    }
}

export async function endorseBuildingPermitFees(
    id: string,
    fees: {
        buildingPermitFee: number;
        engineerMunicipalCharges: { name: string, amount: number }[];
    }
) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Engineers or Admins can endorse fees." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};

        // Update with the fee assessment
        const updatedAdditionalData = {
            ...currentAdditionalData,
            feeAssessment: {
                buildingPermitFee: Number(fees.buildingPermitFee || 0),
                engineerMunicipalCharges: fees.engineerMunicipalCharges || [],
                endorsed: true,
                endorsedAt: new Date(),
                endorsedBy: user.name || "Municipal Engineer"
            }
        };

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData
            },
            include: { user: true, type: true }
        });

        // Send EVALUATED email
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            const totalFees = Number(fees.buildingPermitFee || 0) +
                (fees.engineerMunicipalCharges || []).reduce((sum, charge) => sum + Number(charge.amount || 0), 0);

            await sendEmail({
                type: "EVALUATED",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                amount: totalFees,
                remarks: "Assessment endorsed by the Municipal Engineer."
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Endorse building permit fees error:", error);
        return { success: false, error: "Failed to endorse fees" };
    }
}

export async function approveBuildingPermit(id: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Engineers or Admins can approve building permits." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };
        if (transaction.status !== "PAID") {
            return { success: false, error: "Forbidden: Can only approve paid permits." };
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: "FOR_PROCESSING",
                updatedAt: new Date()
            },
            include: { user: true, type: true }
        });

        // Send FOR_PROCESSING email
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: "FOR_PROCESSING",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                remarks: "Your application is now officially being processed by the Engineer's Office."
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Approve building permit error:", error);
        return { success: false, error: "Failed to approve building permit" };
    }
}



export async function reviseBuildingPermitClearancesAction(id: string, reason: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Engineers or Admins can request revisions." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const nextClearanceRevisionCount = (currentAdditionalData.clearanceRevisionCount || 0) + 1;

        if (nextClearanceRevisionCount >= 3) {
            // 🚨 AUTOMATIC DECLINE / REJECTION!
            const autoRemarks = `${reason} (System: Automatically declined due to reaching the maximum limit of 3 clearance revision requests.)`;
            return await rejectTransaction(id, autoRemarks);
        }

        const updatedAdditionalData = {
            ...currentAdditionalData,
            bfpClearanceUrl: null,
            zoningClearanceUrl: null,
            clearancesSubmitted: false,
            clearanceRevisionReason: reason,
            clearanceRevisionCount: nextClearanceRevisionCount
        };

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                revisionCount: nextClearanceRevisionCount,
                additionalData: updatedAdditionalData
            },
            include: { user: true, type: true }
        });

        // Send FOR_REVISION email
        if (updatedTransaction.user?.email) {
            const resident = (transaction as any).residentSnapshot || {};
            await sendEmail({
                type: "FOR_REVISION",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                remarks: `Please revise your submitted clearances. Reason: ${reason}`
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/building-permit");

        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Revise clearances error:", error);
        return { success: false, error: "Failed to request clearance revision" };
    }
}

export async function declineBuildingPermitAction(id: string, reason: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Engineers or Admins can decline." };
        }

        return await rejectTransaction(id, reason);
    } catch (error) {
        console.error("Decline building permit error:", error);
        return { success: false, error: "Failed to decline building permit" };
    }
}

export async function addAdditionalBuildingPermitFee(
    id: string,
    newFee: { label: string; amount: number }
) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Treasury Staff or Admins can add additional fees." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const feeAssessment = currentAdditionalData.feeAssessment || {};
        const currentAdditionalFees = feeAssessment.additionalFees || [];

        const updatedAdditionalFees = [
            ...currentAdditionalFees,
            {
                label: newFee.label,
                amount: Number(newFee.amount || 0),
                addedAt: new Date()
            }
        ];

        const updatedAdditionalData = {
            ...currentAdditionalData,
            feeAssessment: {
                ...feeAssessment,
                additionalFees: updatedAdditionalFees
            }
        };

        const baseTotal =
            Number(feeAssessment.buildingPermitFee || 0) +
            Number(feeAssessment.municipalCharges || 0);

        const additionalTotal = updatedAdditionalFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
        const finalTotal = baseTotal + additionalTotal;

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData,
                totalAmount: finalTotal
            }
        });

        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Add additional fee error:", error);
        return { success: false, error: "Failed to add additional fee" };
    }
}

export async function removeAdditionalBuildingPermitFee(
    id: string,
    index: number
) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Treasury Staff or Admins can manage fees." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const feeAssessment = currentAdditionalData.feeAssessment || {};
        const currentAdditionalFees = [...(feeAssessment.additionalFees || [])];

        if (index >= 0 && index < currentAdditionalFees.length) {
            currentAdditionalFees.splice(index, 1);
        }

        const updatedAdditionalData = {
            ...currentAdditionalData,
            feeAssessment: {
                ...feeAssessment,
                additionalFees: currentAdditionalFees
            }
        };

        const baseTotal =
            Number(feeAssessment.buildingPermitFee || 0) +
            Number(feeAssessment.municipalCharges || 0);

        const additionalTotal = currentAdditionalFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
        const finalTotal = baseTotal + additionalTotal;

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData,
                totalAmount: finalTotal
            }
        });

        revalidatePath("/admin/treasury");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Remove additional fee error:", error);
        return { success: false, error: "Failed to remove additional fee" };
    }
}

export async function approveAndSendBuildingPermitBilling(id: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Treasury Staff or Admins can approve billing." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const feeAssessment = currentAdditionalData.feeAssessment || {};

        const engineerCharges = feeAssessment.engineerMunicipalCharges || [];
        const engineerTotal = engineerCharges.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

        const baseTotal =
            Number(feeAssessment.buildingPermitFee || 0) +
            Number(feeAssessment.municipalCharges || 0) +
            engineerTotal;

        const additionalFees = feeAssessment.additionalFees || [];
        const additionalTotal = additionalFees.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
        const finalTotal = baseTotal + additionalTotal;

        const lineItems = [
            { label: "Building Permit Fee", amount: Number(feeAssessment.buildingPermitFee || 0) }
        ];

        if (engineerCharges.length > 0) {
            engineerCharges.forEach((c: any) => {
                lineItems.push({ label: c.name || "Other Applicable Municipal Charges", amount: Number(c.amount || 0) });
            });
        } else {
            lineItems.push({ label: "Other Applicable Municipal Charges", amount: Number(feeAssessment.municipalCharges || 0) });
        }

        lineItems.push(...additionalFees.map((f: any) => ({ label: f.label, amount: Number(f.amount || 0) })));

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: "UNPAID",
                totalAmount: finalTotal,
                fiscalSnapshot: {
                    basicTax: baseTotal,
                    additionalTax: additionalTotal,
                    penaltyCharge: 0,
                    totalAmount: finalTotal,
                    lineItems: lineItems
                }
            },
            include: { user: true, type: true }
        });

        // Send UNPAID email
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: "UNPAID",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                amount: finalTotal
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/admin/engineer");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Approve building permit billing error:", error);
        return { success: false, error: "Failed to approve billing" };
    }
}

export async function saveBfpClearanceProofAction(id: string, bfpClearanceUrl: string) {
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });
        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const updatedAdditionalData = {
            ...currentAdditionalData,
            bfpClearanceUrl
        };

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: updatedAdditionalData
            }
        });

        revalidatePath("/user/services/building-permit");
        revalidatePath(`/admin/engineer/${id}/fees`);
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Save BFP Clearance proof error:", error);
        return { success: false, error: "Failed to save BFP Clearance proof" };
    }
}

export async function submitBuildingPermitAction(id: string, eCopyUrl: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Engineers or Admins can submit building permits." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };
        if (transaction.status !== "FOR_PROCESSING") {
            return { success: false, error: "Forbidden: Can only submit permits in FOR_PROCESSING phase." };
        }

        const nextStatus = transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "FOR_CLAIM";

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: nextStatus,
                eCopyUrl: eCopyUrl,
                updatedAt: new Date()
            },
            include: { user: true, type: true }
        });

        // Send FOR_PICKING or FOR_CLAIM email
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: nextStatus as any,
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                remarks: "Your document has been prepared by the Engineer's Office."
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/building-permit");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Submit building permit error:", error);
        return { success: false, error: "Failed to submit building permit" };
    }
}

export async function releaseBuildingPermitAction(id: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ENGINEER" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Engineers or Admins can release building permits." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { user: { include: { residentProfile: true } } }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const additionalData = (transaction.additionalData as any) || {};
        const resident = transaction.user?.residentProfile || (transaction as any).residentSnapshot || {};
        const applicantName = `${resident.firstName || ""} ${resident.lastName || ""}`.trim() || "Unknown Applicant";

        const updatedTransaction = await prisma.$transaction(async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
            const updatedTx = await tx.transaction.update({
                where: { id },
                data: {
                    status: "RELEASED",
                    updatedAt: new Date()
                },
                include: { user: true, type: true }
            });

            // Save to BuildingPermit table
            await tx.buildingPermit.create({
                data: {
                    transactionId: id,
                    permitNumber: `BP-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
                    applicantName: applicantName,
                    projectType: additionalData.descriptionOfWork || "Building Construction",
                    occupancyUse: additionalData.occupancyUse || "Residential",
                    location: additionalData.location || resident.address || "Mapandan, Pangasinan",
                    estimatedCost: parseFloat(additionalData.estimatedCost) || 0,
                    documentUrl: transaction.eCopyUrl,
                    issuedBy: user.name || user.email || "Municipal Engineer"
                }
            });

            return updatedTx;
        });

        // Send RELEASED email
        if (updatedTransaction.user?.email) {
            const residentSnap = (transaction as any).residentSnapshot || {};
            await sendEmail({
                type: "RELEASED",
                to: updatedTransaction.user.email,
                name: residentSnap?.firstName ? `${residentSnap.firstName} ${residentSnap.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                remarks: "Your Building Permit has been officially released."
            });
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/building-permit");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Release building permit error:", error);
        return { success: false, error: "Failed to release building permit" };
    }
}
export async function declinePaymentProofAction(id: string, reason: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden: Only Treasury Staff or Admins can decline payments." };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};
        const updatedAdditionalData = { ...currentAdditionalData };

        // Only apply 3x limit rule for Building Permits
        const isBuildingPermit = transaction.type?.code?.startsWith("BUILDING_PERMIT");

        if (isBuildingPermit) {
            const nextPaymentRevisionCount = (currentAdditionalData.paymentRevisionCount || 0) + 1;

            if (nextPaymentRevisionCount >= 3) {
                // 🚨 AUTOMATIC DECLINE / REJECTION!
                const autoRemarks = `${reason} (System: Automatically declined due to reaching the maximum limit of 3 payment proof revision requests.)`;
                return await rejectTransaction(id, autoRemarks);
            }

            updatedAdditionalData.paymentRevisionCount = nextPaymentRevisionCount;
        }

        // Save the old payment reference to history before clearing it
        if (transaction.paymentReference) {
            const previousProofs = updatedAdditionalData.previousPaymentProofs || [];
            updatedAdditionalData.previousPaymentProofs = [
                ...previousProofs,
                {
                    url: transaction.paymentReference,
                    rejectedAt: new Date().toISOString(),
                    reason: reason
                }
            ];
        }

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                status: "UNPAID",
                rejectionRemarks: reason,
                paymentReference: null, // Clear rejected payment reference so they can upload a new one
                updatedAt: new Date(),
                additionalData: updatedAdditionalData
            },
            include: { user: true, type: true }
        });

        // Send FOR_REVISION email about payment decline
        if (updatedTransaction.user?.email) {
            const resident = (transaction as any).residentSnapshot || {};
            await sendEmail({
                type: "FOR_REVISION",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: id.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Building Permit",
                remarks: `Your payment proof was declined. Reason: ${reason}. Please submit a valid payment proof.`
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/building-permit");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Decline payment proof error:", error);
        return { success: false, error: "Failed to decline payment proof" };
    }
}

/**
 * Create logistics configuration for a new Barangay node
 */
export async function createBarangayLogistics(name: string, data: { deliveryFee: number, isLogisticsActive: boolean, estimatedDeliveryDays: number }) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "Forbidden" };
        }

        const existing = await prisma.barangayInfo.findUnique({
            where: { name }
        });

        if (existing) {
            return { success: false, error: "Barangay node already exists" };
        }

        const created = await prisma.barangayInfo.create({
            data: {
                name,
                deliveryFee: data.deliveryFee,
                isLogisticsActive: data.isLogisticsActive,
                estimatedDeliveryDays: data.estimatedDeliveryDays
            }
        });

        revalidatePath("/admin/logistics");
        return { success: true, data: created };
    } catch (error: any) {
        console.error("Error creating logistics:", error);
        return { success: false, error: error?.message || "Failed to create barangay logistics node" };
    }
}

/**
 * Approve return request (status goes to FOR_PICKING, sends sorry letter email)
 */
export async function approveReturnAction(id: string, apologyLetter: string) {
    try {
        id = sanitizeString(id);
        apologyLetter = sanitizeString(apologyLetter);

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!tx) return { success: false, error: "Transaction not found" };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: "FOR_PICKING",
                rejectionRemarks: apologyLetter,
                processedBy: user.id
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            await sendEmail({
                type: "DISPUTE_APPROVED",
                to: tx.user.email,
                name: resident?.firstName || tx.user.name || "Resident",
                remarks: apologyLetter,
                transactionId: tx.id
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Approve return error:", error);
        return { success: false, error: error.message || "Failed to approve return" };
    }
}

/**
 * Reject return request (status goes back to DELIVERED, sends rejection email)
 */
export async function rejectReturnAction(id: string, rejectionReason: string) {
    try {
        id = sanitizeString(id);
        rejectionReason = sanitizeString(rejectionReason);

        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "TREASURY_STAFF" && user.role !== "ADMIN")) {
            return { success: false, error: "Forbidden" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!tx) return { success: false, error: "Transaction not found" };

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                status: "DELIVERED",
                rejectionRemarks: rejectionReason,
                processedBy: user.id
            }
        });

        if (tx.user?.email) {
            const resident = tx.residentSnapshot as any;
            await sendEmail({
                type: "DISPUTE_REJECTED",
                to: tx.user.email,
                name: resident?.firstName || tx.user.name || "Resident",
                remarks: rejectionReason,
                transactionId: tx.id
            });
        }

        revalidatePath("/admin/treasury");
        revalidatePath("/user/services");
        return { success: true, data: updated };
    } catch (error: any) {
        console.error("Reject return error:", error);
        return { success: false, error: error.message || "Failed to reject return" };
    }
}


export async function saveZoningClearanceProofAction(id: string, url: string) {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "USER" && user.role !== "ADMIN" && user.role !== "ENGINEER")) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const currentAdditionalData = (transaction.additionalData as any) || {};

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                additionalData: {
                    ...currentAdditionalData,
                    zoningClearanceUrl: url
                }
            }
        });

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/treasury");
        revalidatePath("/user/services/building-permit");

        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Save zoning clearance proof error:", error);
        return { success: false, error: "Failed to save zoning clearance proof" };
    }
}

export async function checkPaymongoPaymentStatus(id: string) {
    try {
        const sanitizedId = sanitizeString(id);
        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const additional = (transaction.additionalData as any) || {};
        const sourceId = additional?.paymongo?.sourceId;
        const checkoutSessionId = additional?.paymongo?.checkoutSessionId;

        // If the transaction is already paid, no need to check
        if (transaction.status === "PAID") {
            return { success: true, status: "PAID" };
        }

        if (!sourceId && !checkoutSessionId) {
            return { success: true, status: transaction.status };
        }

        const secret = process.env.PAYMONGO_SECRET_KEY;
        if (!secret) {
            return { success: false, error: "PAYMONGO_SECRET_KEY not configured" };
        }

        const auth = Buffer.from(secret + ":").toString("base64");

        // 1. Handle Checkout Session status verification
        if (checkoutSessionId) {
            const csres = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${checkoutSessionId}`, {
                method: "GET",
                headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
            });

            if (csres.ok) {
                const csdata = await csres.json();
                const csAttrs = csdata?.data?.attributes || {};
                const csStatus = csAttrs?.status;
                const payments = csAttrs?.payments || [];

                console.log(`[checkPaymongoPaymentStatus] Checkout session ${checkoutSessionId}: status="${csStatus}", payments count=${payments.length}`);

                // Check if any payment in the array is successful
                const successfulPayment = payments.find((p: any) => {
                    const pAttrs = p?.attributes || p?.data?.attributes || {};
                    const pStatus = pAttrs?.status;
                    return pStatus === "paid" || pStatus === "succeeded" || pStatus === "success";
                });

                // Consider session paid if: top-level status is "paid"/"complete"/"completed",
                // OR if there is at least one successful payment in the payments array
                const sessionIsPaid = csStatus === "paid" || csStatus === "complete" || csStatus === "completed" || !!successfulPayment;

                if (sessionIsPaid) {
                    const firstPayment = successfulPayment || payments[0] || {};
                    const paymentId = firstPayment.id || firstPayment.data?.id || null;
                    const payAttrs = firstPayment.attributes || firstPayment.data?.attributes || {};
                    const paymentStatus = payAttrs.status;

                    console.log(`[checkPaymongoPaymentStatus] Payment found: id=${paymentId}, status="${paymentStatus}"`);

                    const isPaid = paymentStatus === "succeeded" || paymentStatus === "paid" || paymentStatus === "success" || csStatus === "paid" || csStatus === "complete" || csStatus === "completed";
                    const mappedStatus = isPaid ? "PAID" : "PENDING";

                    // Determine amount: prefer payment-level amount, then line_items total, then session-level
                    const paymentAmount = Number(payAttrs?.amount || 0);
                    const lineItemsTotal = (csAttrs?.line_items || []).reduce((sum: number, item: any) => sum + (Number(item?.amount || 0) * Number(item?.quantity || 1)), 0);
                    const resolvedAmountCents = paymentAmount || lineItemsTotal || Number(csAttrs?.amount || 0);

                    // Upsert Payment in DB
                    await prisma.payment.upsert({
                        where: { transactionId: sanitizedId },
                        update: {
                            amount: (resolvedAmountCents || 0) / 100,
                            method: "E_PAYMENT",
                            status: mappedStatus as any,
                            reference: paymentId || checkoutSessionId,
                            meta: csdata,
                        },
                        create: {
                            transactionId: sanitizedId,
                            amount: (resolvedAmountCents || 0) / 100,
                            method: "E_PAYMENT",
                            status: mappedStatus as any,
                            reference: paymentId || checkoutSessionId,
                            meta: csdata,
                        },
                    });

                    // Update Transaction
                    const updatedAdditional = {
                        ...additional,
                        paymongo: {
                            ...additional.paymongo,
                            paymentId,
                            lastPayment: csdata
                        }
                    };
                    const txUpdate: any = { additionalData: updatedAdditional, updatedAt: new Date() };
                    if (isPaid) {
                        txUpdate.status = "PAID";
                        txUpdate.paymentReference = paymentId || checkoutSessionId;
                    }

                    await prisma.transaction.update({
                        where: { id: sanitizedId },
                        data: txUpdate
                    });

                    revalidatePath(`/user/services/requests/${sanitizedId}`);
                    revalidatePath("/user/services/requests");
                    revalidatePath("/admin/treasury");

                    console.log(`[checkPaymongoPaymentStatus] Transaction ${sanitizedId} updated to ${mappedStatus}`);
                    return { success: true, status: isPaid ? "PAID" : "PENDING" };
                } else {
                    console.log(`[checkPaymongoPaymentStatus] Session not yet paid. status="${csStatus}", no successful payments found.`);
                }
            } else {
                console.error("PayMongo fetch checkout session failed:", await csres.text());
            }
        }

        // 2. Fallback: Handle Source status verification (backward compatibility)
        if (sourceId) {
            const sres = await fetch(`https://api.paymongo.com/v1/sources/${sourceId}`, {
                method: "GET",
                headers: { Accept: "application/json", Authorization: `Basic ${auth}` },
            });

            if (sres.ok) {
                const sdata = await sres.json();
                const attrs = sdata?.data?.attributes || {};
                const status = attrs?.status;

                if (status === "chargeable") {
                    // Charge the source!
                    let amountCents = attrs?.amount;
                    if (!amountCents) {
                        amountCents = Math.round((Number(transaction.totalAmount) || 0) * 100);
                    }

                    const billing: any = {};
                    const billingSource = attrs?.billing || {};
                    if (billingSource.name) billing.name = billingSource.name;
                    if (billingSource.email) billing.email = billingSource.email;
                    if (billingSource.phone) billing.phone = billingSource.phone;

                    if (attrs?.metadata?.payerName || attrs?.metadata?.name) billing.name = attrs.metadata.payerName || attrs.metadata.name;
                    if (attrs?.metadata?.payerEmail || attrs?.metadata?.email) billing.email = attrs.metadata.payerEmail || attrs.metadata.email;
                    if (attrs?.metadata?.payerPhone || attrs?.metadata?.phone) billing.phone = attrs.metadata.payerPhone || attrs.metadata.phone;

                    const paymentPayload: any = {
                        data: {
                            attributes: {
                                amount: Number(amountCents),
                                currency: "PHP",
                                source: { id: sourceId, type: "source" },
                                ...(Object.keys(billing).length > 0 ? { billing } : {})
                            },
                        },
                    };

                    const res = await fetch("https://api.paymongo.com/v1/payments", {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            "Content-Type": "application/json",
                            Authorization: `Basic ${auth}`,
                        },
                        body: JSON.stringify(paymentPayload),
                    });

                    const payData = await res.json();
                    if (!res.ok) {
                        console.error("PayMongo create payment failed inside check status", payData);
                        return { success: false, error: "Failed to charge source" };
                    }

                    const payment = payData?.data;
                    const payAttrs = payment?.attributes || {};
                    const paymentStatus = payAttrs?.status; // e.g. "succeeded" or "paid"

                    // Map payment status to database format
                    const isPaid = paymentStatus === "succeeded" || paymentStatus === "paid" || paymentStatus === "success";
                    const mappedStatus = isPaid ? "PAID" : "PENDING";
                    const paymentId = payment?.id || payData?.id || null;

                    // Upsert Payment in DB
                    await prisma.payment.upsert({
                        where: { transactionId: sanitizedId },
                        update: {
                            amount: (Number(payAttrs?.amount || amountCents) || 0) / 100,
                            method: "E_PAYMENT",
                            status: mappedStatus as any,
                            reference: paymentId,
                            meta: payData,
                        },
                        create: {
                            transactionId: sanitizedId,
                            amount: (Number(payAttrs?.amount || amountCents) || 0) / 100,
                            method: "E_PAYMENT",
                            status: mappedStatus as any,
                            reference: paymentId,
                            meta: payData,
                        },
                    });

                    // Update Transaction
                    const updatedAdditional = {
                        ...additional,
                        paymongo: {
                            ...additional.paymongo,
                            paymentId,
                            lastPayment: payData
                        }
                    };
                    const txUpdate: any = { additionalData: updatedAdditional, updatedAt: new Date() };
                    if (isPaid) {
                        txUpdate.status = "PAID";
                        txUpdate.paymentReference = paymentId;
                    }

                    await prisma.transaction.update({
                        where: { id: sanitizedId },
                        data: txUpdate
                    });

                    revalidatePath(`/user/services/requests/${sanitizedId}`);
                    revalidatePath("/user/services/requests");
                    revalidatePath("/admin/treasury");

                    return { success: true, status: isPaid ? "PAID" : "PENDING" };
                }
            } else {
                console.error("PayMongo fetch source failed inside check status:", await sres.text());
            }
        }

        return { success: true, status: transaction.status };
    } catch (err) {
        console.error("checkPaymongoPaymentStatus error:", err);
        return { success: false, error: "Internal server error" };
    }
}

/**
 * Save Logistics Details for a transaction (Resident side before PayMongo checkout)
 */
export async function saveLogisticsDetails(
    transactionId: string,
    fulfillmentType: "PICK_UP" | "DELIVERY" | "E_COPY",
    paymentType: string,
    deliveryAddress: any,
    deliveryLat: number | null,
    deliveryLng: number | null,
    deliveryLandmark: string
) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { type: true }
        });

        if (!transaction || transaction.userId !== session.user.id) {
            return { success: false, error: "Transaction not found" };
        }

        // Recalculate total amount if delivery is selected
        let actualDeliveryFee = 0;
        if (fulfillmentType === "DELIVERY") {
            actualDeliveryFee = transaction.type.deliveryFee || 0;
            const barangayName = deliveryAddress?.barangay;

            if (barangayName) {
                const brgy = await prisma.barangayInfo.findUnique({
                    where: { name: barangayName }
                }) as any;

                if (brgy && brgy.deliveryFee > 0) {
                    actualDeliveryFee = brgy.deliveryFee;
                }
            }
        }

        const fiscal = (typeof transaction.fiscalSnapshot === "string" ? JSON.parse(transaction.fiscalSnapshot) : transaction.fiscalSnapshot) as any || {};
        
        // Sum any line items inside fiscalSnapshot (excluding Business/Building permits as their lineItems are already in basicTax)
        const isBusinessOrBuilding = transaction.type.code.startsWith("BUSINESS_PERMIT") || transaction.type.code.startsWith("BUILDING_PERMIT");
        const lineItemsSum = (!isBusinessOrBuilding && Array.isArray(fiscal.lineItems))
            ? fiscal.lineItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
            : 0;

        const baseAmount = Number(fiscal.basicTax || 0) + 
                           Number(fiscal.additionalTax || 0) + 
                           Number(fiscal.penaltyCharge || 0) +
                           (!isBusinessOrBuilding ? Number(fiscal.miscFee || 0) : 0) +
                           lineItemsSum;

        // Subtract any previously saved delivery fee to prevent accumulation on re-clicks
        const existingDeliveryFee = Number(fiscal.deliveryFee || 0);
        const resolvedBase = baseAmount > 0
            ? baseAmount
            : Math.max(0, Number(transaction.totalAmount) - existingDeliveryFee);

        const totalWithLogistics = resolvedBase + actualDeliveryFee;

        await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                fulfillmentType,
                paymentType: paymentType as any,
                deliveryAddress: fulfillmentType === "DELIVERY" ? deliveryAddress : null,
                deliveryLat: fulfillmentType === "DELIVERY" ? deliveryLat : null,
                deliveryLng: fulfillmentType === "DELIVERY" ? deliveryLng : null,
                deliveryLandmark: fulfillmentType === "DELIVERY" ? deliveryLandmark : null,
                totalAmount: totalWithLogistics,
                fiscalSnapshot: {
                    ...fiscal,
                    deliveryFee: actualDeliveryFee,
                    totalAmount: totalWithLogistics
                },
                updatedAt: new Date()
            } as any
        });

        revalidatePath("/user/services/requests");
        return { success: true };
    } catch (error) {
        console.error("Save logistics details error:", error);
        return { success: false, error: "Failed to save logistics details" };
    }
}

/**
 * Request PSA Endorsement (Resident side)
 * For LCR_BIRTH transactions with FORM_1A registry book verification.
 * User uploads a PSA Negative Certification as proof.
 */
export async function requestPsaEndorsement(formData: FormData) {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transactionId = sanitizeString(formData.get("transactionId") as string);
        const psaNegCertFile = formData.get("psaNegCertFile") as File;

        if (!transactionId) return { success: false, error: "Transaction ID is required" };
        if (!psaNegCertFile || psaNegCertFile.size === 0) {
            return { success: false, error: "PSA Negative Certification document is required" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: transactionId, userId: session.user.id },
            include: { type: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const typeCode = (transaction.type?.code || "").toUpperCase();
        if (typeCode !== "LCR_BIRTH" && typeCode !== "LCR_DEATH" && typeCode !== "LCR_MARRIAGE") {
            return { success: false, error: "PSA Endorsement is only available for Birth, Death, or Marriage Certificate requests" };
        }

        if (!["RELEASED", "DELIVERED"].includes(transaction.status as string)) {
            return { success: false, error: "PSA Endorsement can only be requested after document release" };
        }

        const additionalData = (transaction.additionalData as any) || {};

        if (additionalData.psaEndorsementRequested) {
            return { success: false, error: "PSA Endorsement has already been requested for this transaction" };
        }

        const isDeath = typeCode === "LCR_DEATH";
        const isMarriage = typeCode === "LCR_MARRIAGE";
        const targetCode = isDeath ? "LCR_DEATH_PSA_ENDORSEMENT" : (isMarriage ? "LCR_MARRIAGE_PSA_ENDORSEMENT" : "LCR_PSA_ENDORSEMENT");

        // 1. Ensure the transaction type exists in the database
        let psaType = await prisma.transactionType.findUnique({
            where: { code: targetCode }
        });
        if (!psaType) {
            if (isDeath) {
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
            } else if (isMarriage) {
                psaType = await prisma.transactionType.create({
                    data: {
                        code: "LCR_MARRIAGE_PSA_ENDORSEMENT",
                        name: "Marriage PSA Endorsement",
                        description: "Request PSA Endorsement for Marriage Certificate.",
                        level: 1,
                        category: "Civil Registry",
                        baseFee: 200.00,
                        deliveryFee: 0.00,
                        isFixed: true,
                        requiredDocs: ["PSA Negative Certification"],
                        formSchema: {
                            type: "CIVIL_REGISTRY",
                            registryType: "MARRIAGE_PSA_ENDORSEMENT",
                            fields: ["originalTransactionId", "psaNegCertUrl"]
                        },
                        requiresBusinessName: false,
                        supportsECopy: true,
                        processorRole: "TREASURY_STAFF"
                    }
                });
            } else {
                psaType = await prisma.transactionType.create({
                    data: {
                        code: "LCR_PSA_ENDORSEMENT",
                        name: "PSA Endorsement",
                        description: "Request PSA Endorsement for Birth Certificate.",
                        level: 1,
                        category: "Civil Registry",
                        baseFee: 200.00,
                        deliveryFee: 0.00,
                        isFixed: true,
                        requiredDocs: ["PSA Negative Certification"],
                        formSchema: {
                            type: "CIVIL_REGISTRY",
                            registryType: "PSA_ENDORSEMENT",
                            fields: ["originalTransactionId", "psaNegCertUrl"]
                        },
                        requiresBusinessName: false,
                        supportsECopy: true,
                        processorRole: "TREASURY_STAFF"
                    }
                });
            }
        }

        // 2. Upload PSA Negative Certification file
        const psaNegCertUrl = await processFileUpload(psaNegCertFile, "psa_endorsement");
        if (!psaNegCertUrl) {
            return { success: false, error: "Failed to upload PSA Negative Certification" };
        }

        // 3. Create a brand new transaction and update the original transaction
        const originalAddData = (transaction.additionalData as any) || {};

        await prisma.$transaction(async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
            const newTx = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId: psaType!.id,
                    status: "FOR_REQUESTING",
                    fulfillmentType: transaction.fulfillmentType || "PICK_UP",
                    paymentType: null,
                    totalAmount: 200.00,
                    residentSnapshot: transaction.residentSnapshot || {},
                    businessName: null,
                    additionalData: {
                        originalTransactionId: transactionId,
                        psaNegCertUrl,
                        psaEndorsementRequested: true,
                        psaEndorsementFee: 200,
                        subjectName: transaction.businessName || originalAddData.subjectName || ""
                    }
                }
            });

            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    additionalData: {
                        ...originalAddData,
                        psaEndorsementRequested: true,
                        psaEndorsementDate: new Date().toISOString(),
                        psaNegCertUrl,
                        psaEndorsementFee: 200,
                        psaEndorsementTransactionId: newTx.id
                    },
                    updatedAt: new Date()
                }
            });
        });

        revalidatePath("/user/services/requests");
        revalidatePath(`/user/services/requests/${transactionId}`);
        revalidatePath("/admin/registrar");
        return { success: true };
    } catch (error) {
        console.error("Request PSA endorsement error:", error);
        return { success: false, error: "Failed to submit PSA endorsement request" };
    }
}

/**
 * Transition registrar civil registry request to FOR_PROCESSING and email the citizen
 */
export async function processRegistrarRequest(id: string) {
    try {
        const sanitizedId = sanitizeString(id);
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && user.role !== "REGISTRAR" && !isUserAdminAide(user))) {
            return { success: false, error: "Forbidden" };
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id: sanitizedId },
            include: { type: true, user: true }
        });

        if (!transaction) return { success: false, error: "Transaction not found" };

        const updatedTransaction = await prisma.transaction.update({
            where: { id: sanitizedId },
            data: {
                status: "FOR_PROCESSING",
                updatedAt: new Date()
            },
            include: { user: true, type: true }
        });

        // Send processing email to the citizen using sendEmail
        if (updatedTransaction.user?.email) {
            const resident = updatedTransaction.residentSnapshot as any;
            await sendEmail({
                type: "PROCESSING",
                to: updatedTransaction.user.email,
                name: resident?.firstName ? `${resident.firstName} ${resident.lastName}` : updatedTransaction.user.name || "Resident",
                transactionId: sanitizedId.slice(-8).toUpperCase(),
                serviceName: updatedTransaction.type?.name || "Civil Registry Request"
            });
        }

        revalidatePath("/admin/registrar");
        return { success: true, data: updatedTransaction };
    } catch (error) {
        console.error("Process registrar request error:", error);
        return { success: false, error: "Failed to process request" };
    }
}

/**
 * Get the latest completed birth transaction for the current user that has an issued Form 1A document.
 */
export async function getLatestForm1AForCurrentUser() {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                type: {
                    code: {
                        in: ["LCR_BIRTH", "LCR_BIRTH_REG"]
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
            if (addData.registryBookVerification === "FORM_1A") {
                const docUrl = addData.scannedDocUrl || addData.verificationDocUrl || tx.eCopyUrl;
                if (docUrl) {
                    const snap = (tx.residentSnapshot as any) || {};
                    return {
                        success: true,
                        data: {
                            transactionId: tx.id,
                            docUrl: docUrl,
                            subjectName: addData.subjectName || addData.fullName || (snap.firstName ? `${snap.firstName} ${snap.lastName}` : null),
                            dateOfBirth: addData.dateOfBirth || addData.dateOfEvent || snap.dateOfBirth || null,
                            mothersMaidenName: addData.mothersMaidenName || addData.motherName || addData.mother || null
                        }
                    };
                }
            }
        }

        return { success: false, error: "No issued Form 1A found for the user" };
    } catch (error) {
        console.error("getLatestForm1AForCurrentUser error:", error);
        return { success: false, error: "Failed to fetch latest Form 1A" };
    }
}

/**
 * Get the latest completed marriage transaction for the current user that has an issued Form 3A document.
 */
export async function getLatestForm3AForCurrentUser() {
    try {
        const session = await getSession();
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };

        const transactions = await prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                type: {
                    code: {
                        in: ["LCR_MARRIAGE", "LCR_MARRIAGE_REG"]
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
            const hasForm3A = addData.registryBookVerification === "FORM_3A" || 
                              !!addData.form3a || 
                              !!addData.form3A;
            if (hasForm3A) {
                const docUrl = addData.scannedDocUrl || 
                               addData.verificationDocUrl || 
                               addData.form3a || 
                               addData.form3A || 
                               tx.eCopyUrl;
                if (docUrl) {
                    return {
                        success: true,
                        data: {
                            transactionId: tx.id,
                            docUrl: docUrl,
                            husbandName: addData.husbandName || addData.applicant1?.fullName || null,
                            wifeName: addData.wifeName || addData.applicant2?.fullName || null,
                            dateOfMarriage: addData.dateOfMarriage || addData.dateOfEvent || null,
                            placeOfMarriage: addData.placeOfMarriage || addData.placeOfEvent || null
                        }
                    };
                }
            }
        }

        return { success: false, error: "No issued Form 3A found for the user" };
    } catch (error) {
        console.error("getLatestForm3AForCurrentUser error:", error);
        return { success: false, error: "Failed to fetch latest Form 3A" };
    }
}

/**
 * Fetch counts of all active and total registrar transactions grouped by their transaction type code.
 */
export async function getRegistrarActiveCounts() {
    try {
        const session = await getSession();
        const user = session?.user as any;
        if (!user || (user.role !== "ADMIN" && user.role !== "REGISTRAR" && user.department?.toUpperCase() !== "REGISTRAR" && user.department?.toUpperCase() !== "CIVIL_REGISTRY")) {
            return { success: false, error: "Forbidden" };
        }

        const terminalStatuses = ["RELEASED", "REJECTED", "CANCELLED", "RETURNED", "REFUNDED", "DISPUTE_REJECTED"];

        // Query all registrar transactions to extract both active and total counts
        const allTransactions = await prisma.transaction.findMany({
            where: {
                type: {
                    OR: [
                        { category: "Civil Registry" },
                        { code: { startsWith: "LCR_" } },
                        { code: { startsWith: "CIVIL_REGISTRY" } }
                    ]
                }
            },
            include: {
                type: true
            }
        });

        // Map and filter active transactions based on their type code and status rules
        const activeCounts: Record<string, number> = {
            LCR_BIRTH: 0,
            LCR_BIRTH_REG: 0,
            LCR_PSA_ENDORSEMENT: 0,
            LCR_DEATH_REG: 0,
            LCR_DEATH: 0,
            LCR_DEATH_PSA_ENDORSEMENT: 0,
            LCR_MARRIAGE_LICENSE: 0,
            LCR_MARRIAGE_REG: 0,
            LCR_MARRIAGE: 0,
            LCR_MARRIAGE_PSA_ENDORSEMENT: 0,
        };

        const totalCounts: Record<string, number> = {
            LCR_BIRTH: 0,
            LCR_BIRTH_REG: 0,
            LCR_PSA_ENDORSEMENT: 0,
            LCR_DEATH_REG: 0,
            LCR_DEATH: 0,
            LCR_DEATH_PSA_ENDORSEMENT: 0,
            LCR_MARRIAGE_LICENSE: 0,
            LCR_MARRIAGE_REG: 0,
            LCR_MARRIAGE: 0,
            LCR_MARRIAGE_PSA_ENDORSEMENT: 0,
        };

        for (const tx of allTransactions) {
            const code = tx.type?.code;
            if (!code) continue;

            // Apply special category-specific filters
            if (code === "LCR_DEATH_REG" && tx.status === "FOR_REQUESTING") {
                continue;
            }
            if (code === "LCR_MARRIAGE_LICENSE" && tx.status === "FOR_REQUESTING") {
                continue;
            }
            if (code === "LCR_DEATH_PSA_ENDORSEMENT" && tx.status === "FOR_REQUESTING") {
                continue;
            }

            // Increment total counts
            if (totalCounts[code] !== undefined) {
                totalCounts[code]++;
            }

            // Increment active counts if non-terminal and not cancelled
            const isActive = !tx.isCancelled && !terminalStatuses.includes(tx.status);
            if (isActive && activeCounts[code] !== undefined) {
                activeCounts[code]++;
            }
        }

        return { 
            success: true, 
            data: { 
                activeCounts, 
                totalCounts 
            } 
        };
    } catch (error) {
        console.error("Get registrar counts error:", error);
        return { success: false, error: "Failed to get active transaction counts" };
    }
}

export async function markTransactionAsViewed(id: string) {
    try {
        const session = await getSession();
        const userId = session?.user?.id;
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id },
            select: { viewedAt: true }
        });
        if (!tx) {
            return { success: false, error: "Transaction not found" };
        }

        let currentViewedAt: Record<string, string> = {};
        if (tx.viewedAt && typeof tx.viewedAt === "object" && !Array.isArray(tx.viewedAt)) {
            currentViewedAt = { ...tx.viewedAt } as Record<string, string>;
        }

        currentViewedAt[userId] = new Date().toISOString();

        await prisma.transaction.update({
            where: { id },
            data: {
                viewedAt: currentViewedAt
            }
        });

        revalidatePath("/admin/registrar");
        return { success: true };
    } catch (error: any) {
        console.error("Error marking transaction as viewed:", error);
        return { success: false, error: error?.message || "Failed to mark transaction as viewed" };
    }
}


