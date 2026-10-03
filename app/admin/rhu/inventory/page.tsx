import React from "react";
import RHUInventoryClient from "./RHUInventoryClient";
import { getRHUInventoryItems } from "./actions";
import { getRHUHealthCenters } from "../centers/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMatchedCenterForUser } from "../actions";

export const metadata = {
    title: "RHU Inventory & Pharmacy | E-LGU Admin",
    description: "Manage medicine catalog, center allocations, multi-batch delivery shipments, stock levels, and FEFO expiration dates.",
};

export default async function RHUInventoryPage() {
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
        <RHUInventoryClient
            initialItems={initialItems as any}
            initialCenters={initialCenters as any}
            currentUser={currentUser}
            matchedCenter={matchedCenter}
        />
    );
}
