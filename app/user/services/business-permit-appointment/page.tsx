import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BusinessPermitAppointmentClient } from "./BusinessPermitAppointmentClient";

export const dynamic = "force-dynamic";

export default async function BusinessPermitAppointmentPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
        settings,
        userWithResident,
        businessTypes,
        bploConfigRaw,
        bookedSlots,
        activeTransactions,
        previousPermitsRaw
    ] = await Promise.all([
        getMultipleSystemSettings([
            "theme_color", 
            "logo", 
            "brand_word_1", 
            "brand_word_2",
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
        ]),
        prisma.user.findUnique({
            where: { id: session.user.id },
            include: { residentProfile: true }
        }),
        prisma.transactionType.findMany({
            where: {
                isActive: true,
                code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
            }
        }),
        prisma.appointmentConfig.findUnique({
            where: { department: "BPLO" }
        }),
        prisma.transaction.findMany({
            where: {
                appointmentDate: { gte: todayStart },
                isCancelled: false,
                type: {
                    code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
                }
            },
            select: {
                appointmentDate: true,
                appointmentSlot: true
            }
        }),
        prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                type: { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } },
                status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
                isCancelled: false
            },
            select: {
                id: true,
                type: { select: { code: true } }
            }
        }),
        prisma.transaction.findMany({
            where: {
                userId: session.user.id,
                status: { in: ["DELIVERED", "RELEASED"] },
                type: { code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] } }
            },
            include: {
                type: true,
                businessPermit: true
            },
            orderBy: { createdAt: "desc" },
            take: 10
        })
    ]);

    const themeColor = settings.get("theme_color") || "#2563eb";
    const branding = {
        logo: settings.get("logo") || null,
        word1: settings.get("brand_word_1") || "MUNICIPALITY",
        word2: settings.get("brand_word_2") || "PORTAL",
    };

    const bploSettings = {
        bplo_tax_rate_new: settings.get("bplo_tax_rate_new") || "0.0005",
        bplo_health_card_fee: settings.get("bplo_health_card_fee") || "100.00",
        bplo_mayors_tax_clearance_fee: settings.get("bplo_mayors_tax_clearance_fee") || "85.00",
        bplo_retail_tax_rate_low: settings.get("bplo_retail_tax_rate_low") || "0.022",
        bplo_retail_tax_rate_high: settings.get("bplo_retail_tax_rate_high") || "0.011",
        bplo_manufacturer_tax_rate: settings.get("bplo_manufacturer_tax_rate") || "0.004125",
        bplo_wholesaler_tax_rate: settings.get("bplo_wholesaler_tax_rate") || "0.0055",
        bplo_mayors_permit_matrix: settings.get("bplo_mayors_permit_matrix") || "",
        bplo_sanitary_fee_matrix: settings.get("bplo_sanitary_fee_matrix") || "",
        bplo_garbage_fee_matrix: settings.get("bplo_garbage_fee_matrix") || ""
    };

    const bploConfig = bploConfigRaw || {
        department: "BPLO",
        maxSlots: 50,
        maxSlotsAM: 25,
        maxSlotsPM: 25,
        blockedDates: [],
        activeDays: [1, 2, 3, 4, 5]
    };

    const hasActiveNew = activeTransactions.some(t => t.type?.code === "BUSINESS_PERMIT_NEW");
    const hasActiveRenew = activeTransactions.some(t => t.type?.code === "BUSINESS_PERMIT_RENEW");

    const uniqueBusinessesMap: Record<string, any> = {};
    previousPermitsRaw.forEach((tx: any) => {
        const bizName = tx.additionalData?.businessName?.trim().toUpperCase();
        if (bizName && !uniqueBusinessesMap[bizName]) {
            uniqueBusinessesMap[bizName] = tx;
        }
    });
    const previousPermits = Object.values(uniqueBusinessesMap);

    return (
        <BusinessPermitAppointmentClient
            resident={userWithResident?.residentProfile || null}
            businessTypes={businessTypes}
            themeColor={themeColor}
            branding={branding}
            config={bploConfig as any}
            bookedSlots={bookedSlots as any[]}
            hasActiveNew={hasActiveNew}
            hasActiveRenew={hasActiveRenew}
            previousPermits={previousPermits}
            bploSettings={bploSettings}
        />
    );
}
