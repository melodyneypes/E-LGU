"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { broadcastRealtimeUpdate } from "@/app/api/realtime/stream/route";
import { logActivity } from "@/lib/audit";

async function assertAssessorSession() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || (role !== "ASSESSOR" && role !== "ADMIN" && role !== "TREASURY_STAFF")) {
        throw new Error("Unauthorized access. Assessor, Treasury, or Admin role required.");
    }
    return { session, user };
}

/**
 * Fetch all archived & online Real Property Tax Declarations / Assessments with unified search, filter, and document mapping.
 */
export async function getArchivedAssessorRecords(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sourceType?: "ALL" | "PHYSICAL" | "ONLINE";
    propertyKind?: string;
    barangay?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        await assertAssessorSession();

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const sourceType = params?.sourceType || "ALL";
        const propertyKind = params?.propertyKind || "ALL";
        const barangay = params?.barangay || "ALL";
        const startDate = params?.startDate?.trim() || "";
        const endDate = params?.endDate?.trim() || "";

        const skip = (page - 1) * limit;

        const where: any = {
            isCancelled: false,
            type: {
                category: "RPT"
            }
        };

        // Source Type Filter (Physical Archive vs Online Portal Transactions)
        if (sourceType === "PHYSICAL") {
            where.additionalData = {
                path: ["isPhysicalArchive"],
                equals: true,
            };
        } else if (sourceType === "ONLINE") {
            where.NOT = {
                additionalData: {
                    path: ["isPhysicalArchive"],
                    equals: true,
                }
            };
        }

        // Search Filter (TDN, PIN, Owner Name, Title No, Survey No, Lot No)
        if (search) {
            where.OR = [
                { id: { contains: search, mode: "insensitive" } },
                {
                    additionalData: {
                        path: ["tdn"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["pin"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["ownerName"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["titleNumber"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["lotNumber"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["surveyNumber"],
                        string_contains: search
                    }
                },
                {
                    residentSnapshot: {
                        path: ["firstName"],
                        string_contains: search
                    }
                },
                {
                    residentSnapshot: {
                        path: ["lastName"],
                        string_contains: search
                    }
                }
            ];
        }

        // Barangay Filter
        if (barangay !== "ALL") {
            where.AND = where.AND || [];
            where.AND.push({
                OR: [
                    {
                        additionalData: {
                            path: ["barangay"],
                            string_contains: barangay
                        }
                    },
                    {
                        residentSnapshot: {
                            path: ["barangay"],
                            string_contains: barangay
                        }
                    },
                    {
                        additionalData: {
                            path: ["propertyAddress"],
                            string_contains: barangay
                        }
                    }
                ]
            });
        }

        // Property Kind Filter (LAND, BUILDING, MACHINERY)
        if (propertyKind !== "ALL") {
            where.AND = where.AND || [];
            where.AND.push({
                additionalData: {
                    path: ["propertyKind"],
                    string_contains: propertyKind
                }
            });
        }

        // Date Range Filter
        if (startDate || endDate) {
            where.AND = where.AND || [];
            const dateFilter: any = {};
            if (startDate) {
                dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
            }

            where.AND.push({
                createdAt: dateFilter
            });
        }

        const [transactions, totalCount] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    },
                    type: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            category: true
                        }
                    }
                }
            }),
            prisma.transaction.count({ where })
        ]);

        // Map and normalize documents into unified presentation structure
        const records = transactions.map(tx => {
            const rawAddData = (tx.additionalData as any) || {};
            const isPhysical = rawAddData.isPhysicalArchive === true;

            const tdn = rawAddData.tdn || "N/A";
            const pin = rawAddData.pin || "N/A";
            const titleNumber = rawAddData.titleNumber || rawAddData.titleNo || "N/A";
            const lotNumber = rawAddData.lotNumber || rawAddData.lotNo || "N/A";
            const surveyNumber = rawAddData.surveyNumber || rawAddData.surveyNo || "N/A";

            const rawSnapshot = (tx.residentSnapshot as any) || {};
            const ownerName =
                rawAddData.ownerName ||
                (rawSnapshot.firstName ? `${rawSnapshot.firstName} ${rawSnapshot.lastName || ""}`.trim() : null) ||
                tx.user?.name ||
                "Walk-in Declarant";

            const beneficiaryName = rawAddData.beneficiaryName || rawAddData.administrator || "";
            const barangayName = rawAddData.barangay || rawSnapshot.barangay || "Mapandan";
            const street = rawAddData.street || rawAddData.propertyAddress || "";

            const propertyKindName = rawAddData.propertyKind || (rawAddData.propertyType ? String(rawAddData.propertyType).toUpperCase() : "LAND");
            const classification = rawAddData.classification || "RESIDENTIAL";
            const area = rawAddData.area || "N/A";

            const marketValue = typeof rawAddData.marketValue === "number" ? rawAddData.marketValue : parseFloat(rawAddData.marketValue) || 0;
            const assessmentLevel = typeof rawAddData.assessmentLevel === "number" ? rawAddData.assessmentLevel : parseFloat(rawAddData.assessmentLevel) || 20;
            const assessedValue = typeof rawAddData.assessedValue === "number" ? rawAddData.assessedValue : parseFloat(rawAddData.assessedValue) || 0;

            const basicTax = typeof rawAddData.basicTax === "number" ? rawAddData.basicTax : Math.round(assessedValue * 0.01 * 100) / 100;
            const sefTax = typeof rawAddData.sefTax === "number" ? rawAddData.sefTax : Math.round(assessedValue * 0.01 * 100) / 100;
            const totalTaxDue = typeof rawAddData.totalTaxDue === "number" ? rawAddData.totalTaxDue : basicTax + sefTax;

            const effectivityYear = rawAddData.effectivityYear || new Date(tx.createdAt).getFullYear();
            const effectivityQuarter = rawAddData.effectivityQuarter || "1st Quarter";
            const physicalLocationNotes = rawAddData.physicalLocationNotes || rawAddData.remarks || "";

            // Gather all scanned documents into a structured list
            const scannedDocs: Array<{ label: string; url: string; fileName?: string }> = [];

            // Primary Tax Dec
            if (rawAddData.primaryDocumentUrl) {
                scannedDocs.push({
                    label: "Official Certified Tax Declaration",
                    url: rawAddData.primaryDocumentUrl,
                    fileName: "tax_declaration_primary.pdf"
                });
            } else if (tx.eCopyUrl) {
                scannedDocs.push({
                    label: "Official Certified Tax Declaration",
                    url: tx.eCopyUrl,
                    fileName: "tax_declaration_primary.pdf"
                });
            }

            // Attached supplementary docs
            if (Array.isArray(rawAddData.attachments)) {
                rawAddData.attachments.forEach((att: any) => {
                    if (att.url) {
                        scannedDocs.push({
                            label: att.label || "Supplementary Document",
                            url: att.url,
                            fileName: att.fileName
                        });
                    }
                });
            } else if (rawAddData.documents && typeof rawAddData.documents === "object") {
                Object.entries(rawAddData.documents).forEach(([label, url]) => {
                    if (url && typeof url === "string") {
                        scannedDocs.push({
                            label,
                            url
                        });
                    }
                });
            }

            // Fallback individual URL keys
            const legacyKeys = [
                { key: "titleUrl", label: "Land Title (TCT/OCT)" },
                { key: "deedOfSaleUrl", label: "Deed of Absolute Sale" },
                { key: "buildingPermitUrl", label: "Building Permit Scan" },
                { key: "birEcarUrl", label: "BIR eCAR Document" },
                { key: "previousOrUrl", label: "Previous Official Receipt" },
                { key: "validIdUrl", label: "Valid Government ID" }
            ];

            legacyKeys.forEach(lk => {
                if (rawAddData[lk.key] && !scannedDocs.some(d => d.url === rawAddData[lk.key])) {
                    scannedDocs.push({
                        label: lk.label,
                        url: rawAddData[lk.key]
                    });
                }
            });

            return {
                id: tx.id,
                transactionCode: tx.type?.code || "RPT",
                transactionName: tx.type?.name || "Real Property Tax Declaration",
                status: tx.status,
                createdAt: tx.createdAt,
                updatedAt: tx.updatedAt,
                isPhysicalArchive: isPhysical,
                processedBy: tx.processedBy || "Municipal Assessor Office",
                tdn,
                pin,
                titleNumber,
                lotNumber,
                surveyNumber,
                ownerName,
                beneficiaryName,
                barangay: barangayName,
                street,
                propertyKind: propertyKindName,
                classification,
                area,
                marketValue,
                assessmentLevel,
                assessedValue,
                basicTax,
                sefTax,
                totalTaxDue,
                effectivityYear,
                effectivityQuarter,
                physicalLocationNotes,
                scannedDocs,
                primaryScanUrl: scannedDocs[0]?.url || null,
                additionalData: rawAddData
            };
        });

        // Compute Vault KPI Metrics
        const [physicalCount, totalValuationRaw] = await Promise.all([
            prisma.transaction.count({
                where: {
                    isCancelled: false,
                    type: { category: "RPT" },
                    additionalData: {
                        path: ["isPhysicalArchive"],
                        equals: true
                    }
                }
            }),
            prisma.transaction.findMany({
                where: {
                    isCancelled: false,
                    type: { category: "RPT" }
                },
                select: {
                    additionalData: true
                }
            })
        ]);

        let totalAssessedValuation = 0;
        const uniqueBarangays = new Set<string>();

        totalValuationRaw.forEach(t => {
            const add = (t.additionalData as any) || {};
            const val = parseFloat(add.assessedValue) || parseFloat(add.marketValue) || 0;
            totalAssessedValuation += val;

            const brgy = add.barangay || "";
            if (brgy && brgy !== "ALL") {
                uniqueBarangays.add(brgy.trim());
            }
        });

        return {
            success: true,
            data: records,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit) || 1
            },
            stats: {
                totalRecords: totalCount,
                physicalDigitized: physicalCount,
                onlineProcessed: totalCount - physicalCount,
                totalAssessedValuation,
                activeBarangaysCount: uniqueBarangays.size
            }
        };
    } catch (error: any) {
        console.error("[getArchivedAssessorRecords] Error:", error);
        return { success: false, error: error.message || "Failed to fetch Assessor document archives." };
    }
}

/**
 * Encode and digitize a physical Real Property Tax Declaration paper record into the master vault.
 */
export async function createArchivedAssessorRecord(formData: FormData) {
    try {
        const { user } = await assertAssessorSession();

        const tdn = (formData.get("tdn") as string)?.trim();
        const pin = (formData.get("pin") as string)?.trim() || "";
        const titleNumber = (formData.get("titleNumber") as string)?.trim() || "";
        const lotNumber = (formData.get("lotNumber") as string)?.trim() || "";
        const surveyNumber = (formData.get("surveyNumber") as string)?.trim() || "";

        const ownerName = (formData.get("ownerName") as string)?.trim();
        const beneficiaryName = (formData.get("beneficiaryName") as string)?.trim() || "";
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || "";
        const email = (formData.get("email") as string)?.trim() || "";

        const barangay = (formData.get("barangay") as string)?.trim() || "Poblacion";
        const street = (formData.get("street") as string)?.trim() || "";

        const propertyKind = (formData.get("propertyKind") as string)?.trim() || "LAND";
        const classification = (formData.get("classification") as string)?.trim() || "RESIDENTIAL";
        const area = (formData.get("area") as string)?.trim() || "0 sqm";

        const marketValue = parseFloat(formData.get("marketValue") as string) || 0;
        const assessmentLevel = parseFloat(formData.get("assessmentLevel") as string) || 20;
        const assessedValue = parseFloat(formData.get("assessedValue") as string) || Math.round(marketValue * (assessmentLevel / 100) * 100) / 100;

        const basicTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const sefTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const totalTaxDue = basicTax + sefTax;

        const effectivityYear = parseInt(formData.get("effectivityYear") as string, 10) || new Date().getFullYear();
        const effectivityQuarter = (formData.get("effectivityQuarter") as string)?.trim() || "1st Quarter";
        const physicalLocationNotes = (formData.get("physicalLocationNotes") as string)?.trim() || "";

        if (!tdn) {
            return { success: false, error: "Tax Declaration Number (TDN) is required." };
        }
        if (!ownerName) {
            return { success: false, error: "Declared Owner Name is required." };
        }

        // Check for duplicate TDN in active records
        const existingTx = await prisma.transaction.findFirst({
            where: {
                isCancelled: false,
                type: { category: "RPT" },
                additionalData: {
                    path: ["tdn"],
                    equals: tdn
                }
            }
        });

        if (existingTx) {
            return { success: false, error: `Tax Declaration Number "${tdn}" already exists in the archive vault.` };
        }

        // Ensure RPT Transaction Type exists
        let rptType = await prisma.transactionType.findFirst({
            where: { code: "RPT_DECLARATION_ARCHIVE" }
        });

        if (!rptType) {
            rptType = await prisma.transactionType.findFirst({
                where: { category: "RPT" }
            });
        }

        if (!rptType) {
            rptType = await prisma.transactionType.create({
                data: {
                    code: "RPT_DECLARATION_ARCHIVE",
                    name: "Real Property Tax Declaration & Assessment Archive",
                    category: "RPT",
                    processorRole: "ASSESSOR",
                    baseFee: 0,
                    isActive: true
                }
            });
        }

        // Upload Primary Scanned Certified Tax Declaration
        let primaryDocumentUrl: string | null = null;
        const mainTaxDecFile = formData.get("mainTaxDecFile");
        if (mainTaxDecFile instanceof File && mainTaxDecFile.size > 0) {
            const timestamp = Date.now();
            const safeName = mainTaxDecFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `assessor/archives/${timestamp}-TDN-${safeName}`;
            primaryDocumentUrl = await uploadFile(mainTaxDecFile, path);
        }

        // Process Additional Supplementary Attachments
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");
        const attachments: Array<{ label: string; url: string; fileName: string }> = [];

        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const label = (attachedLabels[i] as string)?.trim() || `Supplementary Document ${i + 1}`;

            if (file instanceof File && file.size > 0) {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `assessor/archives/${timestamp}-${i}-${safeName}`;
                const url = await uploadFile(file, path);
                if (url) {
                    attachments.push({
                        label,
                        url,
                        fileName: file.name
                    });
                }
            }
        }

        const additionalDataPayload = {
            isPhysicalArchive: true,
            tdn,
            pin,
            titleNumber,
            lotNumber,
            surveyNumber,
            ownerName,
            beneficiaryName,
            contactNumber,
            email,
            barangay,
            street,
            propertyAddress: [street, `Brgy. ${barangay}`, "Mapandan, Pangasinan"].filter(Boolean).join(", "),
            propertyKind,
            classification,
            propertyType: classification,
            area,
            marketValue,
            assessmentLevel,
            assessedValue,
            basicTax,
            sefTax,
            totalTaxDue,
            effectivityYear,
            effectivityQuarter,
            physicalLocationNotes,
            primaryDocumentUrl,
            attachments,
            assessorStatus: "APPROVED",
            treasuryStatus: "ARCHIVED"
        };

        const newRecord = await prisma.transaction.create({
            data: {
                typeId: rptType.id,
                status: "RELEASED",
                isCancelled: false,
                isPaid: true,
                totalAmount: totalTaxDue,
                processedBy: user?.name || user?.email || "Assessor Officer",
                eCopyUrl: primaryDocumentUrl,
                residentSnapshot: {
                    firstName: ownerName.split(" ")[0] || ownerName,
                    lastName: ownerName.split(" ").slice(1).join(" ") || "",
                    email,
                    contactNumber,
                    barangay,
                    street
                },
                additionalData: additionalDataPayload
            }
        });

        // Broadcast realtime update
        try {
            await broadcastRealtimeUpdate({
                type: "ASSESSOR_ARCHIVE_CREATED",
                data: { id: newRecord.id, tdn, ownerName, barangay }
            });
        } catch {
            // Non-blocking realtime event
        }

        // Log Digitization Activity
        await logActivity({
            action: "DIGITIZE",
            entityType: "RealPropertyTax",
            entityId: newRecord.id,
            entityName: `TDN: ${tdn} (${ownerName})`,
            description: `Digitized legacy paper Tax Declaration for ${ownerName} in Brgy. ${barangay}`,
            metadata: {
                tdn,
                pin,
                titleNumber,
                ownerName,
                barangay,
                propertyKind,
                marketValue,
                assessedValue,
                totalTaxDue
            }
        });

        revalidatePath("/admin/assessor/archive");
        revalidatePath("/admin/assessor");

        return {
            success: true,
            message: `Tax Declaration "${tdn}" successfully digitized and added to vault.`,
            recordId: newRecord.id
        };
    } catch (error: any) {
        console.error("[createArchivedAssessorRecord] Error:", error);
        return { success: false, error: error.message || "Failed to encode Assessor physical record." };
    }
}

/**
 * Delete a physical archive record from the vault.
 */
export async function deleteArchivedAssessorRecord(id: string) {
    try {
        await assertAssessorSession();

        const tx = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!tx) {
            return { success: false, error: "Record not found in database." };
        }

        const addData = (tx.additionalData as any) || {};
        if (addData.isPhysicalArchive !== true) {
            return {
                success: false,
                error: "Deletion restricted. Only physical digitized archive entries can be deleted directly."
            };
        }

        // Collect all attached document URLs to clean up Supabase storage
        const urlsToDelete: string[] = [];
        if (tx.eCopyUrl) urlsToDelete.push(tx.eCopyUrl);
        if (addData.primaryDocumentUrl) urlsToDelete.push(addData.primaryDocumentUrl);
        if (Array.isArray(addData.attachments)) {
            addData.attachments.forEach((a: any) => {
                if (a?.url) urlsToDelete.push(a.url);
            });
        }
        if (addData.documents && typeof addData.documents === "object") {
            Object.values(addData.documents).forEach((url: any) => {
                if (typeof url === "string" && url) urlsToDelete.push(url);
            });
        }
        const legacyKeys = ["previousOrUrl", "validIdUrl"];
        legacyKeys.forEach(key => {
            if (addData[key] && typeof addData[key] === "string") {
                urlsToDelete.push(addData[key]);
            }
        });

        await prisma.transaction.update({
            where: { id },
            data: { isCancelled: true }
        });

        // Clean up uploaded files in Supabase storage asynchronously
        if (urlsToDelete.length > 0) {
            Promise.allSettled(Array.from(new Set(urlsToDelete)).map(url => deleteFileByUrl(url))).catch(err => {
                console.error("[Storage Cleanup] Error deleting assessor archive files from storage:", err);
            });
        }

        revalidatePath("/admin/assessor/archive");
        revalidatePath("/admin/assessor");

        return { success: true, message: "Archived record removed successfully and associated files cleaned from storage." };
    } catch (error: any) {
        console.error("[deleteArchivedAssessorRecord] Error:", error);
        return { success: false, error: error.message || "Failed to delete archived record." };
    }
}

/**
 * Update an existing physical Real Property Tax Declaration archive record.
 */
export async function updateArchivedAssessorRecord(formData: FormData) {
    try {
        const { user } = await assertAssessorSession();

        const transactionId = (formData.get("transactionId") as string)?.trim();
        if (!transactionId) {
            return { success: false, error: "Transaction Record ID is required for editing." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!tx) {
            return { success: false, error: "Record not found in the database." };
        }

        const prevAddData = (tx.additionalData as any) || {};
        if (prevAddData.isPhysicalArchive !== true) {
            return {
                success: false,
                error: "Edit restricted. Only physical digitized archive entries can be edited here."
            };
        }

        const tdn = (formData.get("tdn") as string)?.trim();
        const pin = (formData.get("pin") as string)?.trim() || "";
        const titleNumber = (formData.get("titleNumber") as string)?.trim() || "";
        const lotNumber = (formData.get("lotNumber") as string)?.trim() || "";
        const surveyNumber = (formData.get("surveyNumber") as string)?.trim() || "";

        const ownerName = (formData.get("ownerName") as string)?.trim();
        const beneficiaryName = (formData.get("beneficiaryName") as string)?.trim() || "";
        const contactNumber = (formData.get("contactNumber") as string)?.trim() || "";
        const email = (formData.get("email") as string)?.trim() || "";

        const barangay = (formData.get("barangay") as string)?.trim() || "Poblacion";
        const street = (formData.get("street") as string)?.trim() || "";

        const propertyKind = (formData.get("propertyKind") as string)?.trim() || "LAND";
        const classification = (formData.get("classification") as string)?.trim() || "RESIDENTIAL";
        const area = (formData.get("area") as string)?.trim() || "0 sqm";

        const marketValue = parseFloat(formData.get("marketValue") as string) || 0;
        const assessmentLevel = parseFloat(formData.get("assessmentLevel") as string) || 20;
        const assessedValue = parseFloat(formData.get("assessedValue") as string) || Math.round(marketValue * (assessmentLevel / 100) * 100) / 100;

        const basicTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const sefTax = Math.round(assessedValue * 0.01 * 100) / 100;
        const totalTaxDue = basicTax + sefTax;

        const effectivityYear = parseInt(formData.get("effectivityYear") as string, 10) || new Date().getFullYear();
        const effectivityQuarter = (formData.get("effectivityQuarter") as string)?.trim() || "1st Quarter";
        const physicalLocationNotes = (formData.get("physicalLocationNotes") as string)?.trim() || "";

        if (!tdn) {
            return { success: false, error: "Tax Declaration Number (TDN) is required." };
        }
        if (!ownerName) {
            return { success: false, error: "Declared Owner Name is required." };
        }

        // Check for duplicate TDN across OTHER active records
        const conflict = await prisma.transaction.findFirst({
            where: {
                id: { not: transactionId },
                isCancelled: false,
                type: { category: "RPT" },
                additionalData: {
                    path: ["tdn"],
                    equals: tdn
                }
            }
        });

        if (conflict) {
            return {
                success: false,
                error: `Tax Declaration Number "${tdn}" is already registered to another active record.`
            };
        }

        // --- Document Processing & URL Diffing ---
        let primaryDocumentUrl = prevAddData.primaryDocumentUrl || tx.eCopyUrl || null;
        const attachments: Array<{ label: string; url: string; fileName: string }> = [];

        // 1. Process Main Tax Dec Scan (Upload new or retain existing)
        const mainTaxDecFile = formData.get("mainTaxDecFile") as File | null;
        if (mainTaxDecFile && mainTaxDecFile instanceof File && mainTaxDecFile.size > 0) {
            const timestamp = Date.now();
            const safeName = mainTaxDecFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `assessor/archives/${timestamp}-TAXDEC-${safeName}`;
            const uploadedUrl = await uploadFile(mainTaxDecFile, path);
            if (uploadedUrl) {
                primaryDocumentUrl = uploadedUrl;
            }
        } else {
            const existingMainUrl = (formData.get("existingMainUrl") as string || "").trim();
            if (existingMainUrl) {
                primaryDocumentUrl = existingMainUrl;
            }
        }

        // 2. Retain existing supplementary documents from JSON
        const existingDocsJson = (formData.get("existingDocuments") as string || "").trim();
        if (existingDocsJson) {
            try {
                const parsedExisting = JSON.parse(existingDocsJson);
                if (Array.isArray(parsedExisting)) {
                    parsedExisting.forEach((doc: any) => {
                        if (doc.url && doc.url !== primaryDocumentUrl) {
                            attachments.push({
                                label: doc.label || doc.title || "Supplementary Document",
                                url: doc.url,
                                fileName: doc.fileName || doc.url.split("/").pop() || "document.webp"
                            });
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse existing documents JSON in Assessor update:", e);
            }
        }

        // 3. Process Newly Added Supplementary Attachments
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");

        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const label = (attachedLabels[i] as string)?.trim() || `Supplementary Document ${i + 1}`;

            if (file instanceof File && file.size > 0) {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `assessor/archives/${timestamp}-${i}-${safeName}`;
                const url = await uploadFile(file, path);
                if (url) {
                    attachments.push({
                        label,
                        url,
                        fileName: file.name
                    });
                }
            }
        }

        // Snapshot all previous file URLs to identify orphaned files
        const oldUrls: string[] = [];
        if (tx.eCopyUrl) oldUrls.push(tx.eCopyUrl);
        if (prevAddData.primaryDocumentUrl) oldUrls.push(prevAddData.primaryDocumentUrl);
        if (Array.isArray(prevAddData.attachments)) {
            prevAddData.attachments.forEach((a: any) => {
                if (a?.url) oldUrls.push(a.url);
            });
        }
        if (prevAddData.documents && typeof prevAddData.documents === "object") {
            Object.values(prevAddData.documents).forEach((url: any) => {
                if (typeof url === "string" && url) oldUrls.push(url);
            });
        }
        const legacyKeys = ["previousOrUrl", "validIdUrl"];
        legacyKeys.forEach(key => {
            if (prevAddData[key] && typeof prevAddData[key] === "string") {
                oldUrls.push(prevAddData[key]);
            }
        });

        // Set of URLs that are actively retained
        const retainedUrls = new Set<string>();
        if (primaryDocumentUrl) retainedUrls.add(primaryDocumentUrl);
        attachments.forEach(att => {
            if (att.url) retainedUrls.add(att.url);
        });

        // Compute orphaned URLs that were replaced or removed
        const urlsToDelete = Array.from(new Set(oldUrls)).filter(url => url && !retainedUrls.has(url));

        const updatedAdditionalData = {
            ...prevAddData,
            isPhysicalArchive: true,
            tdn,
            pin,
            titleNumber,
            lotNumber,
            surveyNumber,
            ownerName,
            beneficiaryName,
            contactNumber,
            email,
            barangay,
            street,
            propertyAddress: [street, `Brgy. ${barangay}`, "Mapandan, Pangasinan"].filter(Boolean).join(", "),
            propertyKind,
            classification,
            propertyType: classification,
            area,
            marketValue,
            assessmentLevel,
            assessedValue,
            basicTax,
            sefTax,
            totalTaxDue,
            effectivityYear,
            effectivityQuarter,
            physicalLocationNotes,
            primaryDocumentUrl,
            attachments,
            lastEditedBy: user?.name || user?.email || "Assessor Officer",
            lastEditedAt: new Date().toISOString()
        };

        // Update database record
        const updatedRecord = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                totalAmount: totalTaxDue,
                eCopyUrl: primaryDocumentUrl,
                residentSnapshot: {
                    firstName: ownerName.split(" ")[0] || ownerName,
                    lastName: ownerName.split(" ").slice(1).join(" ") || "",
                    email,
                    contactNumber,
                    barangay,
                    street
                },
                additionalData: updatedAdditionalData
            }
        });

        // Clean up orphaned files in Supabase storage asynchronously
        if (urlsToDelete.length > 0) {
            Promise.allSettled(urlsToDelete.map(url => deleteFileByUrl(url))).catch(err => {
                console.error("[Storage Cleanup] Error removing replaced assessor files:", err);
            });
        }

        // Broadcast realtime update
        try {
            await broadcastRealtimeUpdate({
                type: "ASSESSOR_ARCHIVE_UPDATED",
                data: { id: updatedRecord.id, tdn, ownerName, barangay }
            });
        } catch {
            // Non-blocking realtime event
        }

        // Log Edit Activity
        await logActivity({
            action: "UPDATE",
            entityType: "RealPropertyTax",
            entityId: updatedRecord.id,
            entityName: `TDN: ${tdn} (${ownerName})`,
            description: `Updated physical Tax Declaration for ${ownerName} in Brgy. ${barangay}`,
            metadata: {
                tdn,
                pin,
                titleNumber,
                ownerName,
                barangay,
                propertyKind,
                marketValue,
                assessedValue,
                totalTaxDue
            }
        });

        revalidatePath("/admin/assessor/archive");
        revalidatePath("/admin/assessor");

        return {
            success: true,
            message: `Tax Declaration "${tdn}" successfully updated in vault.`,
            recordId: updatedRecord.id
        };
    } catch (error: any) {
        console.error("[updateArchivedAssessorRecord] Error:", error);
        return { success: false, error: error.message || "Failed to update Assessor physical record." };
    }
}
