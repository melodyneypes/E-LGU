import React from "react";
import { Metadata } from "next";
import EquipmentClient from "./EquipmentClient";
import { getRHUEquipmentData } from "./actions";

export const metadata: Metadata = {
    title: "RHU Medical Equipment & Stockroom Monitoring | EMapandan",
    description: "RHU & BHS Medical Equipment, Room & Stockroom Monitoring System with PO, SO, RO, Discrepancy Returns, and COA Reports.",
};

export default async function RHUEquipmentPage() {
    const data = await getRHUEquipmentData("ALL");

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full max-w-full">
            <EquipmentClient
                initialAssets={data.assets || []}
                initialCatalogItems={data.catalogItems || []}
                initialStockroomAssets={data.stockroomAssets || []}
                initialPOs={data.pos || []}
                initialROs={data.ros || []}
                initialSOs={data.sos || []}
                initialReturns={data.returns || []}
                initialCenters={data.centers || []}
                matchedCenter={data.matchedCenter || null}
                isReadOnly={Boolean(data.isReadOnly)}
                isGlobalAdmin={Boolean(data.isGlobalAdmin)}
                canDispatchSO={Boolean(data.canDispatchSO)}
            />
        </div>
    );
}
