import React from "react";
import MedicineLedgerClient from "./MedicineLedgerClient";
import { getRHUInventoryItems, getRHUInventoryMovements } from "../actions";
import { getRHUHealthCenters } from "../../centers/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMatchedCenterForUser } from "../../actions";

export const metadata = {
    title: "Medicine Ledger | E-LGU Admin",
    description: "Track all medicine transactions, including purchases, issuances, adjustments, and current stock levels in real time.",
};

export default async function MedicineLedgerPage() {
    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any;
    const matchedCenter = currentUser ? await getMatchedCenterForUser(currentUser) : null;

    const [movementsRes, itemsRes, centersRes] = await Promise.all([
        getRHUInventoryMovements({
            healthCenterId: matchedCenter ? matchedCenter.id : undefined,
            sessionUser: currentUser
        }),
        getRHUInventoryItems({
            healthCenterId: matchedCenter ? matchedCenter.id : undefined,
            sessionUser: currentUser,
            matchedCenter: matchedCenter
        }),
        getRHUHealthCenters()
    ]);

    const initialMovements = movementsRes.success && movementsRes.data ? movementsRes.data : [];
    const initialItems = itemsRes.success && itemsRes.data ? itemsRes.data : [];
    const initialCenters = centersRes.success && centersRes.data ? centersRes.data : [];

    return (
        <MedicineLedgerClient
            initialMovements={initialMovements}
            initialItems={initialItems}
            initialCenters={initialCenters}
            currentUser={currentUser}
            matchedCenter={matchedCenter}
        />
    );
}
