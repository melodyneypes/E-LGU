import React from "react";
import RHUInventoryClient from "./RHUInventoryClient";
import { getRHUInventoryItems } from "./actions";

export const metadata = {
    title: "RHU Inventory | EMapandan Admin",
    description: "Manage medicines and medical supplies inventory for the Rural Health Unit.",
};

export default async function RHUInventoryPage() {
    const res = await getRHUInventoryItems();
    const initialItems = res.success && res.data ? res.data : [];

    return (
        <RHUInventoryClient initialItems={initialItems as any} />
    );
}
