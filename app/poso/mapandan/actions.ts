"use server";

import prisma from "@/lib/db/prisma";
import { getPosoPenaltySettings, calculatePosoTicketPenalty, POSOPenaltyBreakdown } from "@/app/admin/poso/actions";
import { getMultipleSystemSettings } from "@/lib/settings";

export async function getPosoPortalSettings() {
    try {
        const settingsMap = await getMultipleSystemSettings([
            "site_logo",
            "poso_location",
            "poso_hotline",
            "poso_operating_hour",
            "poso_official_email",
            "poso_email",
            "poso_hours",
            "poso_facebook"
        ]);

        return {
            siteLogo: settingsMap.get("site_logo") || "",
            posoLocation: settingsMap.get("poso_location") || "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
            posoHotline: settingsMap.get("poso_hotline") || "(075) 529-XXXX / +63 917 123 4567",
            posoEmail: settingsMap.get("poso_official_email") || settingsMap.get("poso_email") || "poso@mapandan.gov.ph",
            posoHours: settingsMap.get("poso_operating_hour") || settingsMap.get("poso_hours") || "Monday - Friday: 8:00 AM - 5:00 PM",
            posoFacebook: settingsMap.get("poso_facebook") || "https://facebook.com/MapandanPOSO",
        };
    } catch (error) {
        console.error("Failed to fetch POSO portal settings:", error);
        return {
            siteLogo: "",
            posoLocation: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
            posoHotline: "(075) 529-XXXX / +63 917 123 4567",
            posoEmail: "poso@mapandan.gov.ph",
            posoHours: "Monday - Friday: 8:00 AM - 5:00 PM",
            posoFacebook: "https://facebook.com/MapandanPOSO",
        };
    }
}

export async function getAllTrafficViolations() {
    try {
        const violations = await (prisma as any).trafficViolation.findMany({
            where: { isActive: true },
            orderBy: { violationName: "asc" },
        });

        return { success: true, violations: JSON.parse(JSON.stringify(violations)) };
    } catch (error: any) {
        console.error("Failed to fetch traffic violations:", error);
        return { success: false, violations: [] };
    }
}

export async function getTrafficViolationById(id: string) {
    try {
        const violation = await (prisma as any).trafficViolation.findUnique({
            where: { id },
        });

        if (!violation) {
            return { success: false, error: "Traffic Violation Ordinance record not found." };
        }

        return { success: true, violation: JSON.parse(JSON.stringify(violation)) };
    } catch (error: any) {
        console.error("Failed to fetch traffic violation by ID:", error);
        return { success: false, error: error.message || "Failed to load traffic violation record." };
    }
}

export async function searchPublicTicket(query: string) {
    try {
        const cleanQuery = query.trim();
        if (!cleanQuery) {
            return { success: false, error: "Please enter a valid Citation Ticket Number, License No., or Plate No." };
        }

        // Search strictly by ticketNo only
        const ticket = await (prisma as any).ticketHeader.findFirst({
            where: {
                ticketNo: { equals: cleanQuery, mode: "insensitive" },
            },
            include: {
                details: {
                    include: {
                        violation: true,
                    },
                },
                ticketPhotos: true,
            },
            orderBy: { createdAt: "desc" },
        });

        if (!ticket) {
            return { success: false, error: `No POSO Citation Ticket found for "${cleanQuery}". Please check the ticket number and try again.` };
        }

        // Fetch optional transaction safely if transactionId is present
        if (ticket.transactionId) {
            try {
                const tx = await (prisma as any).transaction.findUnique({
                    where: { id: ticket.transactionId },
                    include: { payment: true },
                });
                if (tx) {
                    ticket.transaction = tx;
                }
            } catch { /* silent fallback if transactionId is dangling */ }
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
