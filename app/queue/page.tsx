import React from "react";
import { getMultipleSystemSettings } from "@/lib/settings";
import QueueClient from "./QueueClient";
import { getActiveQueueData } from "./actions";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
    const settings = await getMultipleSystemSettings(["theme_color", "site_logo", "brand_word_1", "brand_word_2"]);
    const themeColor = settings.get("theme_color") || "#2563eb";
    const branding = {
        logo: settings.get("site_logo") || null,
        word1: settings.get("brand_word_1") || "E-",
        word2: settings.get("brand_word_2") || "LGU",
    };

    const initialQueueData = await getActiveQueueData();

    return (
        <QueueClient
            themeColor={themeColor}
            branding={branding}
            initialQueueData={initialQueueData}
        />
    );
}
