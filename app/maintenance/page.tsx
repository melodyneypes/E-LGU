import { getMultipleSystemSettings } from "@/lib/settings";
import * as React from "react";
import { MaintenanceClient } from "./MaintenanceClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
    const settings = await getMultipleSystemSettings([
        "site_logo",
        "brand_word_1",
        "brand_word_2",
        "theme_color",
        "maintenance_mode",
        "maintenance_mode_updated_at"
    ]);

    const isMaintenance = settings.get("maintenance_mode") === "true";
    if (!isMaintenance) {
        redirect("/");
    }

    const brandWord1 = settings.get("brand_word_1") || "E";
    const brandWord2 = settings.get("brand_word_2") || "";
    const themeColor = settings.get("theme_color") || "#2563eb";
    const logoUrl = settings.get("site_logo");
    const maintenanceUpdatedAt = settings.get("maintenance_mode_updated_at") || "0";

    return (
        <MaintenanceClient 
            brandWord1={brandWord1}
            brandWord2={brandWord2}
            themeColor={themeColor}
            logoUrl={logoUrl}
            maintenanceUpdatedAt={maintenanceUpdatedAt}
        />
    );
}
