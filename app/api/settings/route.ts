import { NextResponse } from "next/server";
import { getMultipleSystemSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    try {
        const settings = await getMultipleSystemSettings([
            "site_logo",
            "brand_word_1",
            "brand_word_2",
            "theme_color"
        ]);

        return NextResponse.json({
            logoUrl: settings.get("site_logo") || "",
            brand1: settings.get("brand_word_1") || "E-",
            brand2: settings.get("brand_word_2") || "LGU",
            themeColor: settings.get("theme_color") || "#2563eb",
        });
    } catch (error) {
        console.error("Settings API error:", error);
        return NextResponse.json({
            logoUrl: "",
            brand1: "E-",
            brand2: "LGU",
            themeColor: "#2563eb",
        }, { status: 200 });
    }
}
