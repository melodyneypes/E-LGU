import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getPosoPenaltySettings } from "@/app/admin/poso/actions";
import { getPosoPortalSettings } from "@/app/poso/mapandan/actions";
import PosoSettingsClient from "./PosoSettingsClient";

export const metadata: Metadata = {
    title: "POSO Settings | Mapandan Portal",
    description: "System settings, late payment surcharges, and public portal office info configuration for POSO.",
};

export default async function PosoSettingsPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const isLguAdmin = user?.role === "ADMIN" && (user?.department === "LGU" || !user?.department);
    const isPosoStaff = user?.role === "ADMIN" || user?.department === "POSO";

    if (!user || (!isLguAdmin && !isPosoStaff)) {
        redirect("/admin/dashboard");
    }

    const [settingsRes, portalInfoRes] = await Promise.all([
        getPosoPenaltySettings(),
        getPosoPortalSettings(),
    ]);

    const initialSettings = settingsRes.settings || { dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 };

    return (
        <PosoSettingsClient
            initialSettings={initialSettings}
            initialPortalInfo={portalInfoRes}
        />
    );
}
