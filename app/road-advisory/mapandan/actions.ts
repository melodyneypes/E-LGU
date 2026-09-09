"use server";

import db from "@/lib/db/prisma";
const prisma = db as any;
import { getMultipleSystemSettings } from "@/lib/settings";

export async function getPublicRoadAdvisoriesAction() {
    try {
        const advisories = await prisma.roadClosure.findMany({
            where: {
                isActive: true,
            },
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                severity: true,
                barangay: true,
                roadName: true,
                startLocation: true,
                endLocation: true,
                routeCoordinates: true,
                detourAdvice: true,
                startDate: true,
                endDate: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: [
                { startDate: "desc" }
            ],
        });

        return { 
            success: true, 
            data: JSON.parse(JSON.stringify(advisories)) 
        };
    } catch (error: any) {
        console.error("[getPublicRoadAdvisoriesAction] Error:", error);
        return { success: false, error: error.message || "Failed to load road advisories", data: [] };
    }
}

export async function getPublicRoadAdvisorySettingsAction() {
    try {
        const settingsMap = await getMultipleSystemSettings([
            "site_logo",
            "poso_location",
            "poso_hotline",
            "poso_operating_hour",
            "poso_official_email",
            "mdrrmo_hotline",
            "police_hotline",
        ]);

        return {
            siteLogo: settingsMap.get("site_logo") || "",
            location: settingsMap.get("poso_location") || "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan",
            hotline: settingsMap.get("mdrrmo_hotline") || settingsMap.get("poso_hotline") || "(075) 529-XXXX / +63 917 123 4567",
            policeHotline: settingsMap.get("police_hotline") || "0998 598 5143",
            email: settingsMap.get("poso_official_email") || "mdrrmo@mapandan.gov.ph",
        };
    } catch (error) {
        console.error("[getPublicRoadAdvisorySettingsAction] Error:", error);
        return {
            siteLogo: "",
            location: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan",
            hotline: "(075) 529-XXXX / +63 917 123 4567",
            policeHotline: "0998 598 5143",
            email: "mdrrmo@mapandan.gov.ph",
        };
    }
}
