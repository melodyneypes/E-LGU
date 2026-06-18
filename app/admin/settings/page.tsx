import prisma from "@/lib/db/prisma";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";
import { Suspense } from "react";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function SettingsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const managedBarangay = (session?.user as any)?.managedBarangay;
    const isBarangayAdmin = role === "BARANGAY_ADMIN";

    // Sequential fetch to avoid "MaxClientsInSessionMode" error on some DB providers
    const settingsList = await prisma.systemSetting.findMany();
    
    // Filter slides based on role
    const slides = await prisma.heroSlide.findMany({
        where: {
            barangay: isBarangayAdmin ? managedBarangay : null
        } as any,
        orderBy: { order: 'asc' }
    });

    // Convert settings list to a key-value object
     
    const settings = settingsList.reduce((acc: any, curr: { key: string; value: string }) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    // Default section visibility settings if not set
    const defaultSectionSettings = {
        section_dining_lodging: "true",
        section_places_to_visit: "true",
        section_events: "true",
        section_announcements: "true",
        section_lgu_projects: "true",
        section_jobs: "true",
        section_government: "true",
        section_services: "true",
        section_emergency: "true",
        social_facebook: "#",
        social_twitter: "#",
        social_instagram: "#",
        contact_address: "Municipal Hall, Poblacion",
        contact_email: "info@portal.gov.ph",
        contact_phone: "(075) 000-0000",
    };

    // Merge with defaults for any missing settings
    const finalSettings = { ...defaultSectionSettings, ...settings };

    return (
        <div className="p-8">
            <Suspense fallback={<div>Loading Settings...</div>}>
                <SettingsClient
                    settings={finalSettings}
                    slides={slides}
                    role={role}
                    managedBarangay={managedBarangay}
                />
            </Suspense>
        </div>
    );
}
