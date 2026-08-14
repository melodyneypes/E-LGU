import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RHUClient } from "./RHUClient";
import { getAmbulanceSettings } from "./actions";

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
    const rhuTypes = await prisma.transactionType.findMany({
        where: {
            code: {
                in: ["RHU_MEDICAL_CERT", "RHU_AMBULANCE"]
            }
        }
    });

    const hasMedicalCert = rhuTypes.some(t => t.code === "RHU_MEDICAL_CERT");
    if (!hasMedicalCert) {
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
            rhuTypes.push(created);
        } catch (err) {
            console.error("Auto-seeding RHU_MEDICAL_CERT failed:", err);
        }
    }

    const hasAmbulance = rhuTypes.some(t => t.code === "RHU_AMBULANCE");
    if (!hasAmbulance) {
        try {
            const created = await prisma.transactionType.create({
                data: {
                    code: "RHU_AMBULANCE",
                    name: "Ambulance Scheduling & Dispatch",
                    description: "Ambulance fleet availability dashboard and direct emergency dispatch contact directories.",
                    level: 1,
                    category: "RHU",
                    baseFee: 0.00,
                    deliveryFee: 0.00,
                    isFixed: true,
                    requiredDocs: ["Patient Info & Medical Status", "Pickup Location & Destination", "Emergency Contact Number"],
                    logicCode: "rhu_ambulance_v1",
                    slaDays: 1,
                    pickupAddress: "RHU Main Office / Emergency Dispatch Station",
                    processingTime: "Immediate / Scheduled"
                }
            });
            rhuTypes.push(created);
        } catch (err) {
            console.error("Auto-seeding RHU_AMBULANCE failed:", err);
        }
    }

    const ambulanceRes = await getAmbulanceSettings();

    return (
        <RHUClient
            transactionTypes={rhuTypes}
            themeColor={themeColor}
            initialAmbulanceFleet={ambulanceRes.success ? ambulanceRes.fleet : []}
            initialDispatchHotlines={ambulanceRes.success ? ambulanceRes.hotlines : []}
        />
    );
}
