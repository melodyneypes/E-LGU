"use server";

import prisma from "@/lib/db/prisma";
import { generateQueueNumber } from "@/lib/queue";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sanitizeString, sanitizeObject } from "@/lib/validation";
import { getMatchedCenterForUser } from "@/app/admin/rhu/actions";

export async function cleanupPastDueRHUAppointments(userId?: string) {
    try {
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [month, day, year] = manilaDateString.split("/");
        const startOfTodayManila = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

        const whereClause: any = {
            appointmentDate: {
                lt: startOfTodayManila
            },
            status: {
                notIn: ["RELEASED", "DELIVERED", "REJECTED"]
            },
            isCancelled: false,
            type: {
                category: "Rural Health Unit"
            }
        };

        if (userId) {
            whereClause.userId = userId;
        }

        await prisma.transaction.updateMany({
            where: whereClause,
            data: {
                isCancelled: true,
                status: "REJECTED",
                rejectionRemarks: "Appointment slot expired / missed"
            }
        });
    } catch (error) {
        console.error("Error cleaning up past-due RHU appointments:", error);
    }
}

export async function getRHUAppointmentConfig() {
    try {
        let rhuConfig = await prisma.appointmentConfig.findUnique({
            where: { department: "RHU" }
        });

        if (!rhuConfig) {
            rhuConfig = await prisma.appointmentConfig.create({
                data: {
                    department: "RHU",
                    maxSlots: 50,
                    blockedDates: [],
                    activeDays: [1, 2, 3, 4, 5]
                }
            });
        }
        return { success: true, data: rhuConfig };
    } catch (error) {
        console.error("Failed to get RHU appointment config:", error);
        return { success: false, error: "Failed to load config" };
    }
}

export async function getRHUBookedSlots(dateString: string, healthCenterId?: string) {
    try {
        const date = new Date(dateString);
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedSlots = await prisma.transaction.findMany({
            where: {
                appointmentDate: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                isCancelled: false,
                type: { category: "Rural Health Unit" }
            },
            select: {
                appointmentDate: true,
                appointmentSlot: true,
                additionalData: true
            }
        });

        // Filter by selected healthCenterId if provided
        const filteredSlots = healthCenterId
            ? bookedSlots.filter((slot: any) => {
                const data = slot.additionalData || {};
                return data.healthCenterId === healthCenterId;
            })
            : bookedSlots;

        return { success: true, data: filteredSlots };
    } catch (error) {
        console.error("Failed to fetch RHU booked slots:", error);
        return { success: false, error: "Failed to fetch booked slots" };
    }
}

export async function submitRHUAppointment(formData: FormData) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        await cleanupPastDueRHUAppointments(session.user.id);

        const typeId = sanitizeString(formData.get("typeId") as string);
        const appointmentSlot = sanitizeString(formData.get("appointmentSlot") as string);
        const appointmentDate = new Date(formData.get("appointmentDate") as string);

        const txType = await prisma.transactionType.findUnique({
            where: { id: typeId }
        });
        if (!txType) {
            return { success: false, error: "Invalid transaction type." };
        }

        // TODO: Re-enable this check after testing
        // const activeTx = await prisma.transaction.findFirst({
        //     where: {
        //         userId: session.user.id,
        //         type: { code: txType.code },
        //         status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
        //         isCancelled: false
        //     }
        // });
        // if (activeTx) {
        //     return {
        //         success: false,
        //         error: `You already have an active appointment for "${txType.name}". Please complete or attend your existing appointment before scheduling a new one.`
        //     };
        // }

        const residentSnapshot = sanitizeObject(JSON.parse(formData.get("residentSnapshot") as string));
        const additionalData = sanitizeObject(JSON.parse(formData.get("additionalData") as string));
        const healthCenterId = additionalData.healthCenterId || "";

        // 1. Check if slot is available for this specific health center
        const configRes = await getCenterAppointmentConfig(healthCenterId);
        const config = configRes.success ? configRes.data : null;
        const maxSlotsAM = config?.maxSlotsAM ?? 25;
        const maxSlotsPM = config?.maxSlotsPM ?? 25;

        const startOfDay = new Date(appointmentDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(appointmentDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const bookedSlots = await prisma.transaction.findMany({
            where: {
                appointmentDate: { gte: startOfDay, lte: endOfDay },
                appointmentSlot: appointmentSlot,
                isCancelled: false,
                type: { category: "Rural Health Unit" }
            },
            select: { additionalData: true }
        });

        const bookedCount = bookedSlots.filter((slot: any) => {
            const data = slot.additionalData || {};
            return data.healthCenterId === healthCenterId;
        }).length;

        const isAM = appointmentSlot.includes("AM") || appointmentSlot.toUpperCase().includes("08:00 AM");
        const maxLimit = isAM ? maxSlotsAM : maxSlotsPM;

        if (maxLimit > 0 && maxLimit < 99999 && bookedCount >= maxLimit) {
            return { success: false, error: "This appointment slot is already fully booked." };
        }

        const isPriority = additionalData.isPriorityLane === true || additionalData.isPriorityLane === "true";

        const queueNumber = await generateQueueNumber({
            source: "web",
            isPriority,
            appointmentDate: startOfDay,
            appointmentSlot,
            category: "RHU"
        });

        const transaction = await prisma.$transaction(async (tx) => {
            const newTx = await tx.transaction.create({
                data: {
                    userId: session.user.id,
                    typeId,
                    status: "FOR_INSPECTION", // Prisma valid enum mapping for initial booking
                    residentSnapshot,
                    additionalData: {
                        ...additionalData,
                        rhuStatus: "APPOINTMENT_BOOKED",
                        isPriorityLane: isPriority
                    },
                    totalAmount: 0,
                    appointmentDate,
                    appointmentSlot,
                    queueNumber,
                    isPriority,
                    businessName: additionalData.businessName || null,
                } as any
            });

            // Update permanent resident profile if any changes
            await tx.resident.update({
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
            });

            return newTx;
        });

        revalidatePath("/user/services");
        revalidatePath("/admin/transactions");
        return { success: true, data: transaction as any };
    } catch (error) {
        console.error("Submit RHU appointment error:", error);
        return { success: false, error: "Failed to book appointment" };
    }
}

export async function updateRHUAppointmentConfig(data: { maxSlots?: number; activeDays?: number[]; blockedDates?: string[] }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const updated = await prisma.appointmentConfig.upsert({
            where: { department: "RHU" },
            update: {
                maxSlots: data.maxSlots,
                activeDays: data.activeDays,
                blockedDates: data.blockedDates,
                updatedAt: new Date()
            },
            create: {
                department: "RHU",
                maxSlots: data.maxSlots || 50,
                activeDays: data.activeDays || [1, 2, 3, 4, 5],
                blockedDates: data.blockedDates || []
            }
        });

        revalidatePath("/admin/rhu/appointment-settings");
        revalidatePath("/user/services/rural-health-unit");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("updateRHUAppointmentConfig error:", error);
        return { success: false, error: error.message || "Failed to update config" };
    }
}

export async function getCenterAppointmentConfig(healthCenterId: string) {
    try {
        if (!healthCenterId || healthCenterId === "NONE") {
            // Return global config or default values if no center selected
            const rhuConfig = await prisma.appointmentConfig.findUnique({
                where: { department: "RHU" }
            });
            if (rhuConfig) {
                return { success: true, data: rhuConfig };
            }
            return {
                success: true,
                data: {
                    department: "RHU",
                    maxSlots: 50,
                    maxSlotsAM: 25,
                    maxSlotsPM: 25,
                    amTimeLabel: "08:00 AM - 11:00 AM",
                    pmTimeLabel: "01:00 PM - 04:00 PM",
                    blockedDates: [],
                    activeDays: [1, 2, 3, 4, 5]
                }
            };
        }

        const departmentKey = `RHU_CENTER_${healthCenterId}`;
        let config = await prisma.appointmentConfig.findUnique({
            where: { department: departmentKey }
        });
        if (!config) {
            // Fallback to global "RHU" config
            const rhuConfig = await prisma.appointmentConfig.findUnique({
                where: { department: "RHU" }
            });
            if (rhuConfig) {
                // Return a copy with the center's department key
                return { success: true, data: { ...rhuConfig, department: departmentKey } };
            }
            // Create default
            config = await prisma.appointmentConfig.create({
                data: {
                    department: departmentKey,
                    maxSlots: 50,
                    maxSlotsAM: 25,
                    maxSlotsPM: 25,
                    amTimeLabel: "08:00 AM - 11:00 AM",
                    pmTimeLabel: "01:00 PM - 04:00 PM",
                    blockedDates: [],
                    activeDays: [1, 2, 3, 4, 5]
                } as any
            });
        }
        return { success: true, data: config };
    } catch (error) {
        console.error("Failed to get center config:", error);
        return { success: false, error: "Failed to load config" };
    }
}

export async function updateCenterAppointmentConfig(
    healthCenterId: string,
    data: {
        maxSlots?: number;
        maxSlotsAM?: number;
        maxSlotsPM?: number;
        amTimeLabel?: string;
        pmTimeLabel?: string;
        activeDays?: number[];
        blockedDates?: string[];
    }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const role = ((session.user as any)?.role || "").toUpperCase();
        const email = session.user.email || "";
        const isCenterAdmin = role === "RHU_CENTER_ADMIN" || role === "ASST_SEC";
        const canManageSchedule = role === "ADMIN" || role === "RHU_ADMIN" || role === "RHU_CENTER_ADMIN" || role === "ASST_SEC";

        if (!canManageSchedule) {
            return { success: false, error: "Access Denied: Only RHU Center Medical Admins and Administrators can update schedule settings." };
        }

        // If center admin, verify they are assigned to this specific health center
        if (isCenterAdmin) {
            // Dynamically load health centers using query raw or model check to match centers/page.tsx
            let healthCenters: any[] = [];
            try {
                const model = (prisma as any).rHUHealthCenter || (prisma as any).RHUHealthCenter;
                if (model) {
                    healthCenters = await model.findMany({ where: { status: "ACTIVE" } });
                } else {
                    healthCenters = await prisma.$queryRaw`SELECT * FROM "RHUHealthCenter" WHERE "status" = 'ACTIVE'`;
                }
            } catch {
                healthCenters = [];
            }

            const assignedDoctorId = (session.user as any).assignedDoctorId;
            const matchedCenter = healthCenters.find((c: any) =>
                (c.userId && String(c.userId) === String(session.user.id)) ||
                (assignedDoctorId && c.userId && String(c.userId) === String(assignedDoctorId)) ||
                (c.accountEmail && email && String(c.accountEmail).toLowerCase() === String(email).toLowerCase()) ||
                (email && String(email).toLowerCase().includes("lalas") && String(c.name).toLowerCase().includes("lalas")) ||
                (email && String(email).toLowerCase().includes("main") && String(c.name).toLowerCase().includes("main"))
            );
            if (!matchedCenter || matchedCenter.id !== healthCenterId) {
                return { success: false, error: "Unauthorized: You can only edit settings for your assigned health center." };
            }
        }

        const departmentKey = `RHU_CENTER_${healthCenterId}`;
        const updated = await prisma.appointmentConfig.upsert({
            where: { department: departmentKey },
            update: {
                maxSlots: data.maxSlots,
                maxSlotsAM: data.maxSlotsAM,
                maxSlotsPM: data.maxSlotsPM,
                amTimeLabel: data.amTimeLabel,
                pmTimeLabel: data.pmTimeLabel,
                activeDays: data.activeDays,
                blockedDates: data.blockedDates,
                updatedAt: new Date()
            } as any,
            create: {
                department: departmentKey,
                maxSlots: data.maxSlots || 50,
                maxSlotsAM: data.maxSlotsAM || 25,
                maxSlotsPM: data.maxSlotsPM || 25,
                amTimeLabel: data.amTimeLabel || "08:00 AM - 11:00 AM",
                pmTimeLabel: data.pmTimeLabel || "01:00 PM - 04:00 PM",
                activeDays: data.activeDays || [1, 2, 3, 4, 5],
                blockedDates: data.blockedDates || []
            } as any
        });

        revalidatePath("/admin/rhu/appointment-settings");
        revalidatePath("/user/services/rural-health-unit");

        return { success: true, data: updated };
    } catch (error: any) {
        console.error("updateCenterAppointmentConfig error:", error);
        return { success: false, error: error.message || "Failed to update config" };
    }
}

export async function getCenterSpecialEvents(healthCenterId: string) {
    try {
        const departmentKey = `RHU_CENTER_${healthCenterId}`;
        const config: any = await prisma.appointmentConfig.findUnique({
            where: { department: departmentKey }
        });
        const events: any[] = (config?.specialEvents as any[]) || [];

        // Also fetch announcements with an eventDate
        let announcementEvents: any[] = [];
        try {
            const rows = await (prisma as any).$queryRawUnsafe(
                `SELECT * FROM "Announcement" WHERE "eventDate" IS NOT NULL AND ("healthCenterId" = $1 OR "healthCenterId" IS NULL) AND "isActive" = true ORDER BY "eventDate" ASC`,
                healthCenterId
            );
            if (Array.isArray(rows)) {
                announcementEvents = rows.map((ann: any) => {
                    let eventDateIso = "";
                    if (ann.eventDate) {
                        const d = new Date(ann.eventDate);
                        const y = d.getUTCFullYear();
                        const m = String(d.getUTCMonth() + 1).padStart(2, "0");
                        const day = String(d.getUTCDate()).padStart(2, "0");
                        eventDateIso = `${y}-${m}-${day}`;
                    }
                    return {
                        id: `ann_${ann.id}`,
                        announcementId: ann.id,
                        title: ann.title,
                        category: ann.priority === "Critical" ? "Critical Health Alert" : (ann.category || "Health Advisory"),
                        eventDate: eventDateIso,
                        timeRange: ann.eventSchedule || "Scheduled Advisory",
                        venue: ann.barangay || "RHU Center",
                        maxSlots: 50,
                        description: ann.content,
                        isAdvisory: true,
                        createdAt: ann.createdAt
                    };
                });
            }
        } catch (annErr) {
            console.warn("[getCenterSpecialEvents warning]: Failed to fetch announcements fallback", annErr);
        }

        // Combine events without duplicating
        const combined = [...events];
        const existingDatesAndTitles = new Set(events.map(e => `${e.eventDate}_${e.title}`));

        for (const annEvt of announcementEvents) {
            if (annEvt.eventDate && !existingDatesAndTitles.has(`${annEvt.eventDate}_${annEvt.title}`)) {
                combined.push(annEvt);
            }
        }

        return { success: true, data: combined };
    } catch (error: any) {
        console.error("getCenterSpecialEvents error:", error);
        return { success: false, error: "Failed to load events", data: [] };
    }
}

export async function saveCenterSpecialEvent(
    healthCenterId: string,
    eventData: {
        id?: string;
        title: string;
        category?: string;
        eventDate: string;
        timeRange?: string;
        venue?: string;
        maxSlots?: number;
        description?: string;
        publishToAdvisories?: boolean;
    }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const departmentKey = `RHU_CENTER_${healthCenterId}`;
        const config: any = await prisma.appointmentConfig.findUnique({
            where: { department: departmentKey }
        });

        let events: any[] = [];
        if (config?.specialEvents && Array.isArray(config.specialEvents)) {
            events = [...(config.specialEvents as any[])];
        }

        const eventId = eventData.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newEvent = {
            id: eventId,
            title: eventData.title,
            category: eventData.category || "General Medical Event",
            eventDate: eventData.eventDate,
            timeRange: eventData.timeRange || "08:00 AM - 03:00 PM",
            venue: eventData.venue || "",
            maxSlots: eventData.maxSlots || 50,
            description: eventData.description || "",
            publishToAdvisories: eventData.publishToAdvisories ?? true,
            createdAt: new Date().toISOString()
        };

        const existingIndex = events.findIndex(e => e.id === eventId);
        if (existingIndex >= 0) {
            events[existingIndex] = newEvent;
        } else {
            events.push(newEvent);
        }

        await prisma.appointmentConfig.upsert({
            where: { department: departmentKey },
            update: {
                specialEvents: events,
                updatedAt: new Date()
            } as any,
            create: {
                department: departmentKey,
                maxSlots: 50,
                specialEvents: events
            } as any
        });

        if (eventData.publishToAdvisories) {
            try {
                const announcementDelegate = (prisma as any).announcement;
                if (announcementDelegate) {
                    await announcementDelegate.create({
                        data: {
                            title: `[Special Medical Event] ${eventData.title}`,
                            content: eventData.description || `Special Medical Event on ${eventData.eventDate} from ${eventData.timeRange} at ${eventData.venue}. Target Slots: ${eventData.maxSlots}`,
                            category: "Health",
                            priority: "High",
                            eventDate: new Date(eventData.eventDate),
                            eventSchedule: `${eventData.timeRange} @ ${eventData.venue}`,
                            isActive: true,
                            isPinned: true,
                            healthCenterId: healthCenterId,
                            authorId: (session.user as any).id || null,
                            authorEmail: session.user.email || null
                        }
                    });
                }
            } catch (annErr) {
                console.warn("Announcement publishing sync warning:", annErr);
            }
        }

        revalidatePath("/admin/rhu/appointment-settings");
        revalidatePath("/user/services/rural-health-unit");

        return { success: true, data: events, event: newEvent };
    } catch (error: any) {
        console.error("saveCenterSpecialEvent error:", error);
        return { success: false, error: error.message || "Failed to save event" };
    }
}

export async function deleteCenterSpecialEvent(healthCenterId: string, eventId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const departmentKey = `RHU_CENTER_${healthCenterId}`;
        const config: any = await prisma.appointmentConfig.findUnique({
            where: { department: departmentKey }
        });

        if (config?.specialEvents && Array.isArray(config.specialEvents)) {
            const updatedEvents = (config.specialEvents as any[]).filter(e => e.id !== eventId);
            await prisma.appointmentConfig.update({
                where: { department: departmentKey },
                data: {
                    specialEvents: updatedEvents,
                    updatedAt: new Date()
                } as any
            });
        }

        revalidatePath("/admin/rhu/appointment-settings");
        revalidatePath("/user/services/rural-health-unit");

        return { success: true };
    } catch (error: any) {
        console.error("deleteCenterSpecialEvent error:", error);
        return { success: false, error: error.message || "Failed to delete event" };
    }
}

const defaultFleet = [
    {
        unit: "Ambulance Unit 1 (Foton Transporter)",
        station: "Poblacion Main Station",
        status: "STANDBY",
        statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        plateNumber: "SAB-1234"
    },
    {
        unit: "Ambulance Unit 2 (Toyota Hiace)",
        station: "Luyan South Station",
        status: "ON DUTY",
        statusColor: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        plateNumber: "SAB-5678"
    },
    {
        unit: "Ambulance Unit 3 (Barangay Response)",
        station: "Nilombot Station",
        status: "STANDBY",
        statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        plateNumber: "SAB-9012"
    }
];

const defaultHotlines = [
    { name: "RHU Emergency Dispatch", number: "0917-555-0199" },
    { name: "MDRRMO Mapandan Hotline", number: "(075) 529-1234" },
    { name: "Municipal Health Officer", number: "0920-123-4567" }
];

export async function getAmbulanceSettings() {
    try {
        const session = await getServerSession(authOptions);
        
        let queryFilter: any = {};
        let matchedCenterId: string | null = null;
        let isClientAdmin = false;

        if (session?.user) {
            const role = ((session.user as any)?.role || "").toUpperCase();
            isClientAdmin = role === "ADMIN" || role === "RHU_ADMIN" || role.startsWith("RHU_") || role === "ADMIN_AIDE" || role === "RHU_CENTER_ADMIN" || role === "RHU_STAFF" || role === "RHU_DOCTOR" || role === "ASST_SEC";
            
            if (isClientAdmin) {
                const matchedCenter = await getMatchedCenterForUser(session.user);
                if (matchedCenter) {
                    matchedCenterId = matchedCenter.id;
                    queryFilter = { assigned_center_id: matchedCenter.id };
                }
            } else {
                // Resident/standard user: only active assets
                queryFilter = { status: { not: "INACTIVE" } };
            }
        } else {
            // Unauthenticated view (public page): only active assets
            queryFilter = { status: { not: "INACTIVE" } };
        }

        let fleet = await (prisma as any).rHUAmbulance.findMany({
            where: queryFilter,
            orderBy: { createdAt: "asc" }
        });

        // Initialize defaults if empty for this center
        if (fleet.length === 0) {
            const defaults = defaultFleet.map(item => ({
                ...item,
                assigned_center_id: matchedCenterId
            }));
            await Promise.all(defaults.map(item => 
                (prisma as any).rHUAmbulance.create({ data: item })
            ));
            fleet = await (prisma as any).rHUAmbulance.findMany({
                where: queryFilter,
                orderBy: { createdAt: "asc" }
            });
        }

        const hotlineFilter: any = { ...queryFilter };
        if (hotlineFilter.status) {
            hotlineFilter.status = { not: "INACTIVE" };
        }

        let hotlines = await (prisma as any).rHUAmbulanceHotline.findMany({
            where: hotlineFilter,
            orderBy: { createdAt: "asc" }
        });

        if (hotlines.length === 0) {
            const defaults = defaultHotlines.map(item => ({
                ...item,
                status: "ACTIVE",
                assigned_center_id: matchedCenterId
            }));
            await Promise.all(defaults.map(item => 
                (prisma as any).rHUAmbulanceHotline.create({ data: item })
            ));
            hotlines = await (prisma as any).rHUAmbulanceHotline.findMany({
                where: hotlineFilter,
                orderBy: { createdAt: "asc" }
            });
        }

        return { success: true, fleet, hotlines, matchedCenterId };
    } catch (error: any) {
        console.error("getAmbulanceSettings error:", error);
        return { success: false, fleet: [], hotlines: [], error: error.message || "Failed to load settings" };
    }
}

export async function updateAmbulanceSettings(fleet: any[], hotlines: any[]) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return { success: false, error: "Unauthorized" };
        }

        const role = ((session.user as any)?.role || "").toUpperCase();
        const canManage = role === "ADMIN" || role === "RHU_ADMIN" || role.startsWith("RHU_") || role === "ASST_SEC";
        if (!canManage) {
            return { success: false, error: "Access Denied" };
        }

        const matchedCenter = await getMatchedCenterForUser(session.user);
        const centerId = matchedCenter?.id || null;

        // Perform transactional update restricted to the user's matched center
        await (prisma as any).$transaction(async (tx: any) => {
            // Delete existing for THIS center only (to prevent destroying other centers' data!)
            await tx.rHUAmbulance.deleteMany({
                where: { assigned_center_id: centerId }
            });
            await tx.rHUAmbulanceHotline.deleteMany({
                where: { assigned_center_id: centerId }
            });

            // Re-create new list tagged with this center
            if (fleet && fleet.length > 0) {
                await Promise.all(fleet.map((item: any) => tx.rHUAmbulance.create({
                    data: {
                        unit: item.unit,
                        plateNumber: item.plateNumber,
                        station: item.station,
                        status: item.status,
                        statusColor: item.statusColor || "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                        assigned_center_id: centerId
                    }
                })));
            }

            if (hotlines && hotlines.length > 0) {
                await Promise.all(hotlines.map((item: any) => tx.rHUAmbulanceHotline.create({
                    data: {
                        name: item.name,
                        number: item.number,
                        status: item.status || "ACTIVE",
                        assigned_center_id: centerId
                    }
                })));
            }
        });

        revalidatePath("/admin/rhu/ambulance");
        revalidatePath("/user/services/rural-health-unit");

        return { success: true };
    } catch (error: any) {
        console.error("updateAmbulanceSettings error:", error);
        return { success: false, error: error.message || "Failed to update settings" };
    }
}
