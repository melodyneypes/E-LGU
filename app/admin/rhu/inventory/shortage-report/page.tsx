import React from "react";
import ShortageReportClient from "./ShortageReportClient";
import { getRHUInventoryItems } from "../actions";
import { getRHUHealthCenters } from "../../centers/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMatchedCenterForUser } from "../../actions";

export const metadata = {
    title: "Medicine Shortage Report | E-LGU Admin",
    description: "Monitor medicines with low or no stock across RHU and health centers. Ensure continuous availability of essential medicines for better healthcare service.",
};

export default async function ShortageReportPage() {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;
    const matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;

    const [itemsRes, centersRes] = await Promise.all([
        getRHUInventoryItems({
            healthCenterId: matchedCenter ? matchedCenter.id : undefined,
            sessionUser: currentUser,
            matchedCenter: matchedCenter
        }),
        getRHUHealthCenters()
    ]);

    const initialItems = itemsRes.success && itemsRes.data ? itemsRes.data : [];
    const initialCenters = centersRes.success && centersRes.data ? centersRes.data : [];

    return (
        <ShortageReportClient
            initialItems={initialItems}
            initialCenters={initialCenters}
            currentUser={currentUser}
            matchedCenter={matchedCenter}
        />
    );
}
