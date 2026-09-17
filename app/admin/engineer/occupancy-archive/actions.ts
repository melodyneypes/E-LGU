"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";
import { sanitizeObject } from "@/lib/validation";
import { broadcastRealtimeUpdate } from "@/app/api/realtime/stream/route";
import { logActivity } from "@/lib/audit";

async function assertEngineerSession() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;

    if (!session || (role !== "ENGINEER" && role !== "ADMIN")) {
        throw new Error("Unauthorized access. Engineer or Admin role required.");
    }
    return { session, user };
}

/**
 * Helper to get or auto-ensure the OCCUPANCY_PERMIT transaction type.
 */
async function getOccupancyPermitType() {
    let opType = await prisma.transactionType.findFirst({
        where: { code: "OCCUPANCY_PERMIT" },
        select: { id: true, name: true, code: true }
    });

    if (!opType) {
        // Fallback or attempt to find by partial code or name
        opType = await prisma.transactionType.findFirst({
            where: {
                OR: [
                    { code: { contains: "OCCUPANCY", mode: "insensitive" } },
                    { name: { contains: "Occupancy", mode: "insensitive" } }
                ]
            },
            select: { id: true, name: true, code: true }
        });
    }

    return opType;
}

/**
 * Fetch all archived & online Occupancy Permits with unified search, filter, and document mapping.
 */
export async function getArchivedOccupancyPermits(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sourceType?: "ALL" | "PHYSICAL" | "ONLINE";
    barangay?: string;
    startDate?: string;
    endDate?: string;
}) {
    try {
        await assertEngineerSession();

        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const search = params?.search?.trim() || "";
        const sourceType = params?.sourceType || "ALL";
        const barangay = params?.barangay || "ALL";
        const startDate = params?.startDate?.trim() || "";
        const endDate = params?.endDate?.trim() || "";

        const skip = (page - 1) * limit;

        const opType = await getOccupancyPermitType();

        if (!opType) {
            return { 
                success: true, 
                data: [], 
                pagination: { page: 1, limit, totalCount: 0, totalPages: 0 } 
            };
        }

        const where: any = {
            typeId: opType.id,
            status: "RELEASED",
            isCancelled: false,
        };

        // Source Type Filter (Physical Archive vs Online Portal Applications)
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

        // Search Filter
        if (search) {
            where.OR = [
                { id: { contains: search, mode: "insensitive" } },
                {
                    occupancyPermit: {
                        OR: [
                            { permitNumber: { contains: search, mode: "insensitive" } },
                            { applicantName: { contains: search, mode: "insensitive" } },
                            { location: { contains: search, mode: "insensitive" } },
                            { projectType: { contains: search, mode: "insensitive" } },
                        ]
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
                },
                {
                    additionalData: {
                        path: ["permitNumber"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["buildingPermitNo"],
                        string_contains: search
                    }
                },
                {
                    additionalData: {
                        path: ["applicantName"],
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
                        occupancyPermit: {
                            location: { contains: barangay, mode: "insensitive" }
                        }
                    },
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
                    }
                ]
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
                OR: [
                    { createdAt: dateFilter },
                    { occupancyPermit: { dateIssued: dateFilter } }
                ]
            });
        }

        const [transactions, totalCount] = await Promise.all([
            prisma.transaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    occupancyPermit: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                }
            }),
            prisma.transaction.count({ where })
        ]);

        // Format items and build documents array for DocumentViewerModal
        const formattedData = transactions.map(tx => {
            const addData = (tx.additionalData as any) || {};
            const resSnap = (tx.residentSnapshot as any) || {};
            const op = tx.occupancyPermit;

            const isPhysical = Boolean(addData.isPhysicalArchive);

            // Construct Applicant Name
            let applicantName = op?.applicantName || addData.applicantName || "";
            if (!applicantName && (resSnap.firstName || resSnap.lastName)) {
                applicantName = `${resSnap.firstName || ""} ${resSnap.lastName || ""}`.trim();
            }
            if (!applicantName && tx.user?.name) {
                applicantName = tx.user.name;
            }
            if (!applicantName) {
                applicantName = "Walk-in Applicant";
            }

            // Location & Metadata
            const location = op?.location || addData.locationOfProject || resSnap.address || "Mapandan, Pangasinan";
            const permitNumber = op?.permitNumber || addData.permitNumber || `OP-PENDING-${tx.id.slice(-6).toUpperCase()}`;
            const buildingPermitNumber = addData.buildingPermitNo || addData.buildingPermitNumber || "N/A";
            const dateIssued = op?.dateIssued || addData.dateIssued || tx.createdAt;
            const dateOfCompletion = addData.dateOfCompletion || null;
            const projectType = op?.projectType || addData.nameOfProject || addData.projectType || "Building Construction";
            const occupancyUse = op?.occupancyUse || addData.useCharacterOfOccupancy || addData.occupancyType || "Residential";
            const estimatedCost = op?.estimatedCost || Number(addData.estimatedCost) || 0;

            // Collect all documents for the shared DocumentViewerModal (Deduplicated)
            const documents: { url: string; label: string; fileName?: string }[] = [];
            const seenUrls = new Set<string>();

            const addDoc = (url?: string | null, label?: string, fileName?: string) => {
                if (url && typeof url === "string" && url.startsWith("http") && !seenUrls.has(url)) {
                    seenUrls.add(url);
                    documents.push({ 
                        url, 
                        label: label || "Document Attachment",
                        fileName: fileName || label || "document"
                    });
                }
            };

            // 1. From additionalData.documents array (lean format: { title, url, fileName })
            if (Array.isArray(addData.documents)) {
                addData.documents.forEach((docItem: any) => {
                    if (docItem?.url) {
                        addDoc(docItem.url, docItem.title || docItem.label || "Scanned Document", docItem.fileName);
                    }
                });
            } else if (addData.documents && typeof addData.documents === "object") {
                // Legacy key-value format support
                const customLabels = addData.customLabels || {};
                Object.entries(addData.documents).forEach(([key, url]) => {
                    if (typeof url === "string" && url.startsWith("http")) {
                        const customName = customLabels[key];
                        addDoc(url, customName || key);
                    }
                });
            }

            // 2. Official / Primary issued documents
            if (op?.documentUrl) {
                addDoc(op.documentUrl, "Official Certificate of Occupancy", "occupancy_permit.webp");
            }
            if (tx.eCopyUrl) {
                addDoc(tx.eCopyUrl, "Electronic Copy (e-Copy)", "electronic_copy.webp");
            }

            const occupancyType = addData.occupancyType || "FULL";
            const fsicNo = addData.fsicNo || "";
            const fsicDateIssued = addData.fsicDateIssued || "";
            const orNumber = addData.orNumber || "";
            const orDatePaid = addData.orDatePaid || "";
            const buildingPermitDate = addData.buildingPermitDate || "";
            const ownerName = op?.applicantName || addData.ownerName || addData.applicantName || applicantName;
            const projectTitle = op?.projectType || addData.projectTitle || addData.nameOfProject || projectType;
            const occupancyGroup = addData.occupancyGroup || "GROUP A";
            const buildingOfficial = op?.issuedBy || addData.buildingOfficial || "";
            const buildingOfficialDate = addData.buildingOfficialDate || "";

            return {
                id: tx.id,
                occupancyPermitId: op?.id || null,
                permitNumber,
                occupancyType,
                fsicNo,
                fsicDateIssued,
                orNumber,
                orDatePaid,
                buildingPermitNumber,
                buildingPermitDate,
                applicantName: ownerName,
                ownerName,
                location,
                projectType: projectTitle,
                projectTitle,
                occupancyGroup,
                occupancyUse,
                estimatedCost,
                dateIssued,
                dateOfCompletion,
                issuedBy: buildingOfficial,
                buildingOfficial,
                buildingOfficialDate,
                verificationId: op?.verificationId || null,
                isPhysicalArchive: isPhysical,
                sourceType: isPhysical ? "PHYSICAL" : "ONLINE",
                primaryDocumentUrl: op?.documentUrl || tx.eCopyUrl || (documents[0]?.url || null),
                documents,
                totalDocumentsCount: documents.length,
                remarks: addData.remarks || "",
                contactNumber: resSnap.contactNumber || addData.contactNumber || "",
                email: resSnap.email || addData.email || "",
                barangay: resSnap.barangay || addData.barangay || "Poblacion",
                street: resSnap.street || addData.street || "",
                province: resSnap.province || addData.province || "Pangasinan",
                municipality: resSnap.municipality || addData.municipality || "Mapandan",
                createdAt: tx.createdAt,
            };
        });

        return {
            success: true,
            data: formattedData,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        };

    } catch (error: any) {
        console.error("Error fetching archived occupancy permits:", error);
        return {
            success: false,
            error: error.message || "Failed to load occupancy permit archives."
        };
    }
}

/**
 * Digitize and archive a legacy physical Certificate of Occupancy into the database.
 */
export async function createArchivedOccupancyPermit(formData: FormData) {
    try {
        const { user } = await assertEngineerSession();

        // Certificate Header & Clearances
        const permitNumber = (formData.get("permitNumber") as string || "").trim(); // COC No.
        const occupancyType = (formData.get("occupancyType") as string || "FULL").trim();
        const dateIssuedRaw = formData.get("dateIssued") as string;
        const dateIssued = dateIssuedRaw ? new Date(dateIssuedRaw) : new Date();

        const fsicNo = (formData.get("fsicNo") as string || "").trim();
        const fsicDateIssued = (formData.get("fsicDateIssued") as string || "").trim();
        const orNumber = (formData.get("orNumber") as string || "").trim();
        const orDatePaid = (formData.get("orDatePaid") as string || formData.get("datePaid") as string || "").trim();

        // Associated Building Permit
        const buildingPermitNumber = (formData.get("buildingPermitNumber") as string || "").trim();
        const buildingPermitDate = (formData.get("buildingPermitDate") as string || "").trim();

        // Owner & Project
        const ownerNameInput = (formData.get("ownerName") as string || formData.get("applicantName") as string || "").trim();
        const firstName = (formData.get("firstName") as string || "").trim();
        const lastName = (formData.get("lastName") as string || "").trim();
        const ownerName = ownerNameInput || `${firstName} ${lastName}`.trim();

        const projectTitle = (formData.get("projectTitle") as string || formData.get("projectType") as string || "").trim();
        const dateOfCompletionRaw = formData.get("dateOfCompletion") as string;
        const dateOfCompletion = dateOfCompletionRaw ? new Date(dateOfCompletionRaw) : null;

        // Occupancy Character & Location
        const occupancyGroup = (formData.get("occupancyGroup") as string || "GROUP A").trim();
        const occupancyUse = (formData.get("occupancyUse") as string || "Residential").trim();

        const barangay = (formData.get("barangay") as string || "Amanoaoac").trim();
        const street = (formData.get("street") as string || "").trim();
        const province = (formData.get("province") as string || "").trim() || "Pangasinan";
        const municipality = (formData.get("municipality") as string || "").trim() || "Mapandan";
        const zipCode = (formData.get("zipCode") as string || "2429").trim();

        const fullLocation = [street, barangay ? `Brgy. ${barangay}` : "", municipality, province, zipCode].filter(Boolean).join(", ") || `${barangay}, Mapandan, Pangasinan`;

        // Signatories & Notes
        const buildingOfficial = (formData.get("buildingOfficial") as string || "").trim();
        const buildingOfficialDate = (formData.get("buildingOfficialDate") as string || "").trim();
        const remarks = (formData.get("remarks") as string || "").trim();

        const contactNumber = (formData.get("contactNumber") as string || "").trim();
        const email = (formData.get("email") as string || "").trim();

        if (!permitNumber) {
            return { success: false, error: "Certificate of Occupancy Number (COC No.) is required." };
        }
        if (!ownerName) {
            return { success: false, error: "Name of Owner is required." };
        }

        // Ensure unique permit number
        const existing = await prisma.occupancyPermit.findUnique({
            where: { permitNumber }
        });
        if (existing) {
            return { 
                success: false, 
                error: `Occupancy Certificate Number "${permitNumber}" already exists in the system.` 
            };
        }

        // Get Occupancy Permit Transaction Type
        let opType = await getOccupancyPermitType();

        if (!opType) {
            opType = await prisma.transactionType.create({
                data: {
                    name: "Occupancy Permit",
                    code: "OCCUPANCY_PERMIT",
                    category: "ENGINEERING",
                    description: "Certificate of Occupancy applications and compliance records.",
                    baseFee: 0,
                }
            });
        }

        // Scanned Documents (Lean Storage: title, url, fileName)
        const documents: { title: string; url: string; fileName: string }[] = [];
        let primaryDocumentUrl: string | null = null;
        const timestamp = Date.now();

        // 1. Process Main Certificate of Occupancy Scan
        const mainFile = (formData.get("mainPermitScan") || formData.get("mainPermitFile")) as File | null;
        if (mainFile && mainFile instanceof File && mainFile.size > 0) {
            const safeName = mainFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `occupancy-permits/archives/${timestamp}-OCCUPANCY-${safeName}`;
            const uploadedUrl = await uploadFile(mainFile, path);
            
            if (uploadedUrl) {
                primaryDocumentUrl = uploadedUrl;
                documents.push({
                    title: "Certificate of Occupancy - Main Document",
                    url: uploadedUrl,
                    fileName: safeName,
                });
            } else {
                console.error(`[Occupancy Archive] Failed to upload main permit scan: ${mainFile.name}`);
            }
        }

        // 2. Process Supplementary Documents
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");

        if (attachedFiles.length > 0) {
            for (let i = 0; i < attachedFiles.length; i++) {
                const file = attachedFiles[i] as File;
                const label = (attachedLabels[i] as string) || `Attachment ${i + 1}`;

                if (file && file instanceof File && file.size > 0) {
                    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                    const path = `occupancy-permits/archives/${timestamp}-${i}-${safeName}`;
                    const fileUrl = await uploadFile(file, path);

                    if (fileUrl) {
                        documents.push({
                            title: label,
                            url: fileUrl,
                            fileName: safeName,
                        });

                        if (!primaryDocumentUrl) {
                            primaryDocumentUrl = fileUrl;
                        }
                    }
                }
            }
        } else {
            // Fallback for indexed attachment input
            const attachmentCount = parseInt((formData.get("attachmentCount") as string) || "0", 10);
            for (let i = 0; i < attachmentCount; i++) {
                const file = formData.get(`attachmentFile_${i}`) as File | null;
                const label = (formData.get(`attachmentLabel_${i}`) as string) || `Attachment ${i + 1}`;

                if (file && file instanceof File && file.size > 0) {
                    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                    const path = `occupancy-permits/archives/${timestamp}-${i}-${safeName}`;
                    const fileUrl = await uploadFile(file, path);

                    if (fileUrl) {
                        documents.push({
                            title: label,
                            url: fileUrl,
                            fileName: safeName,
                        });

                        if (!primaryDocumentUrl) {
                            primaryDocumentUrl = fileUrl;
                        }
                    }
                }
            }
        }

        // Resident Snapshot JSON
        const residentSnapshot = {
            fullName: ownerName,
            firstName,
            lastName,
            barangay,
            municipality,
            province,
            contactNumber,
            email,
            street,
            address: fullLocation,
        };

        // Lean Additional Data JSON
        const additionalData = {
            isPhysicalArchive: true,
            sourceType: "PHYSICAL_COPY",
            encodedBy: user.name || user.email || "Engineering Admin",
            occupancyType,
            permitNumber,
            dateIssued: dateIssued.toISOString(),
            fsicNo,
            fsicDateIssued,
            orNumber,
            orDatePaid,
            buildingPermitNo: buildingPermitNumber,
            buildingPermitNumber,
            buildingPermitDate,
            ownerName,
            applicantName: ownerName,
            nameOfProject: projectTitle,
            projectTitle,
            dateOfCompletion: dateOfCompletion ? dateOfCompletion.toISOString() : null,
            occupancyGroup,
            occupancyClassification: occupancyUse,
            street,
            barangay,
            municipality,
            province,
            zipCode,
            buildingOfficial,
            buildingOfficialDate,
            remarks,
            documents,
        };

        const sanitizedAdditionalData = sanitizeObject(additionalData);
        const sanitizedResidentSnapshot = sanitizeObject(residentSnapshot);

        // Atomic Transaction + OccupancyPermit Creation
        const transaction = await prisma.transaction.create({
            data: {
                typeId: opType.id,
                status: "RELEASED",
                residentSnapshot: sanitizedResidentSnapshot as any,
                additionalData: sanitizedAdditionalData as any,
                eCopyUrl: primaryDocumentUrl,
                totalAmount: 0,
                isPaid: true,
                occupancyPermit: {
                    create: {
                        permitNumber,
                        applicantName: ownerName,
                        projectType: projectTitle || occupancyUse,
                        occupancyUse,
                        location: fullLocation,
                        estimatedCost: 0,
                        documentUrl: primaryDocumentUrl,
                        dateIssued,
                        issuedBy: buildingOfficial || user.name || "Municipal Engineer",
                    }
                }
            },
            include: {
                occupancyPermit: true
            }
        });

        // Audit Trail Logging
        await logActivity({
            action: "DIGITIZE",
            entityType: "OccupancyPermit",
            entityId: transaction.occupancyPermit?.id || transaction.id,
            entityName: `Permit #${permitNumber} (${ownerName})`,
            description: `Digitized physical Certificate of Occupancy for ${ownerName} at ${fullLocation}`,
            metadata: {
                permitNumber,
                buildingPermitNumber,
                ownerName,
                projectTitle,
                occupancyUse,
                location: fullLocation,
                dateIssued
            }
        });

        // Broadcast Realtime Event
        try {
            await broadcastRealtimeUpdate({
                entity: "OccupancyPermit",
                action: "CREATE",
                recordId: transaction.id,
                details: {
                    permitNumber,
                    applicantName: ownerName,
                    isPhysicalArchive: true,
                }
            });
        } catch (e) {
            console.error("Realtime broadcast error:", e);
        }

        revalidatePath("/admin/engineer/occupancy-archive");
        revalidatePath("/admin/engineer");

        return {
            success: true,
            message: `Occupancy Permit "${permitNumber}" successfully digitized and archived!`,
            data: {
                id: transaction.id,
                permitNumber,
            }
        };

    } catch (error: any) {
        console.error("Error creating archived occupancy permit:", error);
        return {
            success: false,
            error: error.message || "Failed to create archived occupancy permit."
        };
    }
}

/**
 * Synchronized atomic deletion of an archived occupancy record from both OccupancyPermit and Transaction tables.
 */
export async function deleteArchivedOccupancyPermit(transactionId: string) {
    try {
        const { user } = await assertEngineerSession();

        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { occupancyPermit: true }
        });

        if (!tx) {
            return { success: false, error: "Record not found in the database." };
        }

        const permitNumber = tx.occupancyPermit?.permitNumber || "N/A";
        const applicantName = tx.occupancyPermit?.applicantName || "N/A";
        const opId = tx.occupancyPermit?.id;

        // Collect all attached document URLs to clean up Supabase storage
        const urlsToDelete: string[] = [];
        if (tx.eCopyUrl) urlsToDelete.push(tx.eCopyUrl);
        if (tx.occupancyPermit?.documentUrl) urlsToDelete.push(tx.occupancyPermit.documentUrl);

        const addData = (tx.additionalData as any) || {};
        if (Array.isArray(addData.documents)) {
            addData.documents.forEach((d: any) => {
                if (d?.url) urlsToDelete.push(d.url);
            });
        }

        // Atomically delete from both OccupancyPermit and Transaction tables simultaneously
        await prisma.$transaction([
            prisma.occupancyPermit.deleteMany({
                where: { transactionId }
            }),
            prisma.transaction.delete({
                where: { id: transactionId }
            })
        ]);

        // Clean up uploaded files in Supabase storage asynchronously
        Promise.allSettled(urlsToDelete.map(url => deleteFileByUrl(url))).catch(err => {
            console.error("Storage cleanup error on occupancy permit delete:", err);
        });

        // Audit Trail Logging
        await logActivity({
            action: "DELETE",
            entityType: "OccupancyPermit",
            entityId: opId || transactionId,
            entityName: `Permit #${permitNumber} (${applicantName})`,
            description: `Permanently deleted archived Occupancy Permit "${permitNumber}" and its Transaction record.`,
            metadata: {
                deletedBy: user.name || user.email,
                permitNumber,
                applicantName,
                transactionId,
            }
        });

        // Broadcast Realtime Update
        try {
            await broadcastRealtimeUpdate({
                entity: "OccupancyPermit",
                action: "DELETE",
                recordId: transactionId,
                details: {
                    permitNumber,
                    applicantName,
                }
            });
        } catch (e) {
            console.error("Realtime broadcast error on delete:", e);
        }

        revalidatePath("/admin/engineer/occupancy-archive");
        revalidatePath("/admin/engineer");

        return {
            success: true,
            message: `Occupancy Permit "${permitNumber}" successfully deleted from archives.`
        };

    } catch (error: any) {
        console.error("Error deleting archived occupancy permit:", error);
        return {
            success: false,
            error: error.message || "Failed to delete record."
        };
    }
}

/**
 * Update an existing archived physical Certificate of Occupancy and its attached documents.
 */
export async function updateArchivedOccupancyPermit(formData: FormData) {
    try {
        const { user } = await assertEngineerSession();

        const transactionId = (formData.get("transactionId") as string || "").trim();
        if (!transactionId) {
            return { success: false, error: "Transaction ID is required for editing." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { occupancyPermit: true }
        });

        if (!tx) {
            return { success: false, error: "Archive record not found in the database." };
        }

        const permitNumber = (formData.get("permitNumber") as string || "").trim();
        const buildingPermitNumber = (formData.get("buildingPermitNumber") as string || "").trim();
        const buildingPermitDate = (formData.get("buildingPermitDate") as string || "").trim();
        
        // Single applicant/owner name on hardcopy
        const ownerName = (formData.get("ownerName") as string || formData.get("applicantName") as string || "").trim();
        const firstName = (formData.get("firstName") as string || "").trim();
        const lastName = (formData.get("lastName") as string || "").trim();
        const applicantName = ownerName || [firstName, lastName].filter(Boolean).join(" ").trim();

        // Certificate metadata
        const occupancyType = ((formData.get("occupancyType") as string) || "FULL").toUpperCase().trim();
        const fsicNo = (formData.get("fsicNo") as string || "").trim();
        const fsicDateIssued = (formData.get("fsicDateIssued") as string || "").trim();
        const orNumber = (formData.get("orNumber") as string || "").trim();
        const orDatePaid = (formData.get("orDatePaid") as string || formData.get("datePaid") as string || "").trim();
        const buildingOfficial = (formData.get("buildingOfficial") as string || "").trim();
        const buildingOfficialDate = (formData.get("buildingOfficialDate") as string || "").trim();
        const occupancyGroup = (formData.get("occupancyGroup") as string || "GROUP A").trim();

        // Location & Project
        const barangay = (formData.get("barangay") as string || "").trim();
        const street = (formData.get("street") as string || "").trim();
        const province = (formData.get("province") as string || "").trim() || "PANGASINAN";
        const municipality = (formData.get("municipality") as string || "").trim() || "MAPANDAN";
        const zipCode = (formData.get("zipCode") as string || "2429").trim();
        const fullLocation = [street, barangay, municipality, province, zipCode].filter(Boolean).join(", ");

        const contactNumber = (formData.get("contactNumber") as string || "").trim();
        const email = (formData.get("email") as string || "").trim();

        const occupancyUse = (formData.get("occupancyUse") as string || "Residential").trim();
        const projectTitle = (formData.get("projectTitle") as string || formData.get("projectType") as string || "").trim();
        const projectType = projectTitle || occupancyUse;

        const dateIssuedRaw = formData.get("dateIssued") as string;
        const dateIssued = dateIssuedRaw ? new Date(dateIssuedRaw) : (tx.occupancyPermit?.dateIssued || new Date());

        const dateOfCompletionRaw = formData.get("dateOfCompletion") as string;
        const dateOfCompletion = dateOfCompletionRaw ? new Date(dateOfCompletionRaw) : null;

        const remarks = (formData.get("remarks") as string || "").trim();

        if (!permitNumber) {
            return { success: false, error: "Occupancy Permit Number is required." };
        }
        if (!applicantName) {
            return { success: false, error: "Applicant / Owner Name is required." };
        }

        // Ensure permit number is unique across other records
        const conflict = await prisma.occupancyPermit.findFirst({
            where: {
                permitNumber,
                NOT: { transactionId }
            }
        });
        if (conflict) {
            return {
                success: false,
                error: `Permit number "${permitNumber}" is already in use by another record.`
            };
        }

        // Process Documents
        const timestamp = Date.now();
        const documents: { title: string; url: string; fileName: string }[] = [];
        let primaryDocumentUrl = tx.occupancyPermit?.documentUrl || tx.eCopyUrl || null;

        // 1. Process Main Permit Scan (New upload or retain existing)
        const mainFile = (formData.get("mainPermitScan") || formData.get("mainPermitFile")) as File | null;
        if (mainFile && mainFile instanceof File && mainFile.size > 0) {
            const safeName = mainFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `occupancy-permits/archives/${timestamp}-OCCUPANCY-${safeName}`;
            const uploadedUrl = await uploadFile(mainFile, path);
            if (uploadedUrl) {
                primaryDocumentUrl = uploadedUrl;
                documents.push({
                    title: "Certificate of Occupancy - Main Document",
                    url: uploadedUrl,
                    fileName: safeName,
                });
            }
        } else {
            // Retain existing primary document if present
            const existingMainUrl = (formData.get("existingMainUrl") as string || "").trim();
            if (existingMainUrl) {
                primaryDocumentUrl = existingMainUrl;
                documents.push({
                    title: "Certificate of Occupancy - Main Document",
                    url: existingMainUrl,
                    fileName: existingMainUrl.split("/").pop() || "occupancy_permit.webp",
                });
            }
        }

        // 2. Retain existing supplementary documents that user kept
        const existingDocsJson = (formData.get("existingDocuments") as string || "").trim();
        if (existingDocsJson) {
            try {
                const parsedExisting = JSON.parse(existingDocsJson);
                if (Array.isArray(parsedExisting)) {
                    parsedExisting.forEach((doc: any) => {
                        if (doc.url && doc.url !== primaryDocumentUrl) {
                            documents.push({
                                title: doc.title || doc.label || "Supplementary Document",
                                url: doc.url,
                                fileName: doc.fileName || doc.url.split("/").pop() || "document.webp",
                            });
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse existing documents JSON:", e);
            }
        }

        // 3. Process Newly Added Supplementary Documents
        const attachmentCount = parseInt((formData.get("attachmentCount") as string) || "0", 10);
        for (let i = 0; i < attachmentCount; i++) {
            const file = formData.get(`attachmentFile_${i}`) as File | null;
            const label = (formData.get(`attachmentLabel_${i}`) as string) || `Attachment ${i + 1}`;

            if (file && file instanceof File && file.size > 0) {
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `occupancy-permits/archives/${timestamp}-${i}-${safeName}`;
                const fileUrl = await uploadFile(file, path);

                if (fileUrl) {
                    documents.push({
                        title: label,
                        url: fileUrl,
                        fileName: safeName,
                    });

                    if (!primaryDocumentUrl) {
                        primaryDocumentUrl = fileUrl;
                    }
                }
            }
        }

        // Update Resident Snapshot
        const prevResSnap = (tx.residentSnapshot as any) || {};
        const residentSnapshot = {
            ...prevResSnap,
            firstName: firstName || applicantName,
            lastName: lastName || "",
            fullName: applicantName,
            barangay,
            municipality,
            province,
            zipCode,
            contactNumber,
            email,
            street,
            address: fullLocation,
        };

        // Update Additional Data
        const prevAddData = (tx.additionalData as any) || {};
        const additionalData = {
            ...prevAddData,
            isPhysicalArchive: true,
            sourceType: "PHYSICAL_COPY",
            lastEditedBy: user.name || user.email || "Engineering Admin",
            lastEditedAt: new Date().toISOString(),
            occupancyType,
            fsicNo,
            fsicDateIssued,
            orNumber,
            orDatePaid,
            datePaid: orDatePaid,
            buildingPermitNo: buildingPermitNumber,
            buildingPermitDate,
            ownerName: applicantName,
            projectTitle,
            occupancyGroup,
            buildingOfficial,
            buildingOfficialDate,
            dateOfCompletion: dateOfCompletion ? dateOfCompletion.toISOString() : (prevAddData.dateOfCompletion || null),
            projectType,
            remarks,
            documents,
        };

        const sanitizedAdditionalData = sanitizeObject(additionalData);
        const sanitizedResidentSnapshot = sanitizeObject(residentSnapshot);

        // Collect all previous file URLs before changes to identify orphans
        const oldUrls: string[] = [];
        if (tx.eCopyUrl) oldUrls.push(tx.eCopyUrl);
        if (tx.occupancyPermit?.documentUrl) oldUrls.push(tx.occupancyPermit.documentUrl);
        if (Array.isArray(prevAddData.documents)) {
            prevAddData.documents.forEach((d: any) => {
                if (d?.url) oldUrls.push(d.url);
            });
        }

        // Set of URLs that are still actively retained in the updated record
        const retainedUrls = new Set<string>();
        if (primaryDocumentUrl) retainedUrls.add(primaryDocumentUrl);
        documents.forEach((d) => {
            if (d.url) retainedUrls.add(d.url);
        });

        // Compute orphaned URLs that were replaced or removed by the user
        const urlsToDelete = Array.from(new Set(oldUrls)).filter((url) => url && !retainedUrls.has(url));

        // Atomic Transaction Update
        await prisma.$transaction([
            prisma.occupancyPermit.upsert({
                where: { transactionId },
                update: {
                    permitNumber,
                    applicantName,
                    projectType,
                    occupancyUse,
                    location: fullLocation,
                    documentUrl: primaryDocumentUrl,
                    dateIssued,
                },
                create: {
                    transactionId,
                    permitNumber,
                    applicantName,
                    projectType,
                    occupancyUse,
                    location: fullLocation,
                    estimatedCost: 0,
                    documentUrl: primaryDocumentUrl,
                    dateIssued,
                    issuedBy: buildingOfficial || user.name || "Municipal Engineer",
                }
            }),
            prisma.transaction.update({
                where: { id: transactionId },
                data: {
                    residentSnapshot: sanitizedResidentSnapshot as any,
                    additionalData: sanitizedAdditionalData as any,
                    eCopyUrl: primaryDocumentUrl,
                }
            })
        ]);

        // Clean up orphaned/replaced files in Supabase storage asynchronously
        if (urlsToDelete.length > 0) {
            Promise.allSettled(urlsToDelete.map((url) => deleteFileByUrl(url))).catch((err) => {
                console.error("[Storage Cleanup] Error removing replaced occupancy permit files:", err);
            });
        }

        // Audit Trail Logging
        await logActivity({
            action: "UPDATE",
            entityType: "OccupancyPermit",
            entityId: tx.occupancyPermit?.id || transactionId,
            entityName: `Permit #${permitNumber} (${applicantName})`,
            description: `Updated archived Occupancy Permit "${permitNumber}" details and attached documents.`,
            metadata: {
                updatedBy: user.name || user.email,
                permitNumber,
                applicantName,
                transactionId,
                totalDocs: documents.length,
            }
        });

        // Broadcast Realtime Update
        try {
            await broadcastRealtimeUpdate({
                entity: "OccupancyPermit",
                action: "UPDATE",
                recordId: transactionId,
                details: {
                    permitNumber,
                    applicantName,
                }
            });
        } catch (e) {
            console.error("Realtime broadcast error on update:", e);
        }

        revalidatePath("/admin/engineer/occupancy-archive");
        revalidatePath("/admin/engineer");

        return {
            success: true,
            message: `Occupancy Permit "${permitNumber}" updated successfully!`
        };

    } catch (error: any) {
        console.error("Error updating archived occupancy permit:", error);
        return {
            success: false,
            error: error.message || "Failed to update archived occupancy permit."
        };
    }
}
