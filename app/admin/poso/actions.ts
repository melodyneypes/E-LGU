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

export async function getTickets({
    page = 1,
    pageSize = 10,
    search = "",
    status = "All",
    isPaid = "All",
}: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    isPaid?: string;
}) {
    try {
        await verifyAdminOrStaff();
        const skip = (page - 1) * pageSize;
        const where: any = {};

        if (status !== "All") {
            where.status = status;
        }

        if (isPaid !== "All") {
            where.isPaid = isPaid === "PAID" || isPaid === "true";
        }

        if (search.trim()) {
            where.OR = [
                { ticketNo: { contains: search.trim(), mode: "insensitive" } },
                { violatorName: { contains: search.trim(), mode: "insensitive" } },
                { licenseNo: { contains: search.trim(), mode: "insensitive" } },
                { plateNo: { contains: search.trim(), mode: "insensitive" } },
                { officerName: { contains: search.trim(), mode: "insensitive" } },
            ];
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
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: pageSize,
            }),
            (prisma as any).ticketHeader.count({ where }),
        ]);

        return { success: true, tickets, totalCount };
    } catch (error: any) {
        console.error("Failed to fetch POSO tickets:", error);
        return { success: false, error: error.message || "Failed to fetch citation tickets." };
    }
}

export async function getTicketById(id: string) {
    try {
        await verifyAdminOrStaff();
        const [ticket, themeSetting] = await Promise.all([
            (prisma as any).ticketHeader.findUnique({
                where: { id },
                include: {
                    details: {
                        include: {
                            violation: true,
                        },
                    },
                    ticketPhotos: true,
                },
            }),
            (prisma as any).systemSetting.findUnique({
                where: { key: "theme_color" },
            }),
        ]);

        if (!ticket) {
            return { success: false, error: "Ticket not found." };
        }

        return { success: true, ticket, themeColor: themeSetting?.value || null };
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
        const totalAmountFined = tickets.reduce((sum: number, t: any) => sum + (t.totalAmount || 0), 0);
        const unpaidCount = tickets.filter((t: any) => !t.isPaid).length;

        return {
            success: true,
            totalCitations,
            totalAmountFined,
            unpaidCount,
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

        const residentSnapshot = {
            fullName: ticket.violatorName || "Unknown Violator",
            licenseNo: ticket.licenseNo || null,
            plateNo: ticket.plateNo || null,
            address: ticket.violatorAddress || null,
            isRegisteredUser: false,
        };

        const impoundFee = ticket.isImpounded ? (ticket.impoundFee || 0) : 0;
        const grandTotal = (ticket.totalAmount || 0) + impoundFee;

        const additionalData = {
            ticketNo: ticket.ticketNo,
            ticketHeaderId: ticket.id,
            location: ticket.location || null,
            officerName: ticket.officerName || null,
            isImpounded: ticket.isImpounded || false,
            vehicleClass: ticket.vehicleClass || null,
            impoundFee: impoundFee,
            violations: (ticket.details || []).map((d: any) => ({
                name: d.violationName,
                level: d.offenseLevel,
                fine: d.amount,
            })),
        };

        const fiscalSnapshot = {
            violationFineTotal: ticket.totalAmount || 0,
            impoundFee: impoundFee,
            totalAmount: grandTotal,
        };

        const result = await (prisma as any).$transaction(async (tx: any) => {
            const newTransaction = await tx.transaction.create({
                data: {
                    userId: user.id,
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

        const newOfficer = await (prisma as any).user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: "POSO_OFFICER",
                department: "POSO",
                isEmailVerified: true,
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

