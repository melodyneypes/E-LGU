import prisma from "@/lib/db/prisma";
import { ResidentProvider, Resident } from "./providers/ResidentProvider";
import { ResidentApprovalsPage } from "./ResidentsPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Page() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const managedBarangay = (session?.user as any)?.managedBarangay;

    const where: any = {};

    if (role === "BARANGAY_ADMIN" && managedBarangay) {
        where.barangay = managedBarangay;
    }

    const residentsRaw = await prisma.resident.findMany({
        where,
        include: {
            household: {
                include: {
                    members: true,
                    head: true
                }
            },
            familyHead: true,
            category: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Map virtual fields for frontend convenience
    const residents = (residentsRaw as any[]).map((r: any) => ({
        ...r,
        headId: r.familyHeadId || r.household?.headId || null,
        headName: r.familyHead
            ? `${r.familyHead.firstName} ${r.familyHead.lastName}`
            : r.household?.head
                ? `${r.household.head.firstName} ${r.household.head.lastName}`
                : null
    })) as Resident[];

    return (
        <ResidentProvider initialResidents={residents}>
            <ResidentApprovalsPage />
        </ResidentProvider>
    );
}
