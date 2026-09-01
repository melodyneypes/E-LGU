import * as React from "react";
import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import ServicesClient from "./ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
    const settings = await getMultipleSystemSettings([
        "theme_color",
    ]);
    const themeColor = settings.get("theme_color") || "#2563eb";

    const transactionTypes = await prisma.transactionType.findMany({
        where: {
            isActive: true,
            AND: [
                { category: { not: "POSO" } },
                { code: { not: { startsWith: "POSO" } } }
            ]
        },
        orderBy: { name: "asc" }
    });

    return (
        <ServicesClient 
            initialServices={transactionTypes as any} 
            themeColor={themeColor} 
        />
    );
}
