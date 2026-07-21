import prisma from "@/lib/db/prisma";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { MedicalConsultationForm } from "./RHUBookingForm";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function RHUBookingPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        redirect("/auth/login");
    }

    const { id } = await params;

    const settings = await getMultipleSystemSettings([
        "theme_color",
    ]);
    const themeColor = settings.get("theme_color") || "#2563eb";

    // Fetch the specific transaction type by ID
    const transactionType = await prisma.transactionType.findUnique({
        where: { id, isActive: true }
    });

    if (!transactionType) {
        notFound();
    }

    // Fetch user's resident profile
    const userWithResident = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { residentProfile: true }
    });

    // Fetch RHU appointment config
    let rhuConfig = await prisma.appointmentConfig.findUnique({
        where: { department: "RHU" }
    });

    if (!rhuConfig) {
        rhuConfig = await prisma.appointmentConfig.create({
            data: {
                department: "RHU",
                maxSlots: 50,
                blockedDates: [],
                activeDays: [1, 2, 3, 4, 5]
            }
        });
    }

    // Fetch booked slots for RHU
    const bookedSlots = await prisma.transaction.findMany({
        where: {
            appointmentDate: { not: null },
            isCancelled: false,
            type: { category: "Rural Health Unit" }
        },
        select: {
            appointmentDate: true,
            appointmentSlot: true
        }
    });

    return (
        <MedicalConsultationForm
            resident={userWithResident?.residentProfile || null}
            transactionType={transactionType}
            appointmentConfig={rhuConfig}
            bookedSlots={bookedSlots}
            themeColor={themeColor}
        />
    );
}
