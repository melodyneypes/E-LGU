import React from "react";
import { Metadata } from "next";
import BedMonitoringClient from "./BedMonitoringClient";
import { getRHUBeds } from "./actions";
import { getRHUHealthCenters } from "../centers/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMatchedCenterForUser } from "../actions";

export const metadata: Metadata = {
    title: "RHU – Hospital Bed Monitoring | E-LGU Admin",
    description: "Monitor real-time bed availability and occupancy across the RHU and all municipal health centers. Ensure efficient patient flow and better resource management.",
};

export default async function RHUBedsPage() {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;
    const matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;

    const [bedsRes, centersRes] = await Promise.all([
        getRHUBeds({
            facilityType: "ALL",
            sessionUser: currentUser,
            matchedCenter: matchedCenter
        }),
        getRHUHealthCenters()
    ]);

    const initialBeds = bedsRes.success && bedsRes.data ? bedsRes.data : [];
    const initialCenters = centersRes.success && centersRes.data ? centersRes.data : [];

    return (
        <BedMonitoringClient
            initialBeds={initialBeds}
            initialCenters={initialCenters}
            currentUser={currentUser}
            matchedCenter={matchedCenter}
        />
    );
}
