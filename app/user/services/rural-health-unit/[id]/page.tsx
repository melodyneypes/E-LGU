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

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 1);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 35);

    // Fetch booked slots for RHU within active booking window
    const bookedSlots = await prisma.transaction.findMany({
        where: {
            appointmentDate: {
                gte: startDate,
                lte: endDate
            },
            isCancelled: false,
            type: {
                category: {
                    in: ["RHU", "Rural Health Unit", "Rural Health Unit (RHU)", "HEALTH", "RURAL_HEALTH_UNIT"]
                }
            }
        },
        select: {
            appointmentDate: true,
            appointmentSlot: true,
            additionalData: true
        }
    });

    // Fetch active Health Centers / Stations
    let healthCenters: any[] = [];
    try {
        const model = (prisma as any).rHUHealthCenter || (prisma as any).RHUHealthCenter;
        if (model) {
            healthCenters = await model.findMany({
                where: { status: "ACTIVE" },
                orderBy: { name: "asc" }
            });
        }
    } catch {
        healthCenters = [];
    }

    if (!healthCenters || healthCenters.length === 0) {
        try {
            healthCenters = await prisma.$queryRaw`SELECT * FROM "RHUHealthCenter" WHERE "status" = 'ACTIVE' ORDER BY "name" ASC`;
        } catch {
            healthCenters = [
                {
                    id: "main-rhu",
                    name: "Main Rural Health Unit (RHU)",
                    code: "RHU-MAIN",
                    location: "Poblacion, Mapandan, Pangasinan",
                    latitude: 16.0250,
                    longitude: 120.4450,
                    barangay: "Poblacion",
                    contactNumber: "(075) 555-0101",
                    operatingHours: "Mon-Fri 8:00 AM - 5:00 PM"
                }
            ];
        }
    }

    return (
        <MedicalConsultationForm
            resident={userWithResident?.residentProfile || null}
            transactionType={transactionType}
            appointmentConfig={rhuConfig}
            bookedSlots={bookedSlots}
            healthCenters={healthCenters}
            themeColor={themeColor}
        />
    );
}
