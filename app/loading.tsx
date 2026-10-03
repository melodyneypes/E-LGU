import React from "react";
import { getMultipleSystemSettings } from "@/lib/settings";
import LoadingClientBody from "@/app/LoadingClientBody";

export default async function Loading() {
    let logoUrl = "";
    let brand1 = "E-";
    let brand2 = "LGU";
    let themeColor = "#2563eb";

    try {
        // 1. Fetch live branding from Admin Settings
        const settings = await getMultipleSystemSettings([
            "site_logo",
            "brand_word_1",
            "brand_word_2",
            "theme_color"
        ]);

        logoUrl = settings.get("site_logo") || "";
        brand1 = settings.get("brand_word_1") || "E-";
        brand2 = settings.get("brand_word_2") || "LGU";
        themeColor = settings.get("theme_color") || "#2563eb";
    } catch {
        // Safe fallback if database is briefly unreachable during transient reconnects
    }

    // 2. Delegate to Client Component for animations and forced duration
    return (
        <LoadingClientBody 
            logoUrl={logoUrl} 
            brand1={brand1} 
            brand2={brand2} 
            themeColor={themeColor}
        />
    );
}
