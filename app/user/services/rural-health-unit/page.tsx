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

    // Fetch RHU transaction types with auto-seed fallback
    let rhuTypes = await prisma.transactionType.findMany({
        where: {
            code: "RHU_MEDICAL_CERT"
        }
    });

    if (rhuTypes.length === 0) {
        try {
            const created = await prisma.transactionType.create({
                data: {
                    code: "RHU_MEDICAL_CERT",
                    name: "Medical Consultation & Health Certificate",
                    description: "Rural Health Unit clinical check-up, general consultation, and medical clearance certificate issuance.",
                    level: 1,
                    category: "RHU",
                    baseFee: 50.00,
                    deliveryFee: 0.00,
                    isFixed: true,
                    requiredDocs: ["Valid Government ID", "Medical History / Records"],
                    logicCode: "rhu_consultation_v1",
                    slaDays: 1,
                    pickupAddress: "Rural Health Unit (RHU) Main Office",
                    processingTime: "15-30 Minutes"
                }
            });
            rhuTypes = [created];
        } catch (err) {
            console.error("Auto-seeding RHU_MEDICAL_CERT failed:", err);
        }
    }

    return (
        <RHUClient
            transactionTypes={rhuTypes}
            themeColor={themeColor}
        />
    );
}
