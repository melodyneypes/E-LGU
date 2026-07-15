import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BploSettingsClient } from "./BploSettingsClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

// BPLO Global Calculator settings route
export default async function BploSettingsPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || user.role !== "ADMIN" || user.department?.toUpperCase() !== "LGU") {
        redirect("/admin/dashboard");
    }

    // Retrieve calculator settings
    const settingsList = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    "bplo_tax_rate_new",
                    "bplo_health_card_fee",
                    "bplo_retail_tax_rate_low",
                    "bplo_retail_tax_rate_high",
                    "bplo_manufacturer_tax_rate",
                    "bplo_wholesaler_tax_rate",
                    "bplo_mayors_permit_matrix",
                    "bplo_sanitary_fee_matrix",
                    "bplo_garbage_fee_matrix",
                    "bplo_mayors_tax_clearance_fee"
                ]
            }
        }
    });

    const settingsMap: Record<string, string> = {};
    settingsList.forEach(s => {
        settingsMap[s.key] = s.value;
    });

    const defaultMayorsPermitMatrix = JSON.stringify({
        "Manufacturers/Importers/Producers": { "MICRO": 400.00, "SMALL": 600.00, "MEDIUM": 1100.00, "LARGE": 2100.00 },
        "Banks (Universal)": { "MICRO": 0, "SMALL": 0, "MEDIUM": 0, "LARGE": 5100.00 },
        "Banks (Commercial/Development)": { "MICRO": 0, "SMALL": 0, "MEDIUM": 0, "LARGE": 3100.00 },
        "Banks (Rural/Thrift/Savings)": { "MICRO": 0, "SMALL": 0, "MEDIUM": 0, "LARGE": 1600.00 },
        "Other Financial Institutions": { "MICRO": 1100.00, "SMALL": 1600.00, "MEDIUM": 3100.00, "LARGE": 5100.00 },
        "Contractors/Service Establishments": { "MICRO": 500.00, "SMALL": 900.00, "MEDIUM": 1100.00, "LARGE": 1600.00 },
        "Wholesalers/Retailers/Dealers": { "MICRO": 500.00, "SMALL": 900.00, "MEDIUM": 1100.00, "LARGE": 1600.00 },
        "Other Businesses": { "MICRO": 500.00, "SMALL": 700.00, "MEDIUM": 900.00, "LARGE": 1100.00 }
    }, null, 2);

    const defaultSanitaryFeeMatrix = JSON.stringify([
        { "minArea": 1000, "fee": 350.00 },
        { "minArea": 500, "fee": 300.00 },
        { "minArea": 200, "fee": 250.00 },
        { "minArea": 100, "fee": 200.00 },
        { "minArea": 50, "fee": 150.00 },
        { "minArea": 25, "fee": 100.00 }
    ], null, 2);

    const defaultGarbageFeeMatrix = JSON.stringify({
        "manufacturers": { "threshold": 100, "low": 1500.00, "high": 2500.00 },
        "hotels": { "threshold": 100, "low": 1000.00, "high": 1500.00 },
        "restaurants": { "threshold": 50, "low": 1000.00, "high": 2000.00 },
        "hospitals": { "threshold": 10, "low": 1000.00, "high": 1500.00 },
        "others": { "threshold": 10, "low": 800.00, "high": 1200.00 }
    }, null, 2);

    // Provide baseline fallback defaults
    const defaults = {
        bplo_tax_rate_new: "0.0005", // 0.05%
        bplo_health_card_fee: "100.00",
        bplo_mayors_tax_clearance_fee: "85.00",
        bplo_retail_tax_rate_low: "0.022", // 2.2%
        bplo_retail_tax_rate_high: "0.011", // 1.1%
        bplo_manufacturer_tax_rate: "0.004125", // 0.4125%
        bplo_wholesaler_tax_rate: "0.0055", // 0.55%
        bplo_mayors_permit_matrix: defaultMayorsPermitMatrix,
        bplo_sanitary_fee_matrix: defaultSanitaryFeeMatrix,
        bplo_garbage_fee_matrix: defaultGarbageFeeMatrix
    };

    const finalSettings = { ...defaults, ...settingsMap };

    // Get theme color
    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    return (
        <div className="p-8">
            <Suspense fallback={<div>Loading BPLO Settings...</div>}>
                <BploSettingsClient initialSettings={finalSettings} themeColor={themeColor} />
            </Suspense>
        </div>
    );
}
