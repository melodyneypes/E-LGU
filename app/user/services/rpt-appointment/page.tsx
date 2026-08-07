import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RptAppointmentClient } from "./RptAppointmentClient";

export const dynamic = "force-dynamic";

export default async function RptAppointmentPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const settings = await getMultipleSystemSettings([
        "theme_color",
        "logo",
        "brand_word_1",
        "brand_word_2",
    ]);
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

    // Fetch Treasury appointment config (for Category 1)
    let treasuryConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "TREASURY" }
    });

    if (!treasuryConfig) {
        treasuryConfig = await prisma.appointmentConfig.create({
            data: {
                department: "TREASURY",
                maxSlots: 50,
                maxSlotsAM: 25,
                maxSlotsPM: 25,
                amTimeLabel: "08:00 AM - 11:00 AM",
                pmTimeLabel: "01:00 PM - 04:00 PM",
                blockedDates: [],
                activeDays: [1, 2, 3, 4, 5]
            }
        });
    }

    // Fetch Assessor appointment config (for Category 2 & 3)
    let assessorConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "ASSESSOR" }
    });

    if (!assessorConfig) {
        assessorConfig = await prisma.appointmentConfig.create({
            data: {
                department: "ASSESSOR",
                maxSlots: 50,
                maxSlotsAM: 25,
                maxSlotsPM: 25,
                amTimeLabel: "08:00 AM - 11:00 AM",
                pmTimeLabel: "01:00 PM - 04:00 PM",
                blockedDates: [],
                activeDays: [1, 2, 3, 4, 5]
            }
        });
    }

    // Fetch existing booked slots per department/category
    const allRptTransactions = await prisma.transaction.findMany({
        where: {
            appointmentDate: { not: null },
            isCancelled: false,
            type: { category: "RPT" }
        },
        select: {
            appointmentDate: true,
            appointmentSlot: true,
            additionalData: true
        }
    });

    const treasuryBookedSlots: any[] = [];
    const assessorBookedSlots: any[] = [];

    allRptTransactions.forEach(tx => {
        const cat = (tx.additionalData as any)?.categoryCode;
        const item = {
            appointmentDate: tx.appointmentDate ? tx.appointmentDate.toISOString() : null,
            appointmentSlot: tx.appointmentSlot || ""
        };

        if (cat === "RPT_CAT1") {
            treasuryBookedSlots.push(item);
        } else {
            assessorBookedSlots.push(item);
        }
    });

    // Fetch active barangays list from database
    const barangayList = await prisma.barangayInfo.findMany({
        orderBy: { name: "asc" },
        select: { name: true }
    });
    const barangays = barangayList.map(b => b.name);

    return (
        <RptAppointmentClient
            resident={userWithResident?.residentProfile ? JSON.parse(JSON.stringify(userWithResident.residentProfile)) : null}
            barangays={barangays}
            themeColor={themeColor}
            branding={branding}
            treasuryConfig={JSON.parse(JSON.stringify(treasuryConfig))}
            assessorConfig={JSON.parse(JSON.stringify(assessorConfig))}
            treasuryBookedSlots={treasuryBookedSlots}
            assessorBookedSlots={assessorBookedSlots}
        />
    );
}
