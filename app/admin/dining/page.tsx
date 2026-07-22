import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import DiningPageWrapper from "@/app/admin/content/Dining/DiningPage";

export const dynamic = "force-dynamic";

export default async function DiningPage({
    searchParams,
}: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        cuisine?: string;
        status?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const params = await searchParams;

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const cuisine = params.cuisine || "All";
    const status = params.status || "All";
    const barangayParam = params.barangay || null;

    const user = session?.user as any;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF"];
    if (!session || (user.role && !allowedRoles.includes(user.role))) {
        redirect("/auth/login");
    }

    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";

    const where: any = {};

    if (isBarangayAdmin) {
        where.barangay = user.managedBarangay;
    } else if (barangayParam && barangayParam !== "All") {
        where.barangay = barangayParam;
    }

    if (status !== "All") {
        if (status === "Published") where.isPublished = true;
        if (status === "Draft") where.isPublished = false;
    }

    if (search.trim()) {
        where.OR = [
            { name: { contains: search.trim(), mode: "insensitive" } },
            { address: { contains: search.trim(), mode: "insensitive" } },
            { cuisineType: { contains: search.trim(), mode: "insensitive" } },
            { description: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const diningDelegate = (prisma as any).dining;

    if (!diningDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;dining&apos; not found. Please restart the dev server.
                </div>
            </div>
        );
    }

    const [diningData, totalCount, activeBarangays] = await Promise.all([
        diningDelegate.findMany({
            where,
            select: {
                id: true,
                name: true,
                cuisineType: true,
                address: true,
                imageUrl: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        diningDelegate.count({ where }),
        prisma.barangayInfo.findMany({
            orderBy: { name: "asc" },
            select: { name: true },
        }),
    ]);

    return (
        <DiningPageWrapper
            diningData={diningData}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            cuisine={cuisine}
            status={status}
            currentBarangay={isBarangayAdmin ? user.managedBarangay : barangayParam || undefined}
            activeBarangays={isBarangayAdmin ? [] : activeBarangays.map((b) => b.name)}
        />
    );
}
