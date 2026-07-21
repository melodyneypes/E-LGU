import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RHUClient } from "./RHUClient";

export const dynamic = "force-dynamic";

export default async function RHUPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const settings = await getMultipleSystemSettings([
        "theme_color",
    ]);
    const themeColor = settings.get("theme_color") || "#2563eb";

    // Fetch RHU transaction types
    const rhuTypes = await prisma.transactionType.findMany({
        where: {
            isActive: true,
            code: "RHU_MEDICAL_CERT"
        }
    });

    return (
        <RHUClient
            transactionTypes={rhuTypes}
            themeColor={themeColor}
        />
    );
}
