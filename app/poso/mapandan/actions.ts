"use server";

import prisma from "@/lib/db/prisma";
import { getPosoPenaltySettings, calculatePosoTicketPenalty, POSOPenaltyBreakdown } from "@/app/admin/poso/actions";

export async function searchPublicTicket(query: string) {
    try {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return { success: false, error: "Please enter a valid Citation Ticket Number, License No., or Plate No." };
        }

        // Try match on TicketNo, PlateNo, or LicenseNo
        const ticket = await (prisma as any).ticketHeader.findFirst({
            where: {
                OR: [
                    { ticketNo: { equals: cleanQuery, mode: "insensitive" } },
                    { plateNo: { equals: cleanQuery, mode: "insensitive" } },
                    { licenseNo: { equals: cleanQuery, mode: "insensitive" } },
                ],
            },
            include: {
                details: true,
                ticketPhotos: true,
                transaction: {
                    include: {
                        payment: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!ticket) {
            return { success: false, error: `No POSO Citation Ticket found for "${cleanQuery}". Please check the ticket number and try again.` };
        }

        // Fetch POSO penalty settings and calculate overdue penalty breakdown
        const settingsRes = await getPosoPenaltySettings();
        const settings = settingsRes.settings || { dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 };
        const penaltyBreakdown: POSOPenaltyBreakdown = await calculatePosoTicketPenalty(ticket, settings);

        return {
            success: true,
            ticket: JSON.parse(JSON.stringify(ticket)),
            penaltyBreakdown: JSON.parse(JSON.stringify(penaltyBreakdown)),
            settings,
        };
    } catch (error: any) {
        console.error("Public POSO Ticket Search Error:", error);
        return { success: false, error: error.message || "An unexpected error occurred while looking up ticket details." };
    }
}
