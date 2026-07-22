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
    paymentStatus = "All",
}: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    paymentStatus?: string;
}) {
    try {
        await verifyAdminOrStaff();
        const skip = (page - 1) * pageSize;
        const where: any = {};

        if (status !== "All") {
            where.status = status;
        }

        if (paymentStatus !== "All") {
            where.paymentStatus = paymentStatus;
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
                    paymentStatus: true,
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
        const ticket = await (prisma as any).ticketHeader.findUnique({
            where: { id },
            include: {
                ticketDetails: {
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
            return { success: false, error: "Ticket not found." };
        }

        return { success: true, ticket };
    } catch (error: any) {
        console.error("Failed to fetch ticket details:", error);
        return { success: false, error: error.message || "Failed to fetch ticket details." };
    }
}

export async function updateTicketStatus(id: string, status: string, paymentStatus?: string) {
    try {
        await verifyAdminOrStaff();
        const dataToUpdate: any = { status };
        if (paymentStatus) {
            dataToUpdate.paymentStatus = paymentStatus;
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

