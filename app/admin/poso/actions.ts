"use server";

import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function verifyAdminOrStaff() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        throw new Error("Unauthorized access.");
    }
    const user = session.user as any;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "TREASURY_STAFF", "STAFF"];
    if (user.role && !allowedRoles.includes(user.role)) {
        throw new Error("Forbidden access.");
    }
    return user;
}

// ----------------------------------------
// TRAFFIC VIOLATIONS ACTIONS
// ----------------------------------------

export async function getTrafficViolations() {
    try {
        await verifyAdminOrStaff();
        const violations = await (prisma as any).trafficViolation.findMany({
            orderBy: { createdAt: "desc" },
        });
        return { success: true, violations };
    } catch (error: any) {
        console.error("Failed to fetch traffic violations:", error);
        return { success: false, error: error.message || "Failed to fetch traffic violations." };
    }
}

export async function addTrafficViolation(formData: FormData) {
    try {
        await verifyAdminOrStaff();
        const violationCode = (formData.get("violationCode") as string)?.trim();
        const violationName = (formData.get("violationName") as string)?.trim();
        const firstOffenseFee = parseFloat(formData.get("firstOffenseFee") as string || "0");
        const secondOffenseFee = parseFloat(formData.get("secondOffenseFee") as string || "0");
        const thirdOffenseFee = parseFloat(formData.get("thirdOffenseFee") as string || "0");
        const remarks = (formData.get("remarks") as string)?.trim() || null;

        if (!violationName) {
            return { success: false, error: "Violation name is required." };
        }

        const newViolation = await (prisma as any).trafficViolation.create({
            data: {
                violationCode: violationCode || null,
                violationName,
                firstOffenseFee,
                secondOffenseFee,
                thirdOffenseFee,
                remarks,
                isActive: true,
            },
        });

        revalidatePath("/admin/poso/violations");
        return { success: true, violation: newViolation };
    } catch (error: any) {
        console.error("Failed to add traffic violation:", error);
        return { success: false, error: error.message || "Failed to create traffic violation." };
    }
}

export async function updateTrafficViolation(id: string, formData: FormData) {
    try {
        await verifyAdminOrStaff();
        const violationCode = (formData.get("violationCode") as string)?.trim();
        const violationName = (formData.get("violationName") as string)?.trim();
        const firstOffenseFee = parseFloat(formData.get("firstOffenseFee") as string || "0");
        const secondOffenseFee = parseFloat(formData.get("secondOffenseFee") as string || "0");
        const thirdOffenseFee = parseFloat(formData.get("thirdOffenseFee") as string || "0");
        const remarks = (formData.get("remarks") as string)?.trim() || null;

        if (!violationName) {
            return { success: false, error: "Violation name is required." };
        }

        const updatedViolation = await (prisma as any).trafficViolation.update({
            where: { id },
            data: {
                violationCode: violationCode || null,
                violationName,
                firstOffenseFee,
                secondOffenseFee,
                thirdOffenseFee,
                remarks,
            },
        });

        revalidatePath("/admin/poso/violations");
        return { success: true, violation: updatedViolation };
    } catch (error: any) {
        console.error("Failed to update traffic violation:", error);
        return { success: false, error: error.message || "Failed to update traffic violation." };
    }
}

export async function deleteTrafficViolation(id: string) {
    try {
        await verifyAdminOrStaff();
        await (prisma as any).trafficViolation.delete({
            where: { id },
        });
        revalidatePath("/admin/poso/violations");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete traffic violation:", error);
        return { success: false, error: error.message || "Failed to delete traffic violation." };
    }
}

// ----------------------------------------
// POSO CITATION TICKETS ACTIONS
// ----------------------------------------

// ----------------------------------------
// POSO SYSTEM SETTINGS (DUE DAYS & PENALTIES)
// ----------------------------------------

export interface POSOPenaltySettings {
    dueDays: number;
    surchargeRate: number;
    monthlyInterestRate: number;
}

export interface POSOPenaltyBreakdown {
    baseFine: number;
    impoundFee: number;
    subtotal: number;
    isOverdue: boolean;
    daysOverdue: number;
    monthsOverdue: number;
    surchargeRate: number;
    surchargeAmount: number;
    monthlyInterestRate: number;
    interestAmount: number;
    totalPenalty: number;
    grandTotalPayable: number;
}

export async function getPosoPenaltySettings(): Promise<{ success: boolean; settings: POSOPenaltySettings; error?: string }> {
    try {
        const settingsList = await (prisma as any).systemSetting.findMany({
            where: {
                key: {
                    in: ["poso_ticket_due_days", "poso_surcharge_rate", "poso_monthly_interest_rate"],
                },
            },
        });

        const dueDaysSetting = settingsList.find((s: any) => s.key === "poso_ticket_due_days");
        const surchargeSetting = settingsList.find((s: any) => s.key === "poso_surcharge_rate");
        const interestSetting = settingsList.find((s: any) => s.key === "poso_monthly_interest_rate");

        const dueDays = dueDaysSetting ? parseInt(dueDaysSetting.value, 10) : 7;
        const surchargeRate = surchargeSetting ? parseFloat(surchargeSetting.value) : 25;
        const monthlyInterestRate = interestSetting ? parseFloat(interestSetting.value) : 2;

        return {
            success: true,
            settings: {
                dueDays: isNaN(dueDays) ? 7 : dueDays,
                surchargeRate: isNaN(surchargeRate) ? 25 : surchargeRate,
                monthlyInterestRate: isNaN(monthlyInterestRate) ? 2 : monthlyInterestRate,
            },
        };
    } catch (error: any) {
        console.error("Failed to fetch POSO penalty settings:", error);
        return {
            success: false,
            settings: { dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 },
            error: error.message,
        };
    }
}

export async function updatePosoPenaltySettings(data: {
    dueDays: number;
    surchargeRate: number;
    monthlyInterestRate: number;
}) {
    try {
        await verifyAdminOrStaff();
        const validDays = Math.max(1, Math.min(365, data.dueDays || 7));
        const validSurcharge = Math.max(0, Math.min(100, data.surchargeRate ?? 25));
        const validInterest = Math.max(0, Math.min(100, data.monthlyInterestRate ?? 2));

        await Promise.all([
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_ticket_due_days" },
                update: { value: String(validDays) },
                create: {
                    key: "poso_ticket_due_days",
                    value: String(validDays),
                    description: "Number of grace period days before POSO traffic citations become overdue",
                },
            }),
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_surcharge_rate" },
                update: { value: String(validSurcharge) },
                create: {
                    key: "poso_surcharge_rate",
                    value: String(validSurcharge),
                    description: "Percentage late payment surcharge for overdue POSO citations (RA 7160)",
                },
            }),
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_monthly_interest_rate" },
                update: { value: String(validInterest) },
                create: {
                    key: "poso_monthly_interest_rate",
                    value: String(validInterest),
                    description: "Monthly interest rate percentage for overdue POSO citations (RA 7160)",
                },
            }),
        ]);

        revalidatePath("/admin/poso/tickets");
        revalidatePath("/admin/poso/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update POSO penalty settings:", error);
        return { success: false, error: error.message || "Failed to update penalty settings." };
    }
}

export async function updatePosoPortalInfoSettings(data: {
    location: string;
    hotline: string;
    operatingHours: string;
    officialEmail: string;
    facebookUrl?: string;
}) {
    try {
        await verifyAdminOrStaff();
        await Promise.all([
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_location" },
                update: { value: data.location.trim() },
                create: { key: "poso_location", value: data.location.trim(), description: "Official POSO Office Address" },
            }),
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_hotline" },
                update: { value: data.hotline.trim() },
                create: { key: "poso_hotline", value: data.hotline.trim(), description: "POSO Emergency & Incident Hotline Numbers" },
            }),
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_operating_hour" },
                update: { value: data.operatingHours.trim() },
                create: { key: "poso_operating_hour", value: data.operatingHours.trim(), description: "POSO Office Operating Hours" },
            }),
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_official_email" },
                update: { value: data.officialEmail.trim() },
                create: { key: "poso_official_email", value: data.officialEmail.trim(), description: "POSO Official Public Contact Email" },
            }),
            (prisma as any).systemSetting.upsert({
                where: { key: "poso_facebook" },
                update: { value: (data.facebookUrl || "").trim() },
                create: { key: "poso_facebook", value: (data.facebookUrl || "").trim(), description: "POSO Official Facebook Page Link" },
            }),
        ]);

        revalidatePath("/poso/mapandan");
        revalidatePath("/poso/mapandan/violations");
        revalidatePath("/admin/poso/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to update POSO portal info settings:", error);
        return { success: false, error: error.message || "Failed to update POSO portal info settings." };
    }
}

export async function calculatePosoTicketPenalty(
    ticket: {
        totalAmount?: number;
        impoundFee?: number;
        isImpounded?: boolean;
        dateTime?: Date | string;
        isPaid?: boolean;
        status?: string;
    },
    settings: POSOPenaltySettings,
    targetDate: Date = new Date()
): Promise<POSOPenaltyBreakdown> {
    const baseFine = Number(ticket.totalAmount || 0);
    const impoundFee = ticket.isImpounded ? Number(ticket.impoundFee || 0) : 0;
    const subtotal = baseFine;

    const apprehensionDate = ticket.dateTime ? new Date(ticket.dateTime) : new Date();
    const dueDate = new Date(apprehensionDate.getTime() + settings.dueDays * 24 * 60 * 60 * 1000);

    const isPaidOrSettled = Boolean(ticket.isPaid) || ticket.status === "PAID" || ticket.status === "SETTLED";
    const isOverdue = !isPaidOrSettled && targetDate > dueDate;

    if (!isOverdue) {
        return {
            baseFine,
            impoundFee,
            subtotal,
            isOverdue: false,
            daysOverdue: 0,
            monthsOverdue: 0,
            surchargeRate: settings.surchargeRate,
            surchargeAmount: 0,
            monthlyInterestRate: settings.monthlyInterestRate,
            interestAmount: 0,
            totalPenalty: 0,
            grandTotalPayable: subtotal,
        };
    }

    const diffTime = targetDate.getTime() - dueDate.getTime();
    const daysOverdue = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const monthsOverdue = Math.max(1, Math.ceil(daysOverdue / 30));

    const surchargeAmount = (subtotal * settings.surchargeRate) / 100;
    const interestAmount = (subtotal * (settings.monthlyInterestRate / 100)) * monthsOverdue;
    const totalPenalty = surchargeAmount + interestAmount;

    return {
        baseFine,
        impoundFee,
        subtotal,
        isOverdue: true,
        daysOverdue,
        monthsOverdue,
        surchargeRate: settings.surchargeRate,
        surchargeAmount,
        monthlyInterestRate: settings.monthlyInterestRate,
        interestAmount,
        totalPenalty,
        grandTotalPayable: subtotal + totalPenalty,
    };
}

export async function getTickets(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    isImpounded?: boolean;
    from?: string;
    to?: string;
    exportAll?: boolean;
} = {}) {
    try {
        await verifyAdminOrStaff();

        const page = params.page || 1;
        const pageSize = params.limit || 10;
        const skip = params.exportAll ? undefined : (page - 1) * pageSize;
        const take = params.exportAll ? undefined : pageSize;

        const penaltySettingsRes = await getPosoPenaltySettings();
        const posoDueDays = penaltySettingsRes.settings?.dueDays || 7;

        const where: any = {};

        if (params.isImpounded !== undefined) {
            where.isImpounded = params.isImpounded;
        }

        // Date Range Filter
        if (params.from || params.to) {
            where.dateTime = {};
            if (params.from) {
                const fromDate = new Date(params.from);
                fromDate.setHours(0, 0, 0, 0);
                where.dateTime.gte = fromDate;
            }
            if (params.to) {
                const toDate = new Date(params.to);
                toDate.setHours(23, 59, 59, 999);
                where.dateTime.lte = toDate;
            }
        }

        // Status Filter
        if (params.status && params.status !== "ALL" && params.status !== "All") {
            if (params.status === "OVERDUE") {
                const cutoffDate = new Date(Date.now() - posoDueDays * 24 * 60 * 60 * 1000);
                where.dateTime = {
                    ...(where.dateTime || {}),
                    lt: cutoffDate,
                };
                where.isPaid = false;
                where.status = { notIn: ["PAID", "SETTLED"] };
            } else if (params.status === "PAID") {
                where.OR = [{ isPaid: true }, { status: "PAID" }];
            } else if (params.status === "UNPAID") {
                where.isPaid = false;
                where.status = { notIn: ["PAID", "SETTLED"] };
            } else {
                where.status = params.status;
            }
        }

        if (params.search) {
            const query = params.search.trim();
            const searchOrs = [
                { ticketNo: { contains: query, mode: "insensitive" } },
                { violatorName: { contains: query, mode: "insensitive" } },
                { licenseNo: { contains: query, mode: "insensitive" } },
                { plateNo: { contains: query, mode: "insensitive" } },
                { officerName: { contains: query, mode: "insensitive" } },
                { location: { contains: query, mode: "insensitive" } },
            ];

            if (where.OR) {
                const existingOR = where.OR;
                delete where.OR;
                where.AND = [
                    { OR: existingOR },
                    { OR: searchOrs }
                ];
            } else {
                where.OR = searchOrs;
            }
        }

        const [tickets, totalCount] = await Promise.all([
            (prisma as any).ticketHeader.findMany({
                where,
                select: {
                    id: true,
                    ticketNo: true,
                    violatorName: true,
                    licenseNo: true,
                    plateNo: true,
                    location: true,
                    dateTime: true,
                    officerName: true,
                    totalAmount: true,
                    status: true,
                    isPaid: true,
                    createdAt: true,
                    transactionId: true,
                    isImpounded: true,
                    impoundFee: true,
                    vehicleClass: true,
                    details: {
                        select: {
                            violationName: true,
                            amount: true,
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            (prisma as any).ticketHeader.count({ where }),
        ]);

        return { success: true, tickets: JSON.parse(JSON.stringify(tickets)), totalCount, posoDueDays };
    } catch (error: any) {
        console.error("Failed to fetch POSO tickets:", error);
        return { success: false, error: error.message || "Failed to fetch citation tickets." };
    }
}

export async function getTicketById(id: string) {
    try {
        await verifyAdminOrStaff();

        const penaltySettingsRes = await getPosoPenaltySettings();
        const posoDueDays = penaltySettingsRes.settings?.dueDays || 7;

        let ticket = await (prisma as any).ticketHeader.findUnique({
            where: { id },
            include: {
                details: {
                    include: {
                        violation: true,
                    },
                },
                ticketPhotos: true,
                transaction: {
                    include: {
                        payment: true,
                    },
                },
            },
        });

        if (!ticket) {
            ticket = await (prisma as any).ticketHeader.findFirst({
                where: {
                    OR: [
                        { transactionId: id },
                        { ticketNo: id },
                    ],
                },
                include: {
                    details: {
                        include: {
                            violation: true,
                        },
                    },
                    ticketPhotos: true,
                    transaction: {
                        include: {
                            payment: true,
                        },
                    },
                },
            });
        }

        const themeSetting = await (prisma as any).systemSetting.findUnique({
            where: { key: "theme_color" },
        });

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        let otherUnpaidTickets: any[] = [];
        let otherPaidTickets: any[] = [];
        let otherUnpaidTotal = 0;

        if (ticket.licenseNo || ticket.violatorName) {
            const whereOR: any[] = [];
            if (ticket.licenseNo && ticket.licenseNo.trim()) {
                whereOR.push({ licenseNo: { equals: ticket.licenseNo.trim(), mode: "insensitive" } });
            }
            if (ticket.violatorName && ticket.violatorName.trim()) {
                whereOR.push({ violatorName: { equals: ticket.violatorName.trim(), mode: "insensitive" } });
            }

            if (whereOR.length > 0) {
                otherUnpaidTickets = await (prisma as any).ticketHeader.findMany({
                    where: {
                        OR: whereOR,
                        NOT: { id: ticket.id },
                        isPaid: false,
                    },
                    select: {
                        id: true,
                        ticketNo: true,
                        totalAmount: true,
                        isImpounded: true,
                        impoundFee: true,
                        dateTime: true,
                        status: true,
                    },
                    orderBy: { dateTime: "desc" },
                });

                otherUnpaidTotal = otherUnpaidTickets.reduce(
                    (sum: number, t: any) => sum + (t.totalAmount || 0) + (t.isImpounded ? Number(t.impoundFee || 0) : 0),
                    0
                );

                otherPaidTickets = await (prisma as any).ticketHeader.findMany({
                    where: {
                        AND: [
                            { OR: whereOR },
                            { NOT: { id: ticket.id } },
                            {
                                OR: [
                                    { isPaid: true },
                                    { status: "PAID" }
                                ]
                            },
                            { NOT: { status: "SETTLED" } }
                        ]
                    },
                    select: {
                        id: true,
                        ticketNo: true,
                        totalAmount: true,
                        isImpounded: true,
                        impoundFee: true,
                        dateTime: true,
                        status: true,
                        isPaid: true,
                    },
                    orderBy: { dateTime: "desc" },
                });
            }
        }

        return {
            success: true,
            ticket,
            otherUnpaidTickets,
            otherPaidTickets,
            otherUnpaidTotal,
            themeColor: themeSetting?.value || null,
            posoDueDays,
        };
    } catch (error: any) {
        console.error("Failed to fetch ticket details:", error);
        return { success: false, error: error.message || "Failed to fetch ticket details." };
    }
}

export async function getViolatorHistory({
    licenseNo,
    violatorName,
}: {
    licenseNo?: string | null;
    violatorName?: string | null;
}) {
    try {
        await verifyAdminOrStaff();
        if (!licenseNo && !violatorName) {
            return { success: false, error: "License number or Violator name is required." };
        }

        const whereOR: any[] = [];
        if (licenseNo && licenseNo.trim()) {
            whereOR.push({ licenseNo: { equals: licenseNo.trim(), mode: "insensitive" } });
        }
        if (violatorName && violatorName.trim()) {
            whereOR.push({ violatorName: { equals: violatorName.trim(), mode: "insensitive" } });
        }

        const tickets = await (prisma as any).ticketHeader.findMany({
            where: {
                OR: whereOR,
            },
            include: {
                details: {
                    include: {
                        violation: true,
                    },
                },
            },
            orderBy: { dateTime: "desc" },
        });

        const totalCitations = tickets.length;
        const totalAmountFined = tickets.reduce((sum: number, t: any) => sum + (t.totalAmount || 0) + (t.isImpounded ? Number(t.impoundFee || 0) : 0), 0);
        const unpaidCount = tickets.filter((t: any) => !t.isPaid).length;
        const impoundedTickets = tickets.filter((t: any) => t.isImpounded);
        const activeImpoundedCount = impoundedTickets.filter((t: any) => !t.isReleased && !t.isPaid).length;
        const totalImpoundFees = tickets.reduce((sum: number, t: any) => sum + (t.isImpounded ? Number(t.impoundFee || 0) : 0), 0);

        return {
            success: true,
            totalCitations,
            totalAmountFined,
            unpaidCount,
            totalImpoundedCount: impoundedTickets.length,
            activeImpoundedCount,
            totalImpoundFees,
            tickets,
        };
    } catch (error: any) {
        console.error("Failed to fetch violator history:", error);
        return { success: false, error: error.message || "Failed to fetch violator history." };
    }
}

export async function updateTicketStatus(id: string, status: string, isPaid?: boolean) {
    try {
        await verifyAdminOrStaff();
        const dataToUpdate: any = { status };
        if (typeof isPaid === "boolean") {
            dataToUpdate.isPaid = isPaid;
        }

        const updatedTicket = await (prisma as any).ticketHeader.update({
            where: { id },
            data: dataToUpdate,
        });

        revalidatePath("/admin/poso/tickets");
        return { success: true, ticket: updatedTicket };
    } catch (error: any) {
        console.error("Failed to update ticket status:", error);
        return { success: false, error: error.message || "Failed to update ticket status." };
    }
}

export async function processTicketSettlement(id: string) {
    try {
        const user = await verifyAdminOrStaff();

        const ticket = await (prisma as any).ticketHeader.findUnique({
            where: { id },
            include: {
                details: true,
            },
        });

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        if (ticket.isPaid) {
            return { success: false, error: "Ticket has already been settled." };
        }

        let transactionType = await (prisma as any).transactionType.findUnique({
            where: { code: "POSO_TRAFFIC_FINE" },
        });

        if (!transactionType) {
            transactionType = await (prisma as any).transactionType.create({
                data: {
                    code: "POSO_TRAFFIC_FINE",
                    name: "POSO Traffic Violation Fine",
                    description: "Payment settlement for POSO municipal traffic citations and ordinance apprehendings",
                    category: "POSO",
                    processorRole: "TREASURY_STAFF",
                    isFixed: false,
                    isActive: true,
                },
            });
        }

        let violatorUserId: string | null = null;
        if (ticket.violatorName) {
            // 1. Try matching User table directly by name
            const matchedUser = await (prisma as any).user.findFirst({
                where: {
                    name: { equals: ticket.violatorName, mode: "insensitive" },
                },
                select: { id: true },
            });

            if (matchedUser) {
                violatorUserId = matchedUser.id;
            } else {
                // 2. Try matching Resident profile table by name
                const nameParts = ticket.violatorName.trim().split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

                const matchedResident = await (prisma as any).resident.findFirst({
                    where: {
                        AND: [
                            { firstName: { equals: firstName, mode: "insensitive" } },
                            ...(lastName ? [{ lastName: { equals: lastName, mode: "insensitive" } }] : []),
                        ],
                    },
                    select: { userId: true },
                });

                if (matchedResident?.userId) {
                    violatorUserId = matchedResident.userId;
                }
            }
        }

        const residentSnapshot = {
            fullName: ticket.violatorName || "Unknown Violator",
            licenseNo: ticket.licenseNo || null,
            plateNo: ticket.plateNo || null,
            address: ticket.violatorAddress || null,
            isRegisteredUser: Boolean(violatorUserId),
        };

        const penaltySettingsRes = await getPosoPenaltySettings();
        const penaltySettings = penaltySettingsRes.settings;
        const penaltyBreakdown = await calculatePosoTicketPenalty(ticket, penaltySettings);

        const impoundFee = ticket.isImpounded ? (ticket.impoundFee || 0) : 0;
        const grandTotal = penaltyBreakdown.grandTotalPayable;

        const additionalData = {
            ticketNo: ticket.ticketNo,
            ticketHeaderId: ticket.id,
            ticketHeaderIds: [ticket.id],
            ticketNumbers: [ticket.ticketNo],
            ticketCount: 1,
            location: ticket.location || null,
            officerName: ticket.officerName || null,
            isImpounded: ticket.isImpounded || false,
            vehicleClass: ticket.vehicleClass || null,
            impoundYard: ticket.isImpounded ? (ticket.impoundYard || "Mapandan POSO Impounding Facility") : null,
            impoundedAt: ticket.isImpounded ? (ticket.impoundedAt || ticket.dateTime) : null,
            impoundFee: impoundFee,
            violations: (ticket.details || []).map((d: any) => ({
                name: d.violationName,
                level: d.offenseLevel,
                fine: d.amount,
            })),
            penaltyBreakdown,
            ticketsBreakdown: [
                {
                    ticketId: ticket.id,
                    ticketNo: ticket.ticketNo,
                    baseFine: ticket.totalAmount || 0,
                    impoundFee,
                    isImpounded: ticket.isImpounded || false,
                    surchargeAmount: penaltyBreakdown.surchargeAmount,
                    interestAmount: penaltyBreakdown.interestAmount,
                    totalFine: grandTotal,
                },
            ],
        };

        const fiscalSnapshot = {
            baseFineTotal: ticket.totalAmount || 0,
            impoundFee: impoundFee,
            surchargeAmount: penaltyBreakdown.surchargeAmount,
            interestAmount: penaltyBreakdown.interestAmount,
            totalPenalty: penaltyBreakdown.totalPenalty,
            totalAmount: grandTotal,
        };

        const result = await (prisma as any).$transaction(async (tx: any) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    queueNumber: ticket.ticketNo,
                    userId: violatorUserId,
                    typeId: transactionType.id,
                    status: "UNPAID",
                    residentSnapshot,
                    additionalData,
                    fiscalSnapshot,
                    totalAmount: grandTotal,
                    isPaid: false,
                    processedBy: user.name || user.email,
                },
            });

            const updatedTicket = await tx.ticketHeader.update({
                where: { id },
                data: {
                    transactionId: newTransaction.id,
                    isPaid: false,
                    status: "UNPAID",
                },
            });

            return { transaction: newTransaction, ticket: updatedTicket };
        });

        revalidatePath("/admin/poso/tickets");
        revalidatePath(`/admin/poso/tickets/${id}`);
        revalidatePath("/admin/treasury/payments");

        return { success: true, transaction: result.transaction, ticket: result.ticket };
    } catch (error: any) {
        console.error("Failed to process ticket settlement:", error);
        return { success: false, error: error.message || "Failed to process ticket settlement." };
    }
}

export async function processMultipleTicketsSettlement(ticketIds: string[]) {
    try {
        const user = await verifyAdminOrStaff();
        if (!ticketIds || ticketIds.length === 0) {
            return { success: false, error: "No tickets selected for settlement." };
        }

        const tickets = await (prisma as any).ticketHeader.findMany({
            where: { id: { in: ticketIds } },
            include: {
                details: {
                    include: {
                        violation: true,
                    },
                },
            },
        });

        if (tickets.length === 0) {
            return { success: false, error: "Selected citation tickets were not found." };
        }

        const firstTicket = tickets[0];
        let violatorUserId = firstTicket.violatorUserId || null;
        if (!violatorUserId && firstTicket.violatorName) {
            // 1. Try matching User table directly by name
            const matchedUser = await (prisma as any).user.findFirst({
                where: {
                    name: { equals: firstTicket.violatorName, mode: "insensitive" },
                },
                select: { id: true },
            });

            if (matchedUser) {
                violatorUserId = matchedUser.id;
            } else {
                // 2. Try matching Resident profile table by first and last name
                const nameParts = firstTicket.violatorName.trim().split(" ");
                const firstName = nameParts[0] || "";
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

                if (firstName) {
                    const matchedResident = await (prisma as any).resident.findFirst({
                        where: {
                            AND: [
                                { firstName: { equals: firstName, mode: "insensitive" } },
                                ...(lastName ? [{ lastName: { equals: lastName, mode: "insensitive" } }] : []),
                            ],
                        },
                        select: { userId: true },
                    });

                    if (matchedResident?.userId) {
                        violatorUserId = matchedResident.userId;
                    }
                }
            }
        }

        let transactionType = await (prisma as any).transactionType.findFirst({
            where: { code: "POSO_TRAFFIC_FINE" },
        });

        if (!transactionType) {
            transactionType = await (prisma as any).transactionType.create({
                data: {
                    name: "Traffic Citation Fine Settlement",
                    code: "POSO_TRAFFIC_FINE",
                    category: "POSO",
                    amount: 0,
                    isActive: true,
                },
            });
        }

        const residentSnapshot = {
            fullName: firstTicket.violatorName || "Unknown Violator",
            licenseNo: firstTicket.licenseNo || null,
            plateNo: firstTicket.plateNo || null,
            address: firstTicket.violatorAddress || null,
            isRegisteredUser: Boolean(violatorUserId),
        };

        let baseFineTotal = 0;
        let totalImpoundFee = 0;
        const allTicketNos: string[] = [];
        const allViolations: any[] = [];
        const impoundDetails: any[] = [];
        const ticketsBreakdown: any[] = [];

        for (const t of tickets) {
            const baseFine = t.totalAmount || 0;
            const impFee = t.isImpounded ? Number(t.impoundFee || 0) : 0;
            baseFineTotal += baseFine;
            totalImpoundFee += impFee;
            allTicketNos.push(t.ticketNo);

            ticketsBreakdown.push({
                ticketId: t.id,
                ticketNo: t.ticketNo,
                baseFine,
                impoundFee: impFee,
                isImpounded: t.isImpounded || false,
                totalFine: baseFine + impFee,
            });

            if (t.isImpounded) {
                impoundDetails.push({
                    ticketNo: t.ticketNo,
                    vehicleClass: t.vehicleClass || "Standard",
                    impoundYard: t.impoundYard || "Mapandan POSO Impounding Facility",
                    impoundFee: impFee,
                });
            }

            for (const d of (t.details || [])) {
                allViolations.push({
                    ticketNo: t.ticketNo,
                    name: d.violationName,
                    level: d.offenseLevel,
                    fine: d.amount,
                });
            }
        }

        const grandTotal = baseFineTotal + totalImpoundFee;
        const queueNumber = tickets.length === 1
            ? firstTicket.ticketNo
            : `${firstTicket.ticketNo}-${tickets.length - 1}`;

        const additionalData = {
            ticketNo: firstTicket.ticketNo,
            ticketHeaderId: firstTicket.id,
            ticketHeaderIds: ticketIds,
            ticketNumbers: allTicketNos,
            ticketCount: tickets.length,
            violatorName: firstTicket.violatorName,
            licenseNo: firstTicket.licenseNo,
            isImpounded: impoundDetails.length > 0,
            impoundDetails,
            violations: allViolations,
            ticketsBreakdown,
        };

        const fiscalSnapshot = {
            baseFineTotal,
            impoundFee: totalImpoundFee,
            totalAmount: grandTotal,
        };

        const result = await (prisma as any).$transaction(async (tx: any) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    queueNumber,
                    userId: violatorUserId,
                    typeId: transactionType.id,
                    status: "UNPAID",
                    residentSnapshot,
                    additionalData,
                    fiscalSnapshot,
                    totalAmount: grandTotal,
                    isPaid: false,
                    processedBy: user.name || user.email,
                },
            });

            await tx.ticketHeader.updateMany({
                where: { id: { in: ticketIds } },
                data: {
                    transactionId: newTransaction.id,
                    isPaid: false,
                    status: "UNPAID",
                },
            });

            return newTransaction;
        });

        revalidatePath("/admin/poso/tickets");
        revalidatePath("/admin/treasury/payments");

        return { success: true, transaction: result, count: tickets.length, grandTotal };
    } catch (error: any) {
        console.error("Failed to process batch tickets settlement:", error);
        return { success: false, error: error.message || "Failed to process batch tickets settlement." };
    }
}

export async function markTicketAsSettled(id: string) {
    try {
        await verifyAdminOrStaff();

        const ticket = await (prisma as any).ticketHeader.findUnique({
            where: { id },
        });

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        const now = new Date();
        const updatedTicket = await (prisma as any).ticketHeader.update({
            where: { id },
            data: {
                status: "SETTLED",
                isReleased: true,
                releasedAt: now,
            },
        });

        if (ticket.transactionId) {
            await (prisma as any).transaction.update({
                where: { id: ticket.transactionId },
                data: {
                    status: "RELEASED",
                },
            }).catch(() => null);
        }

        revalidatePath("/admin/poso/tickets");
        revalidatePath(`/admin/poso/tickets/${id}`);

        return { success: true, ticket: updatedTicket };
    } catch (error: any) {
        console.error("Failed to mark ticket as settled:", error);
        return { success: false, error: error.message || "Failed to mark ticket as settled." };
    }
}

export async function getVehicleClassifications(onlyActive: boolean = true) {
    try {
        await verifyAdminOrStaff();
        const where = onlyActive ? { isActive: true } : {};
        const list = await (prisma as any).vehicleClassification.findMany({
            where,
            orderBy: { code: "asc" },
        });
        return { success: true, classifications: JSON.parse(JSON.stringify(list)) };
    } catch (error: any) {
        console.error("Failed to fetch vehicle classifications:", error);
        return { success: false, error: error.message || "Failed to fetch vehicle classifications." };
    }
}

export async function addVehicleClassification(formData: FormData) {
    try {
        await verifyAdminOrStaff();
        const code = (formData.get("code") as string)?.trim().toUpperCase();
        const className = (formData.get("className") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || null;
        const impoundFee = parseFloat((formData.get("impoundFee") as string) || "0");

        if (!code || !className) {
            return { success: false, error: "Classification code and name are required." };
        }

        const newClass = await (prisma as any).vehicleClassification.create({
            data: {
                code,
                className,
                description,
                impoundFee,
                isActive: true,
            },
        });

        revalidatePath("/admin/poso/vehicle-classes");
        return { success: true, classification: newClass };
    } catch (error: any) {
        console.error("Failed to add vehicle classification:", error);
        return { success: false, error: error.message || "Failed to add vehicle classification." };
    }
}

export async function updateVehicleClassification(formData: FormData) {
    try {
        await verifyAdminOrStaff();
        const id = formData.get("id") as string;
        const className = (formData.get("className") as string)?.trim();
        const description = (formData.get("description") as string)?.trim() || null;
        const impoundFee = parseFloat((formData.get("impoundFee") as string) || "0");

        if (!id || !className) {
            return { success: false, error: "ID and class name are required." };
        }

        const updatedClass = await (prisma as any).vehicleClassification.update({
            where: { id },
            data: {
                className,
                description,
                impoundFee,
            },
        });

        revalidatePath("/admin/poso/vehicle-classes");
        return { success: true, classification: updatedClass };
    } catch (error: any) {
        console.error("Failed to update vehicle classification:", error);
        return { success: false, error: error.message || "Failed to update vehicle classification." };
    }
}

export async function toggleVehicleClassificationStatus(id: string, isActive: boolean) {
    try {
        await verifyAdminOrStaff();
        const updatedClass = await (prisma as any).vehicleClassification.update({
            where: { id },
            data: { isActive },
        });

        revalidatePath("/admin/poso/vehicle-classes");
        return { success: true, classification: updatedClass };
    } catch (error: any) {
        console.error("Failed to toggle vehicle classification status:", error);
        return { success: false, error: error.message || "Failed to toggle status." };
    }
}

export async function updateTicketImpoundStatus({
    ticketId,
    isImpounded,
    vehicleClass,
    impoundYard,
    impoundFee,
}: {
    ticketId: string;
    isImpounded: boolean;
    vehicleClass?: string | null;
    impoundYard?: string | null;
    impoundFee?: number;
}) {
    try {
        await verifyAdminOrStaff();
        const updatedTicket = await (prisma as any).ticketHeader.update({
            where: { id: ticketId },
            data: {
                isImpounded,
                vehicleClass: vehicleClass || null,
                impoundYard: isImpounded ? (impoundYard || "Mapandan POSO Impounding Yard") : null,
                impoundedAt: isImpounded ? new Date() : null,
                impoundFee: isImpounded ? (impoundFee || 0) : 0,
            },
        });

        revalidatePath("/admin/poso/tickets");
        revalidatePath(`/admin/poso/tickets/${ticketId}`);
        return { success: true, ticket: updatedTicket };
    } catch (error: any) {
        console.error("Failed to update ticket impound status:", error);
        return { success: false, error: error.message || "Failed to update impound status." };
    }
}

// ----------------------------------------
// POSO OFFICERS MANAGEMENT ACTIONS
// ----------------------------------------

export async function getPosoOfficers({
    page = 1,
    pageSize = 10,
    search = "",
}: {
    page?: number;
    pageSize?: number;
    search?: string;
} = {}) {
    try {
        await verifyAdminOrStaff();
        const skip = (page - 1) * pageSize;
        const where: any = {
            role: "POSO_OFFICER",
        };

        if (search.trim()) {
            where.OR = [
                { name: { contains: search.trim(), mode: "insensitive" } },
                { email: { contains: search.trim(), mode: "insensitive" } },
            ];
        }

        const [officers, totalCount] = await Promise.all([
            (prisma as any).user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    isEmailVerified: true,
                    department: true,
                    createdAt: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
            }),
            (prisma as any).user.count({ where }),
        ]);

        return { success: true, officers, totalCount };
    } catch (error: any) {
        console.error("Failed to fetch POSO officers:", error);
        return { success: false, error: error.message || "Failed to fetch POSO officers." };
    }
}

export async function addPosoOfficer(formData: FormData) {
    try {
        await verifyAdminOrStaff();
        const name = (formData.get("name") as string)?.trim();
        const email = (formData.get("email") as string)?.trim()?.toLowerCase();
        const password = (formData.get("password") as string)?.trim();

        if (!name || !email || !password) {
            return { success: false, error: "Name, Email, and Password are required." };
        }

        const existingUser = await (prisma as any).user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return { success: false, error: "User with this email already exists." };
        }

        const bcrypt = await import("bcryptjs");
        const hashedPassword = await bcrypt.hash(password, 10);

        const now = new Date();
        const newOfficer = await (prisma as any).user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "POSO_OFFICER",
                department: "POSO",
                isEmailVerified: true,
                emailVerified: now,
                isPasswordChanged: true,
            },
        });

        revalidatePath("/admin/poso/officers");
        return { success: true, officer: newOfficer };
    } catch (error: any) {
        console.error("Failed to create POSO officer:", error);
        return { success: false, error: error.message || "Failed to create POSO officer account." };
    }
}

export async function updatePosoOfficer(id: string, formData: FormData) {
    try {
        await verifyAdminOrStaff();
        const name = (formData.get("name") as string)?.trim();
        const email = (formData.get("email") as string)?.trim()?.toLowerCase();
        const password = (formData.get("password") as string)?.trim();

        if (!name || !email) {
            return { success: false, error: "Name and Email are required." };
        }

        const existingUser = await (prisma as any).user.findFirst({
            where: {
                email,
                NOT: { id },
            },
        });

        if (existingUser) {
            return { success: false, error: "Another user with this email already exists." };
        }

        const dataToUpdate: any = {
            name,
            email,
        };

        if (password) {
            const bcrypt = await import("bcryptjs");
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        const updatedOfficer = await (prisma as any).user.update({
            where: { id },
            data: dataToUpdate,
        });

        revalidatePath("/admin/poso/officers");
        return { success: true, officer: updatedOfficer };
    } catch (error: any) {
        console.error("Failed to update POSO officer:", error);
        return { success: false, error: error.message || "Failed to update POSO officer account." };
    }
}

export async function deletePosoOfficer(id: string) {
    try {
        await verifyAdminOrStaff();
        await (prisma as any).user.delete({
            where: { id },
        });
        revalidatePath("/admin/poso/officers");
        return { success: true };
    } catch (error: any) {
        console.error("Failed to delete POSO officer:", error);
        return { success: false, error: error.message || "Failed to delete POSO officer account." };
    }
}

// ----------------------------------------
// POSO ENFORCER LEADERBOARD ACTIONS
// ----------------------------------------

export async function getEnforcerLeaderboard({
    fromDate,
    toDate,
    sortBy = "ALL",
}: {
    fromDate?: string;
    toDate?: string;
    sortBy?: "ALL" | "TICKETS" | "AMOUNT";
} = {}) {
    try {
        await verifyAdminOrStaff();

        const where: any = {};

        if (fromDate || toDate) {
            where.dateTime = {};
            if (fromDate) {
                where.dateTime.gte = new Date(`${fromDate}T00:00:00.000Z`);
            }
            if (toDate) {
                where.dateTime.lte = new Date(`${toDate}T23:59:59.999Z`);
            }
        }

        const tickets = await (prisma as any).ticketHeader.findMany({
            where,
            select: {
                id: true,
                ticketNo: true,
                officerName: true,
                badgeNo: true,
                officerUserId: true,
                totalAmount: true,
                impoundFee: true,
                isImpounded: true,
                isPaid: true,
                dateTime: true,
            },
        });

        const map = new Map<string, {
            officerName: string;
            badgeNo: string;
            totalTickets: number;
            totalAmount: number;
            paidTickets: number;
            unpaidTickets: number;
        }>();

        for (const t of tickets) {
            const key = (t.officerName || "POSO Enforcer").trim();
            const badgeNo = t.badgeNo || "POSO-001";
            const ticketTotal = (t.totalAmount || 0) + (t.isImpounded ? (t.impoundFee || 0) : 0);

            if (!map.has(key)) {
                map.set(key, {
                    officerName: key,
                    badgeNo,
                    totalTickets: 0,
                    totalAmount: 0,
                    paidTickets: 0,
                    unpaidTickets: 0,
                });
            }

            const record = map.get(key)!;
            record.totalTickets += 1;
            record.totalAmount += ticketTotal;
            if (t.isPaid) {
                record.paidTickets += 1;
            } else {
                record.unpaidTickets += 1;
            }
        }

        const list = Array.from(map.values()).map((officer) => ({
            ...officer,
            settlementRate: officer.totalTickets > 0
                ? Math.round((officer.paidTickets / officer.totalTickets) * 100)
                : 0,
        }));

        list.sort((a, b) => {
            if (sortBy === "TICKETS") {
                if (b.totalTickets !== a.totalTickets) return b.totalTickets - a.totalTickets;
                return b.totalAmount - a.totalAmount;
            } else if (sortBy === "AMOUNT") {
                if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
                return b.totalTickets - a.totalTickets;
            } else {
                if (b.totalTickets !== a.totalTickets) return b.totalTickets - a.totalTickets;
                return b.totalAmount - a.totalAmount;
            }
        });

        const leaderboard = list.map((item, index) => ({
            rank: index + 1,
            ...item,
        }));

        const totalCitations = tickets.length;
        const totalRevenue = tickets.reduce((sum: number, t: any) => sum + (t.totalAmount || 0) + (t.isImpounded ? (t.impoundFee || 0) : 0), 0);
        const topOfficer = leaderboard.length > 0 ? leaderboard[0].officerName : "N/A";

        return {
            success: true,
            leaderboard: JSON.parse(JSON.stringify(leaderboard)),
            summary: {
                totalCitations,
                totalRevenue,
                topOfficer,
                officersCount: leaderboard.length,
            },
        };
    } catch (error: any) {
        console.error("Failed to fetch enforcer leaderboard:", error);
        return { success: false, error: error.message || "Failed to fetch leaderboard." };
    }
}
