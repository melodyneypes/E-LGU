"use server";

import db from "@/lib/db/prisma";
const prisma = db as any;
import lguConfig from "@/config/lgu.config.json";

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
    return {
        siteLogo: lguConfig.assets.logo,
        location: lguConfig.poso.address,
        hotline: lguConfig.poso.hotline,
        policeHotline: lguConfig.contact.hotlines.police,
        email: lguConfig.poso.email,
    };
}
