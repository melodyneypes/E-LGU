import React from "react";
import RHUCentersClient from "./RHUCentersClient";
import { getRHUHealthCenters } from "./actions";

export const metadata = {
    title: "Health Centers & Stations | RHU Admin",
    description: "Manage health centers, sub-stations, and locations across Mapandan"
};

export default async function RHUCentersPage() {
    const res = await getRHUHealthCenters();
    const initialCenters = res.success && res.data ? res.data : [];

    return (
        <div className="p-6 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-950">
            <RHUCentersClient initialCenters={initialCenters} />
        </div>
    );
}
