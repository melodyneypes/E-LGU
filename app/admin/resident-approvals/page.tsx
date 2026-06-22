import prisma from "@/lib/db/prisma";
import { ResidentProvider, Resident } from "./providers/ResidentProvider";
import { ResidentApprovalsPage } from "./ResidentsPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        limit?: string;
        search?: string;
        barangay?: string;
        gender?: string;
        category?: string;
        status?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const managedBarangay = (session?.user as any)?.managedBarangay;

    const params = await searchParams;
    const page = parseInt(params.page || "1", 10);
    const limit = parseInt(params.limit || "10", 10);
    const skip = (page - 1) * limit;

    const searchQuery = params.search || "";
    const selectedBarangay = params.barangay || "All";
    const selectedGender = params.gender || "All";
    const selectedCategory = params.category || "All";
    const selectedStatus = params.status || "PENDING";

    const where: any = {};
    if (role === "BARANGAY_ADMIN" && managedBarangay) {
        where.barangay = managedBarangay;
    } else if (selectedBarangay !== "All") {
        where.barangay = selectedBarangay;
    }

    if (selectedGender !== "All") {
        where.gender = selectedGender;
    }

    if (selectedCategory !== "All") {
        where.categoryId = selectedCategory;
    }

    if (selectedStatus !== "All") {
        where.registrationStatus = selectedStatus;
    }

    if (searchQuery) {
        where.OR = [
            { firstName: { contains: searchQuery, mode: "insensitive" } },
            { lastName: { contains: searchQuery, mode: "insensitive" } },
            { barangay: { contains: searchQuery, mode: "insensitive" } }
        ];
    }

    const baseWhereForCounts = { ...where };
    delete baseWhereForCounts.registrationStatus;

    const [residentsRaw, totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
        prisma.resident.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                middleName: true,
                suffix: true,
                gender: true,
                dateOfBirth: true,
                age: true,
                civilStatus: true,
                citizenship: true,
                houseNumber: true,
                street: true,
                sitio: true,
                purok: true,
                barangay: true,
                contactNumber: true,
                email: true,
                isHead: true,
                relationshipToHead: true,
                familyHeadId: true,
                categoryId: true,
                registrationStatus: true,
                isDead: true,
                rfid: true,
                imageUrl: true,
                livenessUrl: true,
                philhealthNumber: true,
                degreeProgram: true,
                isSenior: true,
                isPWD: true,
                isSoloParent: true,
                isIndigenous: true,
                is4Ps: true,
                otherSector: true,
                createdAt: true,
                updatedAt: true,
                household: {
                    select: {
                        id: true,
                        headId: true,
                        members: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        head: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                familyHead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                },
                category: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit,
            skip: skip
        }),
        prisma.resident.count({ where }),
        prisma.resident.count({ where: { ...baseWhereForCounts, registrationStatus: "PENDING" } }),
        prisma.resident.count({ where: { ...baseWhereForCounts, registrationStatus: "APPROVED" } }),
        prisma.resident.count({ where: { ...baseWhereForCounts, registrationStatus: "REJECTED" } })
    ]);

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
        <ResidentProvider 
            initialResidents={residents} 
            totalCount={totalCount}
            page={page}
            limit={limit}
            statusCounts={{
                PENDING: pendingCount,
                APPROVED: approvedCount,
                REJECTED: rejectedCount,
                All: pendingCount + approvedCount + rejectedCount
            }}
        >
            <ResidentApprovalsPage />
        </ResidentProvider>
    );
}
