import prisma from "@/lib/db/prisma";
import { HouseholdProvider } from "./providers";
import { HouseholdsPage } from "./HouseholdsPage";
import { Household } from "./providers/HouseholdProvider";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Page() {
    const session = await getServerSession(authOptions);
    const managedBarangay = (session?.user as any)?.managedBarangay;

    const where: any = {};
    if (managedBarangay) {
        where.barangay = managedBarangay;
    }

    const data = await (prisma as any).household.findMany({
        where,
        include: {
            head: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    const households: Household[] = data.map((h: any) => ({
        id: h.id,
        headId: h.headId,
        headOfFamily: h.head ? `${h.head.firstName} ${h.head.lastName}` : "No Head Assigned",
        barangay: h.barangay,
        latitude: h.latitude,
        longitude: h.longitude,
        householdSize: h.householdSize,
        contactNumber: h.contactNumber,
        riskLevel: h.riskLevel,
        notes: h.notes,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt,
    }));

    return (
        <HouseholdProvider initialHouseholds={households}>
            <HouseholdsPage />
        </HouseholdProvider>
    );
}
