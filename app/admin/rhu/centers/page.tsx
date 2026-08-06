import React from "react";
import RHUCentersClient from "./RHUCentersClient";
import { getRHUHealthCenters, getRHUMedicalPersonnel } from "./actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMatchedCenterForUser } from "../actions";

export const metadata = {
    title: "Health Centers & Stations | RHU Admin",
    description: "Manage health centers, sub-stations, medical personnel, and services across Mapandan"
};

export default async function RHUCentersPage() {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;

    const matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;
    const isCenterScoped = !!matchedCenter;

    const centersRes = await getRHUHealthCenters();
    const personnelRes = await getRHUMedicalPersonnel();

    const rawCenters = centersRes.success && centersRes.data ? centersRes.data : [];
    let initialCenters = rawCenters;
    let initialPersonnel = personnelRes.success && personnelRes.data ? personnelRes.data : [];
    const totalActiveCentersCount = rawCenters.filter((c: any) => (c.status || "ACTIVE").toUpperCase() === "ACTIVE").length;

    if (matchedCenter) {
        initialCenters = initialCenters.filter((c: any) => c.id === matchedCenter.id);
        initialPersonnel = initialPersonnel.filter((p: any) => p.healthCenterId === matchedCenter.id);
    } else if (currentUser?.managedBarangay) {
        initialCenters = initialCenters.filter((c: any) => c.barangay === currentUser.managedBarangay);
        const validCenterIds = new Set(initialCenters.map((c: any) => c.id));
        initialPersonnel = initialPersonnel.filter((p: any) => validCenterIds.has(p.healthCenterId));
    }

    return (
        <div className="p-6 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-950">
            <RHUCentersClient
                initialCenters={initialCenters}
                initialPersonnel={initialPersonnel}
                currentUser={currentUser}
                isCenterAdmin={isCenterScoped}
                matchedCenter={matchedCenter}
                allActiveCentersCount={totalActiveCentersCount}
            />
        </div>
    );
}
