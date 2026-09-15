"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { broadcastRealtimeUpdate } from "@/app/api/realtime/stream/route";
import { logActivity } from "@/lib/audit";

async function assertRegistrarSession() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;
    const department = (user?.department || "").toUpperCase();

    const isRegistrarStaff =
        role === "ADMIN" ||
        role === "TREASURY_STAFF" ||
        role === "REGISTRAR" ||
        department === "REGISTRAR" ||
        department === "CIVIL_REGISTRY";

    if (!session || !isRegistrarStaff) {
        throw new Error("Unauthorized access. Civil Registrar or Admin privileges required.");
    }
    return { session, user };
}

export type RegistryCategory = "ALL" | "BIRTH" | "DEATH" | "MARRIAGE" | "LEGAL_INSTRUMENT";

/**
 * Fetch archived physical and historical Civil Registry records with unified multi-faceted filtering.
 */
export async function getArchivedRegistrarRecords(params?: {
    page?: number;
    limit?: number;
    search?: string;
    registryType?: RegistryCategory;
    sourceType?: "ALL" | "PHYSICAL" | "ONLINE";
    startDate?: string;
    endDate?: string;
}) {
    try {
        await assertRegistrarSession();

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const registryType = params?.registryType || "ALL";
        const sourceType = params?.sourceType || "ALL";
        const startDate = params?.startDate?.trim() || "";
        const endDate = params?.endDate?.trim() || "";

        const skip = (page - 1) * limit;

        // Base criteria: Civil Registry category
        const where: any = {
            isCancelled: false,
            type: {
                category: { in: ["Civil Registry", "REGISTRAR", "CIVIL_REGISTRY"] }
            }
        };

        // Source Type filter (Physical Archive vs Online Portal Transactions)
        if (sourceType === "PHYSICAL") {
            where.additionalData = {
                path: ["isPhysicalArchive"],
                equals: true
            };
        } else if (sourceType === "ONLINE") {
            where.NOT = {
                additionalData: {
                    path: ["isPhysicalArchive"],
                    equals: true
                }
            };
        }

        // Registry Category filter (BIRTH, DEATH, MARRIAGE, LEGAL_INSTRUMENT)
        if (registryType !== "ALL") {
            const orConditions: any[] = [];

            if (registryType === "BIRTH") {
                orConditions.push(
                    { type: { code: { in: ["LCR_BIRTH_REG", "LCR_BIRTH", "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_PSA_ENDORSEMENT"] } } },
                    { additionalData: { path: ["archiveType"], equals: "BIRTH" } },
                    { additionalData: { path: ["registryType"], equals: "BIRTH" } }
                );
            } else if (registryType === "DEATH") {
                orConditions.push(
                    { type: { code: { in: ["LCR_DEATH_REG", "LCR_DEATH", "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_DEATH_PSA_ENDORSEMENT"] } } },
                    { additionalData: { path: ["archiveType"], equals: "DEATH" } },
                    { additionalData: { path: ["registryType"], equals: "DEATH" } }
                );
            } else if (registryType === "MARRIAGE") {
                orConditions.push(
                    { type: { code: { in: ["LCR_MARRIAGE_REG", "LCR_MARRIAGE", "LCR_MARRIAGE_LICENSE", "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT", "LCR_MARRIAGE_PSA_ENDORSEMENT"] } } },
                    { additionalData: { path: ["archiveType"], equals: "MARRIAGE" } },
                    { additionalData: { path: ["registryType"], equals: "MARRIAGE" } }
                );
            } else if (registryType === "LEGAL_INSTRUMENT") {
                orConditions.push(
                    { additionalData: { path: ["archiveType"], equals: "LEGAL_INSTRUMENT" } }
                );
            }

            if (orConditions.length > 0) {
                where.AND = where.AND || [];
                where.AND.push({ OR: orConditions });
            }
        }

        // Search Filter (Registry No, Book No, Page No, Child / Deceased / Spouse Names, Parents)
        if (search) {
            where.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { additionalData: { path: ["registryNo"], string_contains: search } },
                { additionalData: { path: ["bookNo"], string_contains: search } },
                { additionalData: { path: ["pageNo"], string_contains: search } },
                { additionalData: { path: ["childName"], string_contains: search } },
                { additionalData: { path: ["fullName"], string_contains: search } },
                { additionalData: { path: ["deceasedName"], string_contains: search } },
                { additionalData: { path: ["husbandName"], string_contains: search } },
                { additionalData: { path: ["wifeName"], string_contains: search } },
                { additionalData: { path: ["fatherName"], string_contains: search } },
                { additionalData: { path: ["motherMaidenName"], string_contains: search } },
                { additionalData: { path: ["remarks"], string_contains: search } },
                {
                    user: {
                        OR: [
                            { name: { contains: search, mode: "insensitive" } },
                            { email: { contains: search, mode: "insensitive" } }
                        ]
                    }
                }
            ];
        }

        // Date Range Filter on registration date or transaction createdAt
        if (startDate || endDate) {
            where.AND = where.AND || [];
            const dateFilter: any = {};
            if (startDate) {
                dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
            }
            where.AND.push({ createdAt: dateFilter });
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

        // Aggregate live metrics across registry categories
        const baseArchivedScope = {
            isCancelled: false,
            type: {
                category: { in: ["Civil Registry", "REGISTRAR", "CIVIL_REGISTRY"] }
            }
        };

        const [totalArchivedAll, totalBirth, totalDeath, totalMarriage] = await Promise.all([
            prisma.transaction.count({
                where: {
                    ...baseArchivedScope,
                    additionalData: { path: ["isPhysicalArchive"], equals: true }
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseArchivedScope,
                    OR: [
                        { type: { code: { in: ["LCR_BIRTH_REG", "LCR_BIRTH"] } } },
                        { additionalData: { path: ["archiveType"], equals: "BIRTH" } }
                    ]
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseArchivedScope,
                    OR: [
                        { type: { code: { in: ["LCR_DEATH_REG", "LCR_DEATH"] } } },
                        { additionalData: { path: ["archiveType"], equals: "DEATH" } }
                    ]
                }
            }),
            prisma.transaction.count({
                where: {
                    ...baseArchivedScope,
                    OR: [
                        { type: { code: { in: ["LCR_MARRIAGE_REG", "LCR_MARRIAGE", "LCR_MARRIAGE_LICENSE"] } } },
                        { additionalData: { path: ["archiveType"], equals: "MARRIAGE" } }
                    ]
                }
            })
        ]);

        // Normalize transaction records into unified presentation schema
        const records = transactions.map(tx => {
            const rawAddData = (tx.additionalData as any) || {};
            const isPhysical = rawAddData.isPhysicalArchive === true;

            // Determine Registry Category
            let archiveType: "BIRTH" | "DEATH" | "MARRIAGE" | "LEGAL_INSTRUMENT" = "BIRTH";
            const typeCode = (tx.type?.code || "").toUpperCase();

            if (rawAddData.archiveType) {
                archiveType = rawAddData.archiveType;
            } else if (typeCode.includes("DEATH")) {
                archiveType = "DEATH";
            } else if (typeCode.includes("MARRIAGE")) {
                archiveType = "MARRIAGE";
            } else if (typeCode.includes("BIRTH")) {
                archiveType = "BIRTH";
            }

            const registryNo = rawAddData.registryNo || rawAddData.registryNumber || rawAddData.regNo || "N/A";
            const bookNo = rawAddData.bookNo || rawAddData.bookNumber || "N/A";
            const pageNo = rawAddData.pageNo || rawAddData.pageNumber || "N/A";
            const dateRegistered = rawAddData.dateRegistered || rawAddData.registrationDate || (tx.createdAt ? new Date(tx.createdAt).toISOString().split("T")[0] : "");

            // Subject / Primary Party Names
            const rawSnapshot = (tx.residentSnapshot as any) || {};
            const citizenFullName =
                rawAddData.childName ||
                rawAddData.fullName ||
                rawAddData.deceasedName ||
                (rawAddData.husbandName && rawAddData.wifeName ? `${rawAddData.husbandName} & ${rawAddData.wifeName}` : "") ||
                (rawSnapshot.firstName ? `${rawSnapshot.firstName} ${rawSnapshot.lastName || ""}`.trim() : "") ||
                tx.user?.name ||
                "Not Specified";

            // Event Details
            const eventDate = rawAddData.dateOfBirth || rawAddData.dateOfDeath || rawAddData.dateOfMarriage || "";
            const eventPlace = rawAddData.placeOfBirth || rawAddData.placeOfDeath || rawAddData.placeOfMarriage || "Mapandan, Pangasinan";

            // Collect scanned document attachments
            const scannedDocs: Array<{ label: string; url: string; fileName?: string }> = [];

            if (rawAddData.primaryDocumentUrl) {
                scannedDocs.push({
                    label: rawAddData.primaryDocumentLabel || "Official Registry Certificate Scan",
                    url: rawAddData.primaryDocumentUrl,
                    fileName: rawAddData.primaryDocumentUrl.split("/").pop() || "certificate_scan.webp"
                });
            } else if (tx.eCopyUrl) {
                scannedDocs.push({
                    label: "Certified E-Copy / Certificate Scan",
                    url: tx.eCopyUrl,
                    fileName: tx.eCopyUrl.split("/").pop() || "ecopy_scan.webp"
                });
            }

            if (Array.isArray(rawAddData.attachments)) {
                rawAddData.attachments.forEach((att: any) => {
                    if (att?.url && att.url !== rawAddData.primaryDocumentUrl && att.url !== tx.eCopyUrl) {
                        scannedDocs.push({
                            label: att.label || att.name || "Registry Attachment",
                            url: att.url,
                            fileName: att.fileName || att.url.split("/").pop() || "attachment.webp"
                        });
                    }
                });
            }

            if (rawAddData.documents && typeof rawAddData.documents === "object") {
                Object.entries(rawAddData.documents).forEach(([label, url]) => {
                    if (typeof url === "string" && url && !scannedDocs.some(d => d.url === url)) {
                        scannedDocs.push({
                            label: label.replace(/([A-Z])/g, " $1").trim(),
                            url,
                            fileName: url.split("/").pop() || "document.webp"
                        });
                    }
                });
            }

            return {
                id: tx.id,
                transactionId: tx.id,
                isPhysical,
                archiveType,
                typeCode: tx.type?.code || "LCR_ARCHIVE",
                typeName: tx.type?.name || "Civil Registry Record",
                status: tx.status,
                createdAt: tx.createdAt.toISOString(),

                // Registry Book Identifiers
                registryNo,
                bookNo,
                pageNo,
                dateRegistered,

                // Subject info
                citizenFullName,
                childName: rawAddData.childName || "",
                sex: rawAddData.sex || rawAddData.gender || "",
                fatherName: rawAddData.fatherName || rawAddData.fathersName || "",
                motherMaidenName: rawAddData.motherMaidenName || rawAddData.mothersName || "",

                deceasedName: rawAddData.deceasedName || "",
                ageAtDeath: rawAddData.ageAtDeath || rawAddData.age || "",
                causeOfDeath: rawAddData.causeOfDeath || "",

                husbandName: rawAddData.husbandName || "",
                wifeName: rawAddData.wifeName || "",
                solemnizingOfficer: rawAddData.solemnizingOfficer || "",

                eventDate,
                eventPlace,
                remarks: rawAddData.remarks || rawAddData.notes || "",

                // Documents & Scans
                primaryDocumentUrl: rawAddData.primaryDocumentUrl || tx.eCopyUrl || null,
                scannedDocs,
                documentCount: scannedDocs.length,

                // Processed info
                processedBy: tx.processedBy || "Registrar Staff",
                encodedBy: rawAddData.encodedBy || tx.processedBy || "Registrar Staff",
                lastEditedBy: rawAddData.lastEditedBy || null,
                lastEditedAt: rawAddData.lastEditedAt || null
            };
        });

        return {
            success: true,
            records,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit) || 1
            },
            metrics: {
                totalArchived: totalArchivedAll,
                totalBirth,
                totalDeath,
                totalMarriage
            }
        };
    } catch (error: any) {
        console.error("[getArchivedRegistrarRecords] Error:", error);
        return {
            success: false,
            error: error.message || "Failed to retrieve Civil Registrar archived records."
        };
    }
}

/**
 * Digitally encode a legacy physical paper Civil Registry record into the Digital Vault.
 */
export async function createArchivedRegistrarRecord(formData: FormData) {
    try {
        const { user } = await assertRegistrarSession();

        const archiveType = ((formData.get("archiveType") as string) || "BIRTH").toUpperCase() as RegistryCategory;
        let registryNo = (formData.get("registryNo") as string)?.trim();
        const bookNo = (formData.get("bookNo") as string)?.trim() || "N/A";
        const pageNo = (formData.get("pageNo") as string)?.trim() || "N/A";
        const dateRegistered = (formData.get("dateRegistered") as string)?.trim() || new Date().toISOString().split("T")[0];

        // Specific fields
        const childName = (formData.get("childName") as string)?.trim() || "";
        const sex = (formData.get("sex") as string)?.trim() || "MALE";
        const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || "";
        const placeOfBirth = (formData.get("placeOfBirth") as string)?.trim() || "Mapandan, Pangasinan";
        const fatherName = (formData.get("fatherName") as string)?.trim() || "";
        const motherMaidenName = (formData.get("motherMaidenName") as string)?.trim() || "";

        const deceasedName = (formData.get("deceasedName") as string)?.trim() || "";
        const dateOfDeath = (formData.get("dateOfDeath") as string)?.trim() || "";
        const placeOfDeath = (formData.get("placeOfDeath") as string)?.trim() || "Mapandan, Pangasinan";
        const ageAtDeath = (formData.get("ageAtDeath") as string)?.trim() || "";
        const causeOfDeath = (formData.get("causeOfDeath") as string)?.trim() || "";

        const husbandName = (formData.get("husbandName") as string)?.trim() || "";
        const wifeName = (formData.get("wifeName") as string)?.trim() || "";
        const dateOfMarriage = (formData.get("dateOfMarriage") as string)?.trim() || "";
        const placeOfMarriage = (formData.get("placeOfMarriage") as string)?.trim() || "Mapandan, Pangasinan";
        const solemnizingOfficer = (formData.get("solemnizingOfficer") as string)?.trim() || "";

        const remarks = (formData.get("remarks") as string)?.trim() || "";

        // Auto-generate registry number if omitted by user
        if (!registryNo) {
            const year = new Date().getFullYear().toString().slice(-2);
            const randomPart = Math.floor(10000 + Math.random() * 90000);
            registryNo = `${year}-${randomPart}`;
        }

        // Validate party names based on archive type
        let subjectFullName = "";
        if (archiveType === "BIRTH") {
            if (!childName) return { success: false, error: "Child Full Name is required for Birth Registry." };
            subjectFullName = childName;
        } else if (archiveType === "DEATH") {
            if (!deceasedName) return { success: false, error: "Deceased Full Name is required for Death Registry." };
            subjectFullName = deceasedName;
        } else if (archiveType === "MARRIAGE") {
            if (!husbandName || !wifeName) return { success: false, error: "Both Husband and Wife names are required for Marriage Registry." };
            subjectFullName = `${husbandName} & ${wifeName}`;
        } else {
            subjectFullName = (formData.get("subjectName") as string)?.trim() || "Civil Registry Record";
        }

        // Check for duplicate registry number within the same category
        const existingRecord = await prisma.transaction.findFirst({
            where: {
                isCancelled: false,
                type: { category: { in: ["Civil Registry", "REGISTRAR", "CIVIL_REGISTRY"] } },
                additionalData: {
                    path: ["registryNo"],
                    equals: registryNo
                }
            }
        });

        if (existingRecord) {
            return {
                success: false,
                error: `Registry Number "${registryNo}" is already recorded in the vault.`
            };
        }

        // Match or fallback to Civil Registry transaction type
        let expectedCode = "LCR_BIRTH_REG";
        if (archiveType === "DEATH") expectedCode = "LCR_DEATH_REG";
        if (archiveType === "MARRIAGE") expectedCode = "LCR_MARRIAGE_REG";

        let transactionType = await prisma.transactionType.findFirst({
            where: { code: expectedCode }
        });

        if (!transactionType) {
            transactionType = await prisma.transactionType.findFirst({
                where: { category: { in: ["Civil Registry", "REGISTRAR", "CIVIL_REGISTRY"] } }
            });
        }

        if (!transactionType) {
            return { success: false, error: "System transaction type for Civil Registry is missing." };
        }

        // Upload primary scan file if provided
        let primaryDocumentUrl: string | null = null;
        const mainCertFile = formData.get("mainCertFile") as File | null;

        if (mainCertFile && mainCertFile instanceof File && mainCertFile.size > 0) {
            const timestamp = Date.now();
            const safeName = mainCertFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `civil-registry/archives/${timestamp}-${archiveType}-${safeName}`;
            const uploadedUrl = await uploadFile(mainCertFile, path);
            if (uploadedUrl) {
                primaryDocumentUrl = uploadedUrl;
            }
        }

        // Process supplementary attachments
        const attachments: Array<{ label: string; url: string; fileName: string }> = [];
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");

        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const label = (attachedLabels[i] as string)?.trim() || `Attachment ${i + 1}`;

            if (file instanceof File && file.size > 0) {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `civil-registry/archives/${timestamp}-${i}-${safeName}`;
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
            archiveType,
            registryNo,
            bookNo,
            pageNo,
            dateRegistered,

            // BIRTH
            childName,
            sex,
            dateOfBirth,
            placeOfBirth,
            fatherName,
            motherMaidenName,

            // DEATH
            deceasedName,
            dateOfDeath,
            placeOfDeath,
            ageAtDeath,
            causeOfDeath,

            // MARRIAGE
            husbandName,
            wifeName,
            dateOfMarriage,
            placeOfMarriage,
            solemnizingOfficer,

            remarks,
            primaryDocumentUrl,
            primaryDocumentLabel: `Certified ${archiveType} Certificate Scan`,
            attachments,
            encodedBy: user?.name || user?.email || "Registrar Officer",
            encodedAt: new Date().toISOString()
        };

        const newRecord = await prisma.transaction.create({
            data: {
                typeId: transactionType.id,
                status: "RELEASED",
                isCancelled: false,
                isPaid: true,
                totalAmount: 0,
                processedBy: user?.name || user?.email || "Registrar Officer",
                eCopyUrl: primaryDocumentUrl,
                residentSnapshot: {
                    firstName: subjectFullName.split(" ")[0] || subjectFullName,
                    lastName: subjectFullName.split(" ").slice(1).join(" ") || "",
                    barangay: "Mapandan",
                    contactNumber: ""
                },
                additionalData: additionalDataPayload
            }
        });

        // Synchronize directly into dedicated Supabase registry tables
        try {
            if (archiveType === "BIRTH") {
                const parsedBirthDate = dateOfBirth && !isNaN(Date.parse(dateOfBirth))
                    ? new Date(dateOfBirth)
                    : new Date();

                await prisma.birthCertificateRegistry.create({
                    data: {
                        transactionId: newRecord.id,
                        registryNumber: registryNo,
                        subjectName: childName || subjectFullName,
                        dateOfEvent: parsedBirthDate,
                        placeOfEvent: placeOfBirth || "Mapandan, Pangasinan",
                        fatherName: fatherName || null,
                        motherName: motherMaidenName || null,
                        issuedBy: user?.name || "Civil Registrar Staff"
                    }
                });
            } else if (archiveType === "DEATH") {
                const parsedDeathDate = dateOfDeath && !isNaN(Date.parse(dateOfDeath))
                    ? new Date(dateOfDeath)
                    : new Date();

                await prisma.deathRegistration.create({
                    data: {
                        transactionId: newRecord.id,
                        registryNumber: registryNo,
                        subjectName: deceasedName || subjectFullName,
                        dateOfEvent: parsedDeathDate,
                        placeOfEvent: placeOfDeath || "Mapandan, Pangasinan",
                        documentUrl: primaryDocumentUrl,
                        issuedBy: user?.name || "Civil Registrar Staff"
                    }
                });
            }
        } catch (syncErr) {
            console.error("[Registrar Archive] Error syncing to dedicated registry table:", syncErr);
            // Non-blocking so the archive record is always safely preserved
        }

        // Broadcast realtime update
        try {
            await broadcastRealtimeUpdate({
                type: "REGISTRAR_ARCHIVE_CREATED",
                data: { id: newRecord.id, registryNo, archiveType, subjectFullName }
            });
        } catch {
            // Non-blocking
        }

        // Log Digitization Activity
        await logActivity({
            action: "DIGITIZE",
            entityType: "CivilRegistry",
            entityId: newRecord.id,
            entityName: `${archiveType} Reg: ${registryNo} (${subjectFullName})`,
            description: `Digitized legacy paper ${archiveType} record for ${subjectFullName} [Book ${bookNo}, Page ${pageNo}]`,
            metadata: {
                registryNo,
                bookNo,
                pageNo,
                archiveType,
                subjectFullName
            }
        });

        revalidatePath("/admin/registrar/archive");
        revalidatePath("/admin/registrar");

        return {
            success: true,
            message: `${archiveType} record #${registryNo} successfully digitized into the vault.`,
            recordId: newRecord.id
        };
    } catch (error: any) {
        console.error("[createArchivedRegistrarRecord] Error:", error);
        return { success: false, error: error.message || "Failed to encode Civil Registrar archive record." };
    }
}

/**
 * Update an existing archived physical Civil Registry record and safely purge replaced files from Supabase Storage.
 */
export async function updateArchivedRegistrarRecord(transactionId: string, formData: FormData) {
    try {
        const { user } = await assertRegistrarSession();

        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId }
        });

        if (!tx) {
            return { success: false, error: "Record not found." };
        }

        const prevAddData = (tx.additionalData as any) || {};

        const archiveType = ((formData.get("archiveType") as string) || prevAddData.archiveType || "BIRTH").toUpperCase() as RegistryCategory;
        const registryNo = (formData.get("registryNo") as string)?.trim() || prevAddData.registryNo || "N/A";
        const bookNo = (formData.get("bookNo") as string)?.trim() || prevAddData.bookNo || "N/A";
        const pageNo = (formData.get("pageNo") as string)?.trim() || prevAddData.pageNo || "N/A";
        const dateRegistered = (formData.get("dateRegistered") as string)?.trim() || prevAddData.dateRegistered || "";

        // Specific fields
        const childName = (formData.get("childName") as string)?.trim() || "";
        const sex = (formData.get("sex") as string)?.trim() || "MALE";
        const dateOfBirth = (formData.get("dateOfBirth") as string)?.trim() || "";
        const placeOfBirth = (formData.get("placeOfBirth") as string)?.trim() || "Mapandan, Pangasinan";
        const fatherName = (formData.get("fatherName") as string)?.trim() || "";
        const motherMaidenName = (formData.get("motherMaidenName") as string)?.trim() || "";

        const deceasedName = (formData.get("deceasedName") as string)?.trim() || "";
        const dateOfDeath = (formData.get("dateOfDeath") as string)?.trim() || "";
        const placeOfDeath = (formData.get("placeOfDeath") as string)?.trim() || "Mapandan, Pangasinan";
        const ageAtDeath = (formData.get("ageAtDeath") as string)?.trim() || "";
        const causeOfDeath = (formData.get("causeOfDeath") as string)?.trim() || "";

        const husbandName = (formData.get("husbandName") as string)?.trim() || "";
        const wifeName = (formData.get("wifeName") as string)?.trim() || "";
        const dateOfMarriage = (formData.get("dateOfMarriage") as string)?.trim() || "";
        const placeOfMarriage = (formData.get("placeOfMarriage") as string)?.trim() || "Mapandan, Pangasinan";
        const solemnizingOfficer = (formData.get("solemnizingOfficer") as string)?.trim() || "";

        const remarks = (formData.get("remarks") as string)?.trim() || "";

        let subjectFullName = "";
        if (archiveType === "BIRTH") {
            if (!childName) return { success: false, error: "Child Full Name is required." };
            subjectFullName = childName;
        } else if (archiveType === "DEATH") {
            if (!deceasedName) return { success: false, error: "Deceased Full Name is required." };
            subjectFullName = deceasedName;
        } else if (archiveType === "MARRIAGE") {
            if (!husbandName || !wifeName) return { success: false, error: "Both Husband and Wife names are required." };
            subjectFullName = `${husbandName} & ${wifeName}`;
        } else {
            subjectFullName = (formData.get("subjectName") as string)?.trim() || "Civil Registry Record";
        }

        // Duplicate check on other active records
        const conflict = await prisma.transaction.findFirst({
            where: {
                id: { not: transactionId },
                isCancelled: false,
                type: { category: { in: ["Civil Registry", "REGISTRAR", "CIVIL_REGISTRY"] } },
                additionalData: {
                    path: ["registryNo"],
                    equals: registryNo
                }
            }
        });

        if (conflict) {
            return {
                success: false,
                error: `Registry Number "${registryNo}" is already assigned to another active record.`
            };
        }

        // --- Document Handling & Storage URL Diffing ---
        let primaryDocumentUrl = prevAddData.primaryDocumentUrl || tx.eCopyUrl || null;
        const attachments: Array<{ label: string; url: string; fileName: string }> = [];

        // 1. Process Main Certificate Scan
        const mainCertFile = formData.get("mainCertFile") as File | null;
        if (mainCertFile && mainCertFile instanceof File && mainCertFile.size > 0) {
            const timestamp = Date.now();
            const safeName = mainCertFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `civil-registry/archives/${timestamp}-${archiveType}-${safeName}`;
            const uploadedUrl = await uploadFile(mainCertFile, path);
            if (uploadedUrl) {
                primaryDocumentUrl = uploadedUrl;
            }
        } else {
            const existingMainUrl = (formData.get("existingMainUrl") as string || "").trim();
            if (existingMainUrl) {
                primaryDocumentUrl = existingMainUrl;
            } else if (formData.has("existingMainUrl") && !existingMainUrl) {
                primaryDocumentUrl = null;
            }
        }

        // 2. Retain existing attachments from JSON
        const existingDocsJson = (formData.get("existingDocuments") as string || "").trim();
        if (existingDocsJson) {
            try {
                const parsedExisting = JSON.parse(existingDocsJson);
                if (Array.isArray(parsedExisting)) {
                    parsedExisting.forEach((doc: any) => {
                        if (doc.url && doc.url !== primaryDocumentUrl) {
                            attachments.push({
                                label: doc.label || "Registry Attachment",
                                url: doc.url,
                                fileName: doc.fileName || doc.url.split("/").pop() || "document.webp"
                            });
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse existing documents JSON in Registrar update:", e);
            }
        }

        // 3. Process Newly Added Supplementary Attachments
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");

        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const label = (attachedLabels[i] as string)?.trim() || `Attachment ${i + 1}`;

            if (file instanceof File && file.size > 0) {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `civil-registry/archives/${timestamp}-${i}-${safeName}`;
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

        // Compute orphaned URLs that were deleted or replaced
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

        const retainedUrls = new Set<string>();
        if (primaryDocumentUrl) retainedUrls.add(primaryDocumentUrl);
        attachments.forEach(att => {
            if (att.url) retainedUrls.add(att.url);
        });

        const urlsToDelete = Array.from(new Set(oldUrls)).filter(url => url && !retainedUrls.has(url));

        const updatedAdditionalData = {
            ...prevAddData,
            isPhysicalArchive: true,
            archiveType,
            registryNo,
            bookNo,
            pageNo,
            dateRegistered,

            // BIRTH
            childName,
            sex,
            dateOfBirth,
            placeOfBirth,
            fatherName,
            motherMaidenName,

            // DEATH
            deceasedName,
            dateOfDeath,
            placeOfDeath,
            ageAtDeath,
            causeOfDeath,

            // MARRIAGE
            husbandName,
            wifeName,
            dateOfMarriage,
            placeOfMarriage,
            solemnizingOfficer,

            remarks,
            primaryDocumentUrl,
            attachments,
            lastEditedBy: user?.name || user?.email || "Registrar Officer",
            lastEditedAt: new Date().toISOString()
        };

        const updatedRecord = await prisma.transaction.update({
            where: { id: transactionId },
            data: {
                eCopyUrl: primaryDocumentUrl,
                residentSnapshot: {
                    firstName: subjectFullName.split(" ")[0] || subjectFullName,
                    lastName: subjectFullName.split(" ").slice(1).join(" ") || "",
                    barangay: "Mapandan",
                    contactNumber: ""
                },
                additionalData: updatedAdditionalData
            }
        });

        // Synchronize updates into dedicated Supabase registry tables
        try {
            if (archiveType === "BIRTH") {
                const parsedBirthDate = dateOfBirth && !isNaN(Date.parse(dateOfBirth))
                    ? new Date(dateOfBirth)
                    : new Date();

                await prisma.birthCertificateRegistry.upsert({
                    where: { transactionId },
                    update: {
                        registryNumber: registryNo,
                        subjectName: childName || subjectFullName,
                        dateOfEvent: parsedBirthDate,
                        placeOfEvent: placeOfBirth || "Mapandan, Pangasinan",
                        fatherName: fatherName || null,
                        motherName: motherMaidenName || null
                    },
                    create: {
                        transactionId,
                        registryNumber: registryNo,
                        subjectName: childName || subjectFullName,
                        dateOfEvent: parsedBirthDate,
                        placeOfEvent: placeOfBirth || "Mapandan, Pangasinan",
                        fatherName: fatherName || null,
                        motherName: motherMaidenName || null,
                        issuedBy: user?.name || "Civil Registrar Staff"
                    }
                });
            } else if (archiveType === "DEATH") {
                const parsedDeathDate = dateOfDeath && !isNaN(Date.parse(dateOfDeath))
                    ? new Date(dateOfDeath)
                    : new Date();

                await prisma.deathRegistration.upsert({
                    where: { transactionId },
                    update: {
                        registryNumber: registryNo,
                        subjectName: deceasedName || subjectFullName,
                        dateOfEvent: parsedDeathDate,
                        placeOfEvent: placeOfDeath || "Mapandan, Pangasinan",
                        documentUrl: primaryDocumentUrl
                    },
                    create: {
                        transactionId,
                        registryNumber: registryNo,
                        subjectName: deceasedName || subjectFullName,
                        dateOfEvent: parsedDeathDate,
                        placeOfEvent: placeOfDeath || "Mapandan, Pangasinan",
                        documentUrl: primaryDocumentUrl,
                        issuedBy: user?.name || "Civil Registrar Staff"
                    }
                });
            }
        } catch (syncErr) {
            console.error("[Registrar Archive Update] Error updating dedicated registry table:", syncErr);
        }

        // Clean up orphaned files in Supabase Storage asynchronously
        if (urlsToDelete.length > 0) {
            Promise.allSettled(urlsToDelete.map(url => deleteFileByUrl(url))).catch(err => {
                console.error("[Storage Cleanup] Error removing replaced registrar files:", err);
            });
        }

        // Broadcast realtime update
        try {
            await broadcastRealtimeUpdate({
                type: "REGISTRAR_ARCHIVE_UPDATED",
                data: { id: updatedRecord.id, registryNo, archiveType, subjectFullName }
            });
        } catch {
            // Non-blocking
        }

        // Log Edit Activity
        await logActivity({
            action: "UPDATE",
            entityType: "CivilRegistry",
            entityId: updatedRecord.id,
            entityName: `${archiveType} Reg: ${registryNo} (${subjectFullName})`,
            description: `Updated physical ${archiveType} record for ${subjectFullName} [Book ${bookNo}, Page ${pageNo}]`,
            metadata: {
                registryNo,
                bookNo,
                pageNo,
                archiveType,
                subjectFullName
            }
        });

        revalidatePath("/admin/registrar/archive");
        revalidatePath("/admin/registrar");

        return {
            success: true,
            message: `Archived record #${registryNo} successfully updated.`,
            recordId: updatedRecord.id
        };
    } catch (error: any) {
        console.error("[updateArchivedRegistrarRecord] Error:", error);
        return { success: false, error: error.message || "Failed to update Civil Registrar archived record." };
    }
}

/**
 * Delete an archived record and purge all associated files from cloud storage.
 */
export async function deleteArchivedRegistrarRecord(id: string) {
    try {
        await assertRegistrarSession();

        const tx = await prisma.transaction.findUnique({
            where: { id }
        });

        if (!tx) {
            return { success: false, error: "Record not found." };
        }

        const addData = (tx.additionalData as any) || {};
        if (addData.isPhysicalArchive !== true) {
            return {
                success: false,
                error: "Deletion restricted. Only digitized physical archive records can be directly deleted."
            };
        }

        // Collect all file URLs for deletion
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

        await prisma.transaction.update({
            where: { id },
            data: { isCancelled: true }
        });

        // Safely remove child registry entry if exists
        try {
            await Promise.allSettled([
                prisma.birthCertificateRegistry.deleteMany({ where: { transactionId: id } }),
                prisma.deathRegistration.deleteMany({ where: { transactionId: id } })
            ]);
        } catch (e) {
            console.error("[Registrar Archive Delete] Error removing child registry entries:", e);
        }

        // Clean up files in Supabase Storage asynchronously
        if (urlsToDelete.length > 0) {
            Promise.allSettled(Array.from(new Set(urlsToDelete)).map(url => deleteFileByUrl(url))).catch(err => {
                console.error("[Storage Cleanup] Error deleting registrar archive files:", err);
            });
        }

        revalidatePath("/admin/registrar/archive");
        revalidatePath("/admin/registrar");

        return {
            success: true,
            message: "Archived record removed successfully and associated files purged from storage."
        };
    } catch (error: any) {
        console.error("[deleteArchivedRegistrarRecord] Error:", error);
        return { success: false, error: error.message || "Failed to delete archived record." };
    }
}

/**
 * Retroactively synchronize all existing digitized archives into dedicated Supabase registry tables.
 */
export async function syncHistoricalRegistrarArchives() {
    try {
        const { user } = await assertRegistrarSession();

        const archives = await prisma.transaction.findMany({
            where: {
                isCancelled: false,
                type: { category: { in: ["Civil Registry", "REGISTRAR", "CIVIL_REGISTRY"] } },
                additionalData: { path: ["isPhysicalArchive"], equals: true }
            },
            include: {
                birthCertificateRegistry: true,
                deathRegistration: true
            }
        });

        let syncedBirthCount = 0;
        let syncedDeathCount = 0;

        for (const record of archives) {
            const addData = (record.additionalData as any) || {};
            const archiveType = (addData.archiveType || "BIRTH").toUpperCase();
            const registryNo = addData.registryNo || `ARC-${record.id.slice(-6).toUpperCase()}`;

            if (archiveType === "BIRTH" && !record.birthCertificateRegistry) {
                const rawDate = addData.dateOfBirth || addData.dateOfEvent;
                const parsedDate = rawDate && !isNaN(Date.parse(rawDate)) ? new Date(rawDate) : record.createdAt;
                const childName = addData.childName || addData.subjectName || "Civil Registry Subject";

                try {
                    await prisma.birthCertificateRegistry.upsert({
                        where: { transactionId: record.id },
                        update: {},
                        create: {
                            transactionId: record.id,
                            registryNumber: registryNo,
                            subjectName: childName,
                            dateOfEvent: parsedDate,
                            placeOfEvent: addData.placeOfBirth || "Mapandan, Pangasinan",
                            fatherName: addData.fatherName || null,
                            motherName: addData.motherMaidenName || addData.motherName || null,
                            issuedBy: user?.name || "Civil Registrar Staff"
                        }
                    });
                    syncedBirthCount++;
                } catch (e) {
                    console.error(`Failed to sync birth archive ${record.id}:`, e);
                }
            } else if (archiveType === "DEATH" && !record.deathRegistration) {
                const rawDate = addData.dateOfDeath || addData.dateOfEvent;
                const parsedDate = rawDate && !isNaN(Date.parse(rawDate)) ? new Date(rawDate) : record.createdAt;
                const deceasedName = addData.deceasedName || addData.subjectName || "Civil Registry Subject";

                try {
                    await prisma.deathRegistration.upsert({
                        where: { transactionId: record.id },
                        update: {},
                        create: {
                            transactionId: record.id,
                            registryNumber: registryNo,
                            subjectName: deceasedName,
                            dateOfEvent: parsedDate,
                            placeOfEvent: addData.placeOfDeath || "Mapandan, Pangasinan",
                            documentUrl: addData.primaryDocumentUrl || record.eCopyUrl || null,
                            issuedBy: user?.name || "Civil Registrar Staff"
                        }
                    });
                    syncedDeathCount++;
                } catch (e) {
                    console.error(`Failed to sync death archive ${record.id}:`, e);
                }
            }
        }

        revalidatePath("/admin/registrar/archive");
        return {
            success: true,
            syncedBirthCount,
            syncedDeathCount,
            totalProcessed: archives.length,
            message: `Synchronization complete. Synced ${syncedBirthCount} birth records and ${syncedDeathCount} death records.`
        };
    } catch (err: any) {
        console.error("[syncHistoricalRegistrarArchives] Error:", err);
        return { success: false, error: err.message || "Failed to sync historical archives." };
    }
}
