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
 * Fetch all archived & online Building Permits with unified search, filter, and document mapping.
 */
export async function getArchivedBuildingPermits(params?: {
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

        // Fetch transaction type for BUILDING_PERMIT
        const bpType = await prisma.transactionType.findFirst({
            where: { code: "BUILDING_PERMIT" },
            select: { id: true }
        });

        if (!bpType) {
            return { success: false, error: "Building Permit transaction type not configured." };
        }

        const where: any = {
            typeId: bpType.id,
            status: "RELEASED",
            isCancelled: false,
        };

        // Source Type Filter
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
                    buildingPermit: {
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
                        path: ["applicantName"],
                        string_contains: search
                    }
                }
            ];
        }

        // Barangay Filter at Database level
        if (barangay !== "ALL") {
            where.AND = where.AND || [];
            where.AND.push({
                OR: [
                    {
                        buildingPermit: {
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
                    },
                    {
                        additionalData: {
                            path: ["locationOfConstruction"],
                            string_contains: barangay
                        }
                    }
                ]
            });
        }

        // Date Range Filter (Supports start date, end date, or both)
        if (startDate || endDate) {
            where.AND = where.AND || [];
            const dateFilter: any = {};
            if (startDate) {
                dateFilter.gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
            }

            // Check against transaction createdAt or BuildingPermit dateIssued
            where.AND.push({
                OR: [
                    { createdAt: dateFilter },
                    { buildingPermit: { dateIssued: dateFilter } }
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
                    buildingPermit: true,
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
            const bp = tx.buildingPermit;

            const isPhysical = Boolean(addData.isPhysicalArchive);

            // Construct Applicant Name
            let applicantName = bp?.applicantName || addData.applicantName || "";
            if (!applicantName && (resSnap.firstName || resSnap.lastName)) {
                applicantName = `${resSnap.firstName || ""} ${resSnap.lastName || ""}`.trim();
            }
            if (!applicantName && tx.user?.name) {
                applicantName = tx.user.name;
            }
            if (!applicantName) {
                applicantName = "Walk-in Applicant";
            }

            // Location
            const location = bp?.location || addData.locationOfConstruction || resSnap.address || "Mapandan, Pangasinan";
            const permitNumber = bp?.permitNumber || addData.permitNumber || `BP-PENDING-${tx.id.slice(-6).toUpperCase()}`;
            const dateIssued = bp?.dateIssued || addData.dateIssued || tx.createdAt;
            const projectType = bp?.projectType || addData.projectType || addData.descriptionOfWork || "Building Construction";
            const occupancyUse = bp?.occupancyUse || addData.occupancyUse || "Residential";
            const estimatedCost = bp?.estimatedCost || Number(addData.estimatedCost) || 0;

            // Collect all documents for the shared DocumentViewerModal (Strict URL Deduplication)
            const documents: { url: string; label: string }[] = [];
            const seenUrls = new Set<string>();

            const addDoc = (url?: string | null, label?: string) => {
                if (url && typeof url === "string" && url.startsWith("http") && !seenUrls.has(url)) {
                    seenUrls.add(url);
                    documents.push({ url, label: label || "Document Attachment" });
                }
            };

            // 1. Read all files directly from additionalData.documents map { [label]: url }
            if (addData.documents && typeof addData.documents === "object") {
                const customLabels = addData.customLabels || {};
                Object.entries(addData.documents).forEach(([key, url]) => {
                    if (typeof url === "string" && url.startsWith("http")) {
                        const customName = customLabels[key];
                        let label = customName || key;
                        if (key === "newIdFile") label = "Applicant Valid ID (Front)";
                        if (key === "newIdFileBack") label = "Applicant Valid ID (Back)";
                        if (key === "tctFile") label = "Land Title / TCT";
                        addDoc(url, label);
                    }
                });
            }

            // 2. Primary / Official documents fallback
            if (bp?.documentUrl) {
                addDoc(bp.documentUrl, "Official Issued Permit Document");
            }
            if (tx.eCopyUrl) {
                addDoc(tx.eCopyUrl, "Approved Electronic Copy (eCopy)");
            }
            if (tx.orUrl) {
                addDoc(tx.orUrl, "Official Payment Receipt (OR)");
            }

            // 3. Backward compatibility for legacy archivedFiles array if present in older records
            if (Array.isArray(addData.archivedFiles)) {
                addData.archivedFiles.forEach((fileItem: any) => {
                    if (fileItem?.url) {
                        addDoc(fileItem.url, fileItem.name || "Archived Document");
                    }
                });
            }

            return {
                id: tx.id,
                permitNumber,
                applicantName,
                firstName: resSnap.firstName || "",
                lastName: resSnap.lastName || "",
                contactNumber: resSnap.contactNumber || addData.contactNumber || "",
                email: resSnap.email || addData.email || "",
                houseNumber: resSnap.houseNumber || addData.houseNumber || "",
                street: resSnap.street || addData.street || "",
                location,
                barangay: addData.barangay || resSnap.barangay || "Poblacion",
                dateIssued,
                projectType,
                occupancyUse,
                estimatedCost,
                isPhysical,
                encodedBy: addData.encodedBy || "Engineering Staff",
                totalFloors: addData.totalFloors || "1",
                isLotOwner: addData.isLotOwner || "Yes",
                remarks: addData.remarks || "",
                primaryDocumentUrl: bp?.documentUrl || tx.eCopyUrl || (documents[0]?.url || null),
                status: tx.status,
                documents,
                createdAt: tx.createdAt,
            };
        });

        return {
            success: true,
            data: formattedData,
            totalCount,
            totalPages: Math.ceil(totalCount / limit) || 1,
            currentPage: page,
        };
    } catch (error: any) {
        console.error("[getArchivedBuildingPermits] Error:", error);
        return { success: false, error: error.message || "Failed to fetch building permit archives." };
    }
}

/**
 * Encode and digitize a physical building permit paper record.
 */
export async function createArchivedBuildingPermit(formData: FormData) {
    try {
        const { user } = await assertEngineerSession();

        const permitNumber = (formData.get("permitNumber") as string)?.trim();
        // Applicant Demographic & Location Fields
        const firstName = (formData.get("firstName") as string)?.trim() || "";
        const lastName = (formData.get("lastName") as string)?.trim() || "";
        const applicantName = `${firstName} ${lastName}`.trim();

        if (!permitNumber) {
            return { success: false, error: "Official Permit Number is required." };
        }

        if (!firstName || !lastName) {
            return { success: false, error: "Both Applicant First Name and Last Name are required." };
        }

        const contactNumber = (formData.get("contactNumber") as string)?.trim() || "";
        const email = (formData.get("email") as string)?.trim() || "";
        const province = (formData.get("province") as string)?.trim() || "PANGASINAN";
        const municipality = (formData.get("municipality") as string)?.trim() || "MAPANDAN";
        const barangay = (formData.get("barangay") as string)?.trim() || "Amanoaoac";
        const houseNumber = (formData.get("houseNumber") as string)?.trim() || "";
        const street = (formData.get("street") as string)?.trim() || "";

        const dateIssuedStr = formData.get("dateIssued") as string;
        const dateIssued = dateIssuedStr ? new Date(dateIssuedStr) : new Date();
        const projectType = (formData.get("projectType") as string)?.trim() || "Building Construction";
        const occupancyUse = (formData.get("occupancyUse") as string)?.trim() || "Residential";
        const estimatedCost = parseFloat(formData.get("estimatedCost") as string) || 0;
        const totalFloors = parseInt(formData.get("totalFloors") as string, 10) || 1;
        const isLotOwner = (formData.get("isLotOwner") as string)?.trim() || "Yes";
        const remarks = (formData.get("remarks") as string)?.trim() || "";

        if (!permitNumber) {
            return { success: false, error: "Permit Number is required." };
        }

        // Check if permit number already exists in BuildingPermit table
        const existingPermit = await prisma.buildingPermit.findUnique({
            where: { permitNumber }
        });

        if (existingPermit) {
            return { success: false, error: `Permit Number "${permitNumber}" is already recorded in the system.` };
        }

        // Get Building Permit Transaction Type
        const bpType = await prisma.transactionType.findFirst({
            where: { code: "BUILDING_PERMIT" }
        });

        if (!bpType) {
            return { success: false, error: "Building Permit transaction type not found in database." };
        }

        // Build full address location string
        const locationParts = [
            houseNumber ? `No. ${houseNumber}` : "",
            street,
            barangay ? `Brgy. ${barangay}` : "",
            municipality,
            province
        ].filter(Boolean);
        const fullLocation = locationParts.join(", ");

        // Process File Uploads (Scanned Documents strictly into documents map)
        const documents: Record<string, string> = {};
        let primaryDocumentUrl: string | null = null;

        // Primary Scanned Building Permit
        const mainPermitFile = formData.get("mainPermitFile");
        if (mainPermitFile instanceof File && mainPermitFile.size > 0) {
            const timestamp = Date.now();
            const safeName = mainPermitFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `building-permits/archives/${timestamp}-PERMIT-${safeName}`;
            primaryDocumentUrl = await uploadFile(mainPermitFile, path);
            if (primaryDocumentUrl) {
                documents["Official Signed Building Permit"] = primaryDocumentUrl;
            }
        }

        // Process Additional Scanned Requirements / Plans
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");

        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const label = (attachedLabels[i] as string)?.trim() || `Attached Document ${i + 1}`;

            if (file instanceof File && file.size > 0) {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `building-permits/archives/${timestamp}-${i}-${safeName}`;
                const url = await uploadFile(file, path);
                if (url) {
                    documents[label] = url;
                }
            }
        }

        // Prepare Complete Resident Snapshot JSON (Single source of truth for resident details)
        const residentSnapshot = {
            firstName,
            lastName,
            fullName: applicantName,
            barangay,
            municipality,
            province,
            contactNumber,
            email,
            houseNumber,
            street,
            address: fullLocation,
        };

        // Prepare Additional Data JSON (Strictly for Scanned Documents & Archive Metadata)
        const additionalData = {
            isPhysicalArchive: true,
            sourceType: "PHYSICAL_COPY",
            encodedBy: user.name || user.email || "Engineering Admin",
            remarks,
            totalFloors,
            isLotOwner,
            documents,
        };

        const sanitizedAdditionalData = sanitizeObject(additionalData);
        const sanitizedResidentSnapshot = sanitizeObject(residentSnapshot);

        // Create the Transaction record marked as RELEASED with residentSnapshot JSON
        const transaction = await prisma.transaction.create({
            data: {
                typeId: bpType.id,
                status: "RELEASED",
                residentSnapshot: sanitizedResidentSnapshot as any,
                additionalData: sanitizedAdditionalData as any,
                eCopyUrl: primaryDocumentUrl,
                totalAmount: 0,
                isPaid: true,
                buildingPermit: {
                    create: {
                        permitNumber,
                        applicantName,
                        projectType,
                        occupancyUse,
                        location: fullLocation,
                        estimatedCost,
                        documentUrl: primaryDocumentUrl,
                        dateIssued,
                        issuedBy: user.name || "Municipal Engineer",
                    }
                }
            },
            include: {
                buildingPermit: true
            }
        });

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/engineer/archive");

        // Log Engineer Digitization Event
        await logActivity({
            action: "DIGITIZE",
            entityType: "BuildingPermit",
            entityId: transaction.id,
            entityName: `Permit #${permitNumber} (${applicantName})`,
            description: `Digitized physical Building Permit for ${applicantName} at ${fullLocation}`,
            metadata: {
                permitNumber,
                applicantName,
                projectType,
                occupancyUse,
                estimatedCost,
                location: fullLocation,
                dateIssued
            }
        });

        try {
            broadcastRealtimeUpdate({
                type: "BUILDING_PERMIT_ARCHIVED",
                transactionId: transaction.id,
                permitNumber
            });
        } catch {
            // Ignore broadcast error
        }

        return {
            success: true,
            transactionId: transaction.id,
            permitNumber
        };
    } catch (error: any) {
        console.error("[createArchivedBuildingPermit] Error:", error);
        return { success: false, error: error.message || "Failed to encode physical permit record." };
    }
}

/**
 * Update an existing physical Building Permit record in the archives.
 */
export async function updateArchivedBuildingPermit(formData: FormData) {
    try {
        const { user } = await assertEngineerSession();

        const transactionId = (formData.get("transactionId") as string || "").trim();
        if (!transactionId) {
            return { success: false, error: "Transaction ID is required for updating." };
        }

        const tx = await prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { buildingPermit: true }
        });

        if (!tx) {
            return { success: false, error: "Archive record not found in the database." };
        }

        const permitNumber = (formData.get("permitNumber") as string)?.trim();
        const firstName = (formData.get("firstName") as string)?.trim() || "";
        const lastName = (formData.get("lastName") as string)?.trim() || "";
        const applicantName = `${firstName} ${lastName}`.trim();

        if (!permitNumber) {
            return { success: false, error: "Official Permit Number is required." };
        }

        if (!firstName || !lastName) {
            return { success: false, error: "Both Applicant First Name and Last Name are required." };
        }

        // Check for permit number conflict with other records
        const conflict = await prisma.buildingPermit.findFirst({
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

        const contactNumber = (formData.get("contactNumber") as string)?.trim() || "";
        const email = (formData.get("email") as string)?.trim() || "";
        const province = (formData.get("province") as string)?.trim() || "PANGASINAN";
        const municipality = (formData.get("municipality") as string)?.trim() || "MAPANDAN";
        const barangay = (formData.get("barangay") as string)?.trim() || "Poblacion";
        const street = (formData.get("street") as string)?.trim() || "";
        const houseNumber = (formData.get("houseNumber") as string)?.trim() || "";
        const fullLocation = [houseNumber, street, barangay, municipality, province].filter(Boolean).join(", ");

        const projectType = (formData.get("projectType") as string)?.trim() || "Building Construction";
        const occupancyUse = (formData.get("occupancyUse") as string)?.trim() || "Residential";
        const estimatedCost = parseFloat((formData.get("estimatedCost") as string) || "0");
        const totalFloors = (formData.get("totalFloors") as string)?.trim() || "1";
        const isLotOwner = (formData.get("isLotOwner") as string)?.trim() || "Yes";
        const remarks = (formData.get("remarks") as string)?.trim() || "";

        const dateIssuedRaw = formData.get("dateIssued") as string;
        const dateIssued = dateIssuedRaw ? new Date(dateIssuedRaw) : (tx.buildingPermit?.dateIssued || new Date());

        // Process Documents
        const documents: Record<string, string> = {};
        let primaryDocumentUrl = tx.buildingPermit?.documentUrl || tx.eCopyUrl || null;

        // 1. Process Main Permit Scan (New upload or retain existing)
        const mainFile = formData.get("mainPermitFile") as File | null;
        if (mainFile && mainFile instanceof File && mainFile.size > 0) {
            const timestamp = Date.now();
            const safeName = mainFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
            const path = `building-permits/archives/${timestamp}-PERMIT-${safeName}`;
            const uploadedUrl = await uploadFile(mainFile, path);
            if (uploadedUrl) {
                primaryDocumentUrl = uploadedUrl;
                documents["Official Signed Permit"] = uploadedUrl;
            }
        } else {
            const existingMainUrl = (formData.get("existingMainUrl") as string || "").trim();
            if (existingMainUrl) {
                primaryDocumentUrl = existingMainUrl;
                documents["Official Signed Permit"] = existingMainUrl;
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
                            const label = doc.label || doc.title || "Attached Document";
                            documents[label] = doc.url;
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to parse existing documents JSON in Building Permit update:", e);
            }
        }

        // 3. Process Newly Added Supplementary Documents
        const attachedFiles = formData.getAll("attachedFiles");
        const attachedLabels = formData.getAll("attachedLabels");

        for (let i = 0; i < attachedFiles.length; i++) {
            const file = attachedFiles[i];
            const label = (attachedLabels[i] as string)?.trim() || `Attached Document ${i + 1}`;

            if (file instanceof File && file.size > 0) {
                const timestamp = Date.now();
                const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
                const path = `building-permits/archives/${timestamp}-${i}-${safeName}`;
                const url = await uploadFile(file, path);
                if (url) {
                    documents[label] = url;
                }
            }
        }

        // Update Resident Snapshot
        const prevResSnap = (tx.residentSnapshot as any) || {};
        const residentSnapshot = {
            ...prevResSnap,
            firstName,
            lastName,
            fullName: applicantName,
            barangay,
            municipality,
            province,
            contactNumber,
            email,
            houseNumber,
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
            remarks,
            totalFloors,
            isLotOwner,
            documents,
        };

        const sanitizedAdditionalData = sanitizeObject(additionalData);
        const sanitizedResidentSnapshot = sanitizeObject(residentSnapshot);

        // Collect all previous file URLs before changes to identify orphans
        const oldUrls: string[] = [];
        if (tx.eCopyUrl) oldUrls.push(tx.eCopyUrl);
        if (tx.buildingPermit?.documentUrl) oldUrls.push(tx.buildingPermit.documentUrl);
        if (prevAddData.documents && typeof prevAddData.documents === "object") {
            Object.values(prevAddData.documents).forEach((url: any) => {
                if (typeof url === "string" && url) oldUrls.push(url);
            });
        }

        // Set of URLs that are actively retained in the updated record
        const retainedUrls = new Set<string>();
        if (primaryDocumentUrl) retainedUrls.add(primaryDocumentUrl);
        Object.values(documents).forEach((url) => {
            if (typeof url === "string" && url) retainedUrls.add(url);
        });

        // Compute orphaned URLs that were replaced or removed by the user
        const urlsToDelete = Array.from(new Set(oldUrls)).filter((url) => url && !retainedUrls.has(url));

        // Atomic Transaction Update
        await prisma.$transaction([
            prisma.buildingPermit.upsert({
                where: { transactionId },
                update: {
                    permitNumber,
                    applicantName,
                    projectType,
                    occupancyUse,
                    location: fullLocation,
                    estimatedCost,
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
                    estimatedCost,
                    documentUrl: primaryDocumentUrl,
                    dateIssued,
                    issuedBy: user.name || "Municipal Engineer",
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
                console.error("[Storage Cleanup] Error removing replaced building permit files:", err);
            });
        }

        // Audit Trail Logging
        await logActivity({
            action: "UPDATE",
            entityType: "BuildingPermit",
            entityId: tx.buildingPermit?.id || transactionId,
            entityName: `Permit #${permitNumber} (${applicantName})`,
            description: `Updated archived Building Permit "${permitNumber}" details and documents.`,
            metadata: {
                updatedBy: user.name || user.email,
                permitNumber,
                applicantName,
                transactionId,
            }
        });

        try {
            broadcastRealtimeUpdate({
                type: "BUILDING_PERMIT_UPDATED",
                transactionId,
                permitNumber
            });
        } catch {
            // Ignore broadcast error
        }

        revalidatePath("/admin/engineer");
        revalidatePath("/admin/engineer/archive");

        return {
            success: true,
            transactionId,
            permitNumber
        };
    } catch (error: any) {
        console.error("[updateArchivedBuildingPermit] Error:", error);
        return { success: false, error: error.message || "Failed to update archived permit record." };
    }
}

