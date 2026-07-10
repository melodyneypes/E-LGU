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

    const settings = await getMultipleSystemSettings(["theme_color", "logo", "brand_word_1", "brand_word_2"]);
    const themeColor = settings.get("theme_color") || "#2563eb";
    const branding = {
        logo: settings.get("logo") || null,
        word1: settings.get("brand_word_1") || "MUNICIPALITY",
        word2: settings.get("brand_word_2") || "PORTAL",
    };

    // Fetch user's resident profile
    const userWithResident = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { residentProfile: true }
    });

    // Fetch Business Permit transaction types
    const businessTypes = await prisma.transactionType.findMany({
        where: {
            isActive: true,
            code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
        }
    });

    // Fetch BPLO appointment config
    let bploConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "BPLO" }
    });

    if (!bploConfig) {
        // Create default if not found
        bploConfig = await prisma.appointmentConfig.create({
            data: {
                department: "BPLO",
                maxSlots: 50,
                maxSlotsAM: 25,
                maxSlotsPM: 25,
                blockedDates: [],
                activeDays: [1, 2, 3, 4, 5]
            }
        });
    }

    // Fetch all existing BPLO appointments to calculate booked slots
    const bookedSlots = await prisma.transaction.findMany({
        where: {
            appointmentDate: { not: null },
            isCancelled: false,
            type: {
                code: { in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"] }
            }
        },
        select: {
            appointmentDate: true,
            appointmentSlot: true
        }
    });

    // Check for ongoing active Business Permit transactions
    const activeNew = await prisma.transaction.findFirst({
        where: {
            userId: session.user.id,
            type: { code: "BUSINESS_PERMIT_NEW" },
            status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
            isCancelled: false
        }
    });

    const activeRenew = await prisma.transaction.findFirst({
        where: {
            userId: session.user.id,
            type: { code: "BUSINESS_PERMIT_RENEW" },
            status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
            isCancelled: false
        }
    });

    // Fetch successful business permits for autofill
    const previousPermitsRaw = await prisma.transaction.findMany({
        where: {
            userId: session.user.id,
            status: {
                in: ["DELIVERED", "RELEASED"]
            },
            type: {
                code: {
                    in: ["BUSINESS_PERMIT_NEW", "BUSINESS_PERMIT_RENEW"]
                }
            }
        },
        include: {
            type: true,
            businessPermit: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });

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
            hasActiveNew={!!activeNew}
            hasActiveRenew={!!activeRenew}
            previousPermits={previousPermits}
        />
    );
}
