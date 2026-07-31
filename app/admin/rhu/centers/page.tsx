import React from "react";
import RHUCentersClient from "./RHUCentersClient";
import { getRHUHealthCenters, getRHUMedicalPersonnel } from "./actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata = {
    title: "Health Centers & Stations | RHU Admin",
    description: "Manage health centers, sub-stations, medical personnel, and services across Mapandan"
};

export default async function RHUCentersPage() {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;

    const centersRes = await getRHUHealthCenters();
    const personnelRes = await getRHUMedicalPersonnel();

    let initialCenters = centersRes.success && centersRes.data ? centersRes.data : [];
    let initialPersonnel = personnelRes.success && personnelRes.data ? personnelRes.data : [];

    const isCenterAdmin = currentUser?.role === "RHU_CENTER_ADMIN";

    if (isCenterAdmin && currentUser) {
        // Filter health centers strictly to the one assigned to this admin user
        const matchedCenter = initialCenters.find((c: any) =>
            (c.userId && String(c.userId) === String(currentUser.id)) ||
            (c.accountEmail && currentUser.email && String(c.accountEmail).toLowerCase() === String(currentUser.email).toLowerCase()) ||
            (currentUser.email && String(currentUser.email).toLowerCase().includes("lalas") && String(c.name).toLowerCase().includes("lalas")) ||
            (currentUser.email && String(currentUser.email).toLowerCase().includes("main") && String(c.name).toLowerCase().includes("main"))
        );

        if (matchedCenter) {
            initialCenters = [matchedCenter];
            initialPersonnel = initialPersonnel.filter((p: any) => p.healthCenterId === matchedCenter.id);
        } else if (currentUser.managedBarangay) {
            initialCenters = initialCenters.filter((c: any) => c.barangay === currentUser.managedBarangay);
            const validCenterIds = new Set(initialCenters.map((c: any) => c.id));
            initialPersonnel = initialPersonnel.filter((p: any) => validCenterIds.has(p.healthCenterId));
        } else {
            initialCenters = [];
            initialPersonnel = [];
        }
    }

    return (
        <div className="p-6 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-950">
            <RHUCentersClient
                initialCenters={initialCenters}
                initialPersonnel={initialPersonnel}
                currentUser={currentUser}
                isCenterAdmin={isCenterAdmin}
            />
        </div>
    );
}
