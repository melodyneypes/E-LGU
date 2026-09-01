"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString } from "@/lib/validation";
import { logActivity } from "@/lib/audit";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

// =========================================================================
// SECURITY & ROLE VERIFICATION HELPER
// =========================================================================

async function verifyMDRRMOAccess(requireAdmin: boolean = false) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { authorized: false, error: "Unauthorized. Please sign in.", session: null };
    }

    const role = ((session.user as any)?.role || "").toUpperCase();
    const dept = (((session.user as any)?.department as string) || "").toUpperCase();

    const isAdmin = role === "ADMIN" || role === "MDRRMO_ADMIN" || dept === "MDRRMO" || dept === "DISASTER";
    const isAuthorized = isAdmin || dept.includes("MDRRMO") || role === "ADMIN_AIDE";

    if (requireAdmin && !isAdmin) {
        return { authorized: false, error: "Access Denied: MDRRMO Administrator privileges required.", session };
    }

    if (!isAuthorized) {
        return { authorized: false, error: "Access Denied: MDRRMO Department clearance required.", session };
    }

    return { authorized: true, error: null, session, isAdmin };
}

// =========================================================================
// 1. MDRRMO OVERVIEW & ANALYTICS
// =========================================================================

export async function getMDRRMOOverviewStats() {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const [
            fleet,
            drivers,
            documents,
            schedules,
            announcements,
            hotlines
        ] = await Promise.all([
            prisma.rHUAmbulance.findMany({
                include: {
                    drivers: true,
                    documents: true,
                    schedules: {
                        where: {
                            status: { in: ["SCHEDULED", "DISPATCHED", "IN_TRANSIT"] }
                        },
                        orderBy: { scheduledDate: "asc" },
                        take: 5
                    }
                },
                orderBy: { unit: "asc" }
            }),
            prisma.ambulanceDriver.findMany({
                include: {
                    assignedAmbulance: true
                },
                orderBy: { name: "asc" }
            }),
            prisma.ambulanceDocument.findMany({
                include: {
                    ambulance: true
                },
                orderBy: { expiryDate: "asc" }
            }),
            prisma.ambulanceDispatchSchedule.findMany({
                include: {
                    ambulance: true,
                    driver: true
                },
                orderBy: { scheduledDate: "desc" },
                take: 10
            }),
            prisma.announcement.findMany({
                where: {
                    OR: [
                        { category: "MDRRMO" },
                        { category: "Emergency" },
                        { category: "Disaster Alert" },
                        { department: "MDRRMO" }
                    ],
                    isActive: true
                },
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                take: 5
            }),
            prisma.rHUAmbulanceHotline.findMany({
                where: { status: "ACTIVE" },
                orderBy: { name: "asc" }
            })
        ]);

        const activeFleet = fleet.filter(v => v.status === "ACTIVE" || v.status === "STANDBY" || v.status === "ON DUTY").length;
        const driversOnDuty = drivers.filter(d => d.status === "ON_DUTY" || d.status === "ON_TRIP").length;
        const activeDispatches = schedules.filter(s => s.status === "DISPATCHED" || s.status === "IN_TRANSIT").length;

        // Expiration radar: documents expiring within 30 days or already expired
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiringDocs = documents.filter(d => {
            if (!d.expiryDate) return false;
            const exp = new Date(d.expiryDate);
            return exp <= thirtyDaysFromNow;
        });

        const expiredDocs = documents.filter(d => {
            if (!d.expiryDate) return false;
            return new Date(d.expiryDate) < now;
        });

        return {
            success: true,
            stats: {
                totalFleet: fleet.length,
                activeFleet,
                totalDrivers: drivers.length,
                driversOnDuty,
                activeDispatches,
                expiringDocsCount: expiringDocs.length,
                expiredDocsCount: expiredDocs.length,
                hotlinesCount: hotlines.length
            },
            fleet,
            drivers,
            expiringDocs,
            recentSchedules: schedules,
            recentAnnouncements: announcements,
            hotlines
        };
    } catch (error: any) {
        console.error("[getMDRRMOOverviewStats] Error:", error);
        return { success: false, error: error.message || "Failed to load MDRRMO stats" };
    }
}

// =========================================================================
// 2. AMBULANCE FLEET & HOTLINES MANAGEMENT
// =========================================================================

export async function getMDRRMOAmbulanceFleet() {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error, fleet: [] };
        }

        const fleet = await prisma.rHUAmbulance.findMany({
            include: {
                drivers: true,
                documents: true,
                schedules: {
                    where: {
                        status: { in: ["SCHEDULED", "DISPATCHED", "IN_TRANSIT"] }
                    },
                    orderBy: { scheduledDate: "asc" },
                    take: 3
                }
            },
            orderBy: { unit: "asc" }
        });

        return { success: true, fleet };
    } catch (error: any) {
        console.error("[getMDRRMOAmbulanceFleet] Error:", error);
        return { success: false, error: error.message || "Failed to fetch fleet", fleet: [] };
    }
}

export async function saveMDRRMOAmbulance(data: {
    id?: string;
    unit: string;
    plateNumber: string;
    station: string;
    status: string;
    assignedDriverId?: string | null;
    chassisNumber?: string | null;
    engineNumber?: string | null;
    orNumber?: string | null;
    crNumber?: string | null;
    registrationExpiry?: string | null;
    insuranceExpiry?: string | null;
}) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const unitName = sanitizeString(data.unit);
        const plate = sanitizeString(data.plateNumber).toUpperCase();
        const station = sanitizeString(data.station) || "MDRRMO Main Command Center";
        const status = sanitizeString(data.status) || "STANDBY";

        const statusColor = (status === "ACTIVE" || status === "STANDBY" || status === "ON DUTY")
            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
            : status === "MAINTENANCE"
            ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
            : "text-slate-500 bg-slate-500/10 border-slate-500/20";

        let vehicle: any;

        if (data.id) {
            vehicle = await prisma.rHUAmbulance.update({
                where: { id: data.id },
                data: {
                    unit: unitName,
                    plateNumber: plate,
                    station,
                    status,
                    statusColor,
                    assignedDriverId: data.assignedDriverId || null,
                    chassisNumber: data.chassisNumber ? sanitizeString(data.chassisNumber) : null,
                    engineNumber: data.engineNumber ? sanitizeString(data.engineNumber) : null,
                    orNumber: data.orNumber ? sanitizeString(data.orNumber) : null,
                    crNumber: data.crNumber ? sanitizeString(data.crNumber) : null,
                    registrationExpiry: data.registrationExpiry ? new Date(data.registrationExpiry) : null,
                    insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
                }
            });

            // If a driver was assigned, update the driver's record
            if (data.assignedDriverId) {
                await prisma.ambulanceDriver.update({
                    where: { id: data.assignedDriverId },
                    data: { assignedAmbulanceId: vehicle.id }
                }).catch(() => {});
            }

            await logActivity({
                action: "UPDATE",
                entityType: "AmbulanceVehicle",
                entityId: vehicle.id,
                entityName: vehicle.unit,
                description: `Updated ambulance vehicle "${vehicle.unit}" (${vehicle.plateNumber}) status to ${vehicle.status}.`
            });
        } else {
            vehicle = await prisma.rHUAmbulance.create({
                data: {
                    unit: unitName,
                    plateNumber: plate,
                    station,
                    status,
                    statusColor,
                    assignedDriverId: data.assignedDriverId || null,
                    chassisNumber: data.chassisNumber ? sanitizeString(data.chassisNumber) : null,
                    engineNumber: data.engineNumber ? sanitizeString(data.engineNumber) : null,
                    orNumber: data.orNumber ? sanitizeString(data.orNumber) : null,
                    crNumber: data.crNumber ? sanitizeString(data.crNumber) : null,
                    registrationExpiry: data.registrationExpiry ? new Date(data.registrationExpiry) : null,
                    insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
                }
            });

            if (data.assignedDriverId) {
                await prisma.ambulanceDriver.update({
                    where: { id: data.assignedDriverId },
                    data: { assignedAmbulanceId: vehicle.id }
                }).catch(() => {});
            }

            await logActivity({
                action: "CREATE",
                entityType: "AmbulanceVehicle",
                entityId: vehicle.id,
                entityName: vehicle.unit,
                description: `Registered new ambulance vehicle "${vehicle.unit}" (${vehicle.plateNumber}) to MDRRMO fleet.`
            });
        }

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/ambulance");
        revalidatePath("/admin/mdrrmo/drivers");
        revalidatePath("/admin/mdrrmo/documents");
        revalidatePath("/admin/rhu/ambulance");

        return { success: true, vehicle };
    } catch (error: any) {
        console.error("[saveMDRRMOAmbulance] Error:", error);
        return { success: false, error: error.message || "Failed to save ambulance vehicle" };
    }
}

export async function deleteMDRRMOAmbulance(id: string) {
    try {
        const auth = await verifyMDRRMOAccess(true);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const vehicle = await prisma.rHUAmbulance.findUnique({
            where: { id },
            include: { documents: true }
        });

        if (!vehicle) {
            return { success: false, error: "Ambulance not found." };
        }

        // Delete any uploaded files from storage
        for (const doc of vehicle.documents) {
            if (doc.fileUrl) {
                await deleteFileByUrl(doc.fileUrl).catch(() => {});
            }
        }

        await prisma.rHUAmbulance.delete({
            where: { id }
        });

        await logActivity({
            action: "DELETE",
            entityType: "AmbulanceVehicle",
            entityId: id,
            entityName: vehicle.unit,
            description: `Deleted ambulance vehicle "${vehicle.unit}" (${vehicle.plateNumber}) from MDRRMO fleet.`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/ambulance");
        revalidatePath("/admin/rhu/ambulance");

        return { success: true };
    } catch (error: any) {
        console.error("[deleteMDRRMOAmbulance] Error:", error);
        return { success: false, error: error.message || "Failed to delete ambulance vehicle" };
    }
}

// =========================================================================
// 3. HOTLINES MANAGEMENT
// =========================================================================

export async function getMDRRMOHotlines() {
    try {
        const hotlines = await prisma.rHUAmbulanceHotline.findMany({
            orderBy: { name: "asc" }
        });
        return { success: true, hotlines };
    } catch (error: any) {
        console.error("[getMDRRMOHotlines] Error:", error);
        return { success: false, error: error.message || "Failed to load hotlines", hotlines: [] };
    }
}

export async function saveMDRRMOHotline(data: { id?: string; name: string; number: string; status?: string }) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const name = sanitizeString(data.name);
        const number = sanitizeString(data.number);
        const status = data.status || "ACTIVE";

        let hotline: any;
        if (data.id) {
            hotline = await prisma.rHUAmbulanceHotline.update({
                where: { id: data.id },
                data: { name, number, status }
            });
        } else {
            hotline = await prisma.rHUAmbulanceHotline.create({
                data: { name, number, status }
            });
        }

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/ambulance");
        revalidatePath("/admin/rhu/ambulance");

        return { success: true, hotline };
    } catch (error: any) {
        console.error("[saveMDRRMOHotline] Error:", error);
        return { success: false, error: error.message || "Failed to save hotline" };
    }
}

export async function deleteMDRRMOHotline(id: string) {
    try {
        const auth = await verifyMDRRMOAccess(true);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        await prisma.rHUAmbulanceHotline.delete({
            where: { id }
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/ambulance");
        return { success: true };
    } catch (error: any) {
        console.error("[deleteMDRRMOHotline] Error:", error);
        return { success: false, error: error.message || "Failed to delete hotline" };
    }
}

// =========================================================================
// 4. AMBULANCE DRIVERS MANAGEMENT & LIVE MONITORING
// =========================================================================

export async function getMDRRMODrivers() {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error, drivers: [] };
        }

        const drivers = await prisma.ambulanceDriver.findMany({
            include: {
                assignedAmbulance: true,
                trips: {
                    where: { status: { in: ["SCHEDULED", "DISPATCHED", "IN_TRANSIT"] } },
                    orderBy: { scheduledDate: "asc" },
                    take: 3
                }
            },
            orderBy: { name: "asc" }
        });

        return { success: true, drivers };
    } catch (error: any) {
        console.error("[getMDRRMODrivers] Error:", error);
        return { success: false, error: error.message || "Failed to load drivers", drivers: [] };
    }
}

export async function saveMDRRMODriver(formData: FormData) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const id = formData.get("id") as string | null;
        const name = sanitizeString(formData.get("name") as string);
        const contactNumber = sanitizeString(formData.get("contactNumber") as string);
        const licenseNumber = sanitizeString(formData.get("licenseNumber") as string);
        const licenseExpiryRaw = formData.get("licenseExpiry") as string | null;
        const licenseExpiry = licenseExpiryRaw ? new Date(licenseExpiryRaw) : null;
        const status = sanitizeString(formData.get("status") as string) || "STANDBY";
        const dutyShift = sanitizeString(formData.get("dutyShift") as string) || "Day Shift (6:00 AM - 2:00 PM)";
        const emergencyContact = sanitizeString(formData.get("emergencyContact") as string) || null;
        const notes = sanitizeString(formData.get("notes") as string) || null;
        const assignedAmbulanceId = (formData.get("assignedAmbulanceId") as string) || null;

        // Handle photo upload if provided
        let photoUrl: string | null = null;
        const photoFile = formData.get("photoFile") as File | null;
        if (photoFile && photoFile.size > 0) {
            const buffer = Buffer.from(await photoFile.arrayBuffer());
            const fileName = `drivers/driver_${Date.now()}_${photoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const uploaded = await uploadFile(buffer, fileName, "system-assets", photoFile.type);
            if (uploaded) {
                photoUrl = uploaded;
            }
        }

        let driver: any;

        if (id) {
            const updateData: any = {
                name,
                contactNumber,
                licenseNumber,
                licenseExpiry,
                status,
                dutyShift,
                emergencyContact,
                notes,
                assignedAmbulanceId: assignedAmbulanceId && assignedAmbulanceId !== "NONE" ? assignedAmbulanceId : null,
            };

            if (photoUrl) {
                updateData.photoUrl = photoUrl;
            }

            driver = await prisma.ambulanceDriver.update({
                where: { id },
                data: updateData
            });

            // Sync ambulance vehicle assignedDriverId if selected
            if (assignedAmbulanceId && assignedAmbulanceId !== "NONE") {
                await prisma.rHUAmbulance.update({
                    where: { id: assignedAmbulanceId },
                    data: { assignedDriverId: driver.id }
                }).catch(() => {});
            }

            await logActivity({
                action: "UPDATE",
                entityType: "AmbulanceDriver",
                entityId: driver.id,
                entityName: driver.name,
                description: `Updated driver profile for "${driver.name}" (Duty: ${driver.status}, Shift: ${driver.dutyShift}).`
            });
        } else {
            driver = await prisma.ambulanceDriver.create({
                data: {
                    name,
                    contactNumber,
                    licenseNumber,
                    licenseExpiry,
                    status,
                    dutyShift,
                    emergencyContact,
                    notes,
                    photoUrl,
                    assignedAmbulanceId: assignedAmbulanceId && assignedAmbulanceId !== "NONE" ? assignedAmbulanceId : null,
                }
            });

            if (assignedAmbulanceId && assignedAmbulanceId !== "NONE") {
                await prisma.rHUAmbulance.update({
                    where: { id: assignedAmbulanceId },
                    data: { assignedDriverId: driver.id }
                }).catch(() => {});
            }

            await logActivity({
                action: "CREATE",
                entityType: "AmbulanceDriver",
                entityId: driver.id,
                entityName: driver.name,
                description: `Registered new ambulance driver "${driver.name}" (License: ${driver.licenseNumber}).`
            });
        }

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/drivers");
        revalidatePath("/admin/mdrrmo/ambulance");

        return { success: true, driver };
    } catch (error: any) {
        console.error("[saveMDRRMODriver] Error:", error);
        return { success: false, error: error.message || "Failed to save driver" };
    }
}

export async function updateDriverDutyStatus(driverId: string, newStatus: string) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const validStatuses = ["ON_DUTY", "STANDBY", "ON_TRIP", "OFF_DUTY", "ON_LEAVE"];
        if (!validStatuses.includes(newStatus)) {
            return { success: false, error: "Invalid status value." };
        }

        const driver = await prisma.ambulanceDriver.update({
            where: { id: driverId },
            data: { status: newStatus }
        });

        await logActivity({
            action: "STATUS_CHANGE",
            entityType: "AmbulanceDriver",
            entityId: driver.id,
            entityName: driver.name,
            description: `Changed driver "${driver.name}" status to "${newStatus}".`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/drivers");

        return { success: true, driver };
    } catch (error: any) {
        console.error("[updateDriverDutyStatus] Error:", error);
        return { success: false, error: error.message || "Failed to update driver status" };
    }
}

export async function deleteMDRRMODriver(id: string) {
    try {
        const auth = await verifyMDRRMOAccess(true);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const driver = await prisma.ambulanceDriver.findUnique({
            where: { id }
        });

        if (!driver) {
            return { success: false, error: "Driver not found." };
        }

        if (driver.photoUrl) {
            await deleteFileByUrl(driver.photoUrl).catch(() => {});
        }

        await prisma.ambulanceDriver.delete({
            where: { id }
        });

        await logActivity({
            action: "DELETE",
            entityType: "AmbulanceDriver",
            entityId: id,
            entityName: driver.name,
            description: `Deleted ambulance driver profile "${driver.name}".`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/drivers");
        revalidatePath("/admin/mdrrmo/ambulance");

        return { success: true };
    } catch (error: any) {
        console.error("[deleteMDRRMODriver] Error:", error);
        return { success: false, error: error.message || "Failed to delete driver" };
    }
}

// =========================================================================
// 5. DIGITAL FILING SYSTEM (OR/CR & VEHICLE PAPERS)
// =========================================================================

export async function getMDRRMODocuments(ambulanceId?: string, documentType?: string) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error, documents: [] };
        }

        const where: any = {};
        if (ambulanceId && ambulanceId !== "ALL") {
            where.ambulanceId = ambulanceId;
        }
        if (documentType && documentType !== "ALL") {
            where.documentType = documentType;
        }

        const documents = await prisma.ambulanceDocument.findMany({
            where,
            include: {
                ambulance: true
            },
            orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }]
        });

        // Compute real-time status according to expiration dates
        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(now.getDate() + 30);

        const enriched = documents.map(doc => {
            let status = "VALID";
            if (doc.expiryDate) {
                const exp = new Date(doc.expiryDate);
                if (exp < now) {
                    status = "EXPIRED";
                } else if (exp <= thirtyDaysAhead) {
                    status = "EXPIRING_SOON";
                }
            }
            return { ...doc, computedStatus: status };
        });

        return { success: true, documents: enriched };
    } catch (error: any) {
        console.error("[getMDRRMODocuments] Error:", error);
        return { success: false, error: error.message || "Failed to fetch vehicle documents", documents: [] };
    }
}

export async function uploadMDRRMODocument(formData: FormData) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const ambulanceId = formData.get("ambulanceId") as string;
        const documentType = sanitizeString(formData.get("documentType") as string) || "OR_CR";
        const title = sanitizeString(formData.get("title") as string);
        const documentNumber = sanitizeString(formData.get("documentNumber") as string) || null;
        const issueDateRaw = formData.get("issueDate") as string | null;
        const issueDate = issueDateRaw ? new Date(issueDateRaw) : null;
        const expiryDateRaw = formData.get("expiryDate") as string | null;
        const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null;
        const issuingAgency = sanitizeString(formData.get("issuingAgency") as string) || "Land Transportation Office (LTO)";
        const remarks = sanitizeString(formData.get("remarks") as string) || null;

        const file = formData.get("file") as File | null;
        if (!file || file.size === 0) {
            return { success: false, error: "Please attach a document file (PDF, PNG, or JPG)." };
        }

        // Validate file size (max 20MB)
        if (file.size > 20 * 1024 * 1024) {
            return { success: false, error: "File exceeds maximum upload size of 20MB." };
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const storagePath = `ambulance-documents/${ambulanceId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const fileUrl = await uploadFile(buffer, storagePath, "system-assets", file.type);

        if (!fileUrl) {
            return { success: false, error: "Failed to upload file to secure storage. Ensure format is PDF or Image." };
        }

        // Determine status based on expiration
        let status = "VALID";
        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(now.getDate() + 30);
        if (expiryDate) {
            if (expiryDate < now) status = "EXPIRED";
            else if (expiryDate <= thirtyDaysAhead) status = "EXPIRING_SOON";
        }

        const docRecord = await prisma.ambulanceDocument.create({
            data: {
                ambulanceId,
                documentType,
                title,
                documentNumber,
                fileUrl,
                fileName: file.name,
                fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                fileType: file.type,
                issueDate,
                expiryDate,
                issuingAgency,
                status,
                remarks,
                uploadedBy: auth.session?.user?.name || auth.session?.user?.email || "MDRRMO Staff"
            },
            include: { ambulance: true }
        });

        // If this is an OR/CR or Insurance, update the ambulance quick fields
        if (documentType === "OR_CR" || documentType === "OFFICIAL_RECEIPT" || documentType === "CERTIFICATE_OF_REGISTRATION") {
            await prisma.rHUAmbulance.update({
                where: { id: ambulanceId },
                data: {
                    orNumber: documentNumber || undefined,
                    registrationExpiry: expiryDate || undefined
                }
            }).catch(() => {});
        } else if (documentType === "INSURANCE_POLICY") {
            await prisma.rHUAmbulance.update({
                where: { id: ambulanceId },
                data: {
                    insuranceExpiry: expiryDate || undefined
                }
            }).catch(() => {});
        }

        await logActivity({
            action: "DIGITIZE",
            entityType: "AmbulanceDocument",
            entityId: docRecord.id,
            entityName: docRecord.title,
            description: `Digitized and filed "${docRecord.title}" (${docRecord.documentType}) for ${docRecord.ambulance.unit}.`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/documents");
        revalidatePath("/admin/mdrrmo/ambulance");

        return { success: true, document: docRecord };
    } catch (error: any) {
        console.error("[uploadMDRRMODocument] Error:", error);
        return { success: false, error: error.message || "Failed to upload document" };
    }
}

export async function deleteMDRRMODocument(documentId: string) {
    try {
        const auth = await verifyMDRRMOAccess(true);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const doc = await prisma.ambulanceDocument.findUnique({
            where: { id: documentId },
            include: { ambulance: true }
        });

        if (!doc) {
            return { success: false, error: "Document record not found." };
        }

        if (doc.fileUrl) {
            await deleteFileByUrl(doc.fileUrl).catch(() => {});
        }

        await prisma.ambulanceDocument.delete({
            where: { id: documentId }
        });

        await logActivity({
            action: "DELETE",
            entityType: "AmbulanceDocument",
            entityId: documentId,
            entityName: doc.title,
            description: `Deleted digitized document "${doc.title}" for ${doc.ambulance.unit}.`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/documents");

        return { success: true };
    } catch (error: any) {
        console.error("[deleteMDRRMODocument] Error:", error);
        return { success: false, error: error.message || "Failed to delete document" };
    }
}

// =========================================================================
// 6. AMBULANCE DISPATCH & DUTY SCHEDULING CALENDAR
// =========================================================================

export async function getMDRRMOSchedules(filters?: { status?: string; startDate?: string; endDate?: string }) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error, schedules: [] };
        }

        const where: any = {};
        if (filters?.status && filters.status !== "ALL") {
            where.status = filters.status;
        }
        if (filters?.startDate && filters?.endDate) {
            where.scheduledDate = {
                gte: new Date(filters.startDate),
                lte: new Date(filters.endDate)
            };
        }

        const schedules = await prisma.ambulanceDispatchSchedule.findMany({
            where,
            include: {
                ambulance: true,
                driver: true
            },
            orderBy: [{ scheduledDate: "asc" }, { departureTime: "asc" }]
        });

        return { success: true, schedules };
    } catch (error: any) {
        console.error("[getMDRRMOSchedules] Error:", error);
        return { success: false, error: error.message || "Failed to load dispatch schedules", schedules: [] };
    }
}

export async function saveMDRRMOSchedule(data: {
    id?: string;
    title: string;
    dispatchType: string;
    priority: string;
    status: string;
    patientName?: string | null;
    patientContact?: string | null;
    pickupLocation: string;
    destination: string;
    scheduledDate: string;
    departureTime?: string | null;
    returnTime?: string | null;
    ambulanceId?: string | null;
    driverId?: string | null;
    medicStaff?: string | null;
    destinationHospital?: string | null;
    notes?: string | null;
    requestedBy?: string | null;
}) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const title = sanitizeString(data.title);
        const dispatchType = sanitizeString(data.dispatchType) || "EMERGENCY_TRANSFER";
        const priority = sanitizeString(data.priority) || "HIGH";
        const status = sanitizeString(data.status) || "SCHEDULED";
        const patientName = data.patientName ? sanitizeString(data.patientName) : null;
        const patientContact = data.patientContact ? sanitizeString(data.patientContact) : null;
        const pickupLocation = sanitizeString(data.pickupLocation);
        const destination = sanitizeString(data.destination);
        const scheduledDate = new Date(data.scheduledDate);
        const departureTime = data.departureTime ? sanitizeString(data.departureTime) : null;
        const returnTime = data.returnTime ? sanitizeString(data.returnTime) : null;
        const ambulanceId = (data.ambulanceId && data.ambulanceId !== "NONE") ? data.ambulanceId : null;
        const driverId = (data.driverId && data.driverId !== "NONE") ? data.driverId : null;
        const medicStaff = data.medicStaff ? sanitizeString(data.medicStaff) : null;
        const destinationHospital = data.destinationHospital ? sanitizeString(data.destinationHospital) : null;
        const notes = data.notes ? sanitizeString(data.notes) : null;
        const requestedBy = data.requestedBy ? sanitizeString(data.requestedBy) : auth.session?.user?.name || "MDRRMO Dispatch";

        let schedule: any;

        if (data.id) {
            schedule = await prisma.ambulanceDispatchSchedule.update({
                where: { id: data.id },
                data: {
                    title,
                    dispatchType,
                    priority,
                    status,
                    patientName,
                    patientContact,
                    pickupLocation,
                    destination,
                    scheduledDate,
                    departureTime,
                    returnTime,
                    ambulanceId,
                    driverId,
                    medicStaff,
                    destinationHospital,
                    notes,
                    requestedBy
                },
                include: { ambulance: true, driver: true }
            });

            // Update driver status if dispatched
            if (driverId && (status === "DISPATCHED" || status === "IN_TRANSIT")) {
                await prisma.ambulanceDriver.update({
                    where: { id: driverId },
                    data: { status: "ON_TRIP" }
                }).catch(() => {});
            } else if (driverId && status === "COMPLETED") {
                await prisma.ambulanceDriver.update({
                    where: { id: driverId },
                    data: { status: "STANDBY" }
                }).catch(() => {});
            }

            await logActivity({
                action: "UPDATE",
                entityType: "AmbulanceSchedule",
                entityId: schedule.id,
                entityName: schedule.title,
                description: `Updated dispatch schedule "${schedule.title}" to status ${schedule.status}.`
            });
        } else {
            schedule = await prisma.ambulanceDispatchSchedule.create({
                data: {
                    title,
                    dispatchType,
                    priority,
                    status,
                    patientName,
                    patientContact,
                    pickupLocation,
                    destination,
                    scheduledDate,
                    departureTime,
                    returnTime,
                    ambulanceId,
                    driverId,
                    medicStaff,
                    destinationHospital,
                    notes,
                    requestedBy
                },
                include: { ambulance: true, driver: true }
            });

            if (driverId && (status === "DISPATCHED" || status === "IN_TRANSIT")) {
                await prisma.ambulanceDriver.update({
                    where: { id: driverId },
                    data: { status: "ON_TRIP" }
                }).catch(() => {});
            }

            await logActivity({
                action: "CREATE",
                entityType: "AmbulanceSchedule",
                entityId: schedule.id,
                entityName: schedule.title,
                description: `Created new ambulance dispatch schedule "${schedule.title}" (${schedule.dispatchType}).`
            });
        }

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/schedule");
        revalidatePath("/admin/mdrrmo/drivers");

        return { success: true, schedule };
    } catch (error: any) {
        console.error("[saveMDRRMOSchedule] Error:", error);
        return { success: false, error: error.message || "Failed to save dispatch schedule" };
    }
}

export async function updateMDRRMOScheduleStatus(scheduleId: string, status: string) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const schedule = await prisma.ambulanceDispatchSchedule.update({
            where: { id: scheduleId },
            data: { status },
            include: { ambulance: true, driver: true }
        });

        // Sync driver status if applicable
        if (schedule.driverId) {
            if (status === "DISPATCHED" || status === "IN_TRANSIT") {
                await prisma.ambulanceDriver.update({
                    where: { id: schedule.driverId },
                    data: { status: "ON_TRIP" }
                }).catch(() => {});
            } else if (status === "COMPLETED" || status === "CANCELLED") {
                await prisma.ambulanceDriver.update({
                    where: { id: schedule.driverId },
                    data: { status: "STANDBY" }
                }).catch(() => {});
            }
        }

        await logActivity({
            action: "STATUS_CHANGE",
            entityType: "AmbulanceSchedule",
            entityId: schedule.id,
            entityName: schedule.title,
            description: `Changed dispatch schedule "${schedule.title}" status to "${status}".`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/schedule");
        revalidatePath("/admin/mdrrmo/drivers");

        return { success: true, schedule };
    } catch (error: any) {
        console.error("[updateMDRRMOScheduleStatus] Error:", error);
        return { success: false, error: error.message || "Failed to update schedule status" };
    }
}

export async function deleteMDRRMOSchedule(scheduleId: string) {
    try {
        const auth = await verifyMDRRMOAccess(true);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        await prisma.ambulanceDispatchSchedule.delete({
            where: { id: scheduleId }
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/schedule");

        return { success: true };
    } catch (error: any) {
        console.error("[deleteMDRRMOSchedule] Error:", error);
        return { success: false, error: error.message || "Failed to delete schedule" };
    }
}

// =========================================================================
// 7. MDRRMO EMERGENCY ANNOUNCEMENTS & ADVISORIES
// =========================================================================

export async function getMDRRMOAnnouncements(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    priority?: string;
}) {
    try {
        const page = Math.max(1, params?.page || 1);
        const pageSize = Math.max(1, Math.min(50, params?.pageSize || 10));
        const search = params?.search || "";
        const priority = params?.priority || "All";

        const where: any = {
            OR: [
                { category: "MDRRMO" },
                { category: "Emergency" },
                { category: "Disaster Alert" },
                { department: "MDRRMO" }
            ]
        };

        if (priority && priority !== "All") {
            where.priority = priority;
        }

        if (search.trim()) {
            where.AND = [
                {
                    OR: [
                        { title: { contains: search.trim(), mode: "insensitive" } },
                        { content: { contains: search.trim(), mode: "insensitive" } }
                    ]
                }
            ];
        }

        const [announcements, totalCount] = await Promise.all([
            prisma.announcement.findMany({
                where,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize
            }),
            prisma.announcement.count({ where })
        ]);

        return { success: true, announcements, totalCount, page, pageSize };
    } catch (error: any) {
        console.error("[getMDRRMOAnnouncements] Error:", error);
        return { success: false, error: error.message || "Failed to fetch announcements", announcements: [], totalCount: 0 };
    }
}

export async function saveMDRRMOAnnouncement(formData: FormData) {
    try {
        const auth = await verifyMDRRMOAccess(false);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const id = formData.get("id") as string | null;
        const title = sanitizeString(formData.get("title") as string);
        const content = sanitizeString(formData.get("content") as string);
        const priority = sanitizeString(formData.get("priority") as string) || "Normal";
        const category = sanitizeString(formData.get("category") as string) || "MDRRMO";
        const isPinned = formData.get("isPinned") === "true";
        const isActive = formData.get("isActive") !== "false";
        const barangay = (formData.get("barangay") as string) || null;
        const eventDateRaw = formData.get("eventDate") as string | null;
        const eventDate = eventDateRaw ? new Date(eventDateRaw) : null;
        const eventSchedule = (formData.get("eventSchedule") as string) || null;

        let imageUrl: string | null = null;
        const imageFile = formData.get("imageFile") as File | null;
        if (imageFile && imageFile.size > 0) {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const fileName = `announcements/mdrrmo_${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            const uploaded = await uploadFile(buffer, fileName, "system-assets", imageFile.type);
            if (uploaded) {
                imageUrl = uploaded;
            }
        }

        let announcement: any;

        if (id) {
            const updateData: any = {
                title,
                content,
                priority,
                category,
                isPinned,
                isActive,
                barangay,
                eventDate,
                eventSchedule,
                department: "MDRRMO"
            };

            if (imageUrl) {
                updateData.imageUrl = imageUrl;
            }

            announcement = await prisma.announcement.update({
                where: { id },
                data: updateData
            });

            await logActivity({
                action: "UPDATE",
                entityType: "Announcement",
                entityId: announcement.id,
                entityName: announcement.title,
                description: `Updated MDRRMO announcement "${announcement.title}" (${announcement.priority}).`
            });
        } else {
            announcement = await prisma.announcement.create({
                data: {
                    title,
                    content,
                    priority,
                    category,
                    isPinned,
                    isActive,
                    barangay,
                    imageUrl,
                    eventDate,
                    eventSchedule,
                    department: "MDRRMO",
                    approvalStatus: "APPROVED",
                    authorEmail: auth.session?.user?.email || null,
                    authorId: (auth.session?.user as any)?.id || null
                }
            });

            await logActivity({
                action: "CREATE",
                entityType: "Announcement",
                entityId: announcement.id,
                entityName: announcement.title,
                description: `Published new MDRRMO announcement "${announcement.title}" (${announcement.priority}).`
            });
        }

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/announcements");
        revalidatePath("/admin/announcements");

        return { success: true, announcement };
    } catch (error: any) {
        console.error("[saveMDRRMOAnnouncement] Error:", error);
        return { success: false, error: error.message || "Failed to save announcement" };
    }
}

export async function deleteMDRRMOAnnouncement(id: string) {
    try {
        const auth = await verifyMDRRMOAccess(true);
        if (!auth.authorized) {
            return { success: false, error: auth.error };
        }

        const announcement = await prisma.announcement.findUnique({
            where: { id }
        });

        if (announcement?.imageUrl) {
            await deleteFileByUrl(announcement.imageUrl).catch(() => {});
        }

        await prisma.announcement.delete({
            where: { id }
        });

        await logActivity({
            action: "DELETE",
            entityType: "Announcement",
            entityId: id,
            entityName: announcement?.title,
            description: `Deleted MDRRMO announcement "${announcement?.title}".`
        });

        revalidatePath("/admin/mdrrmo");
        revalidatePath("/admin/mdrrmo/announcements");
        revalidatePath("/admin/announcements");

        return { success: true };
    } catch (error: any) {
        console.error("[deleteMDRRMOAnnouncement] Error:", error);
        return { success: false, error: error.message || "Failed to delete announcement" };
    }
}
