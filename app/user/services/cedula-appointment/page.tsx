import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CedulaAppointmentClient } from "./CedulaAppointmentClient";

export const dynamic = "force-dynamic";

export default async function CedulaAppointmentPage() {
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

    // Fetch Cedula transaction types
    const cedulaTypes = await prisma.transactionType.findMany({
        where: {
            isActive: true,
            code: { in: ["CEDULA_IND", "CEDULA_JUR", "CEDULA_STUDENT"] }
        }
    });

    // Fetch Treasury appointment config
    let treasuryConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "TREASURY" }
    });

    if (!treasuryConfig) {
        // Create default if not found
        treasuryConfig = await prisma.appointmentConfig.create({
            data: {
                department: "TREASURY",
                maxSlots: 50,
                blockedDates: [],
                activeDays: [1, 2, 3, 4, 5]
            }
        });
    }

    // Fetch all existing appointments to calculate booked slots
    const bookedSlots = await prisma.transaction.findMany({
        where: {
            appointmentDate: { not: null },
            isCancelled: false,
            type: { category: "Treasurer" }
        },
        select: {
            appointmentDate: true,
            appointmentSlot: true
        }
    });

    // Check for ongoing active Individual and Juridical Cedula transactions
    const activeIndividual = await prisma.transaction.findFirst({
        where: {
            userId: session.user.id,
            type: { code: "CEDULA_IND" },
            status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
            isCancelled: false
        }
    });

    const activeJuridical = await prisma.transaction.findFirst({
        where: {
            userId: session.user.id,
            type: { code: "CEDULA_JUR" },
            status: { notIn: ["RELEASED", "DELIVERED", "REJECTED"] },
            isCancelled: false
        }
    });

    return (
        <CedulaAppointmentClient
            resident={userWithResident?.residentProfile || null}
            cedulaTypes={cedulaTypes}
            themeColor={themeColor}
            branding={branding}
            config={treasuryConfig as any}
            bookedSlots={bookedSlots as any[]}
            hasActiveIndividual={!!activeIndividual}
            hasActiveJuridical={!!activeJuridical}
        />
    );
}
