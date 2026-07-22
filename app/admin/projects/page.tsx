import prisma from "@/lib/db/prisma";
import { ProjectsPage } from "./ProjectsPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        category?: string;
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
    const category = params.category || "All";
    const status = params.status || "All";
    const barangayParam = params.barangay || null;

    const user = session?.user as any;
    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";

    const where: any = {};

    if (isBarangayAdmin) {
        where.barangay = user.managedBarangay;
    } else if (barangayParam && barangayParam !== "All") {
        where.barangay = barangayParam;
    }

    if (category && category !== "All") {
        where.category = category;
    }

    if (status && status !== "All") {
        where.status = status;
    }

    if (search.trim()) {
        where.OR = [
            { title: { contains: search.trim(), mode: "insensitive" } },
            { location: { contains: search.trim(), mode: "insensitive" } },
            { contractor: { contains: search.trim(), mode: "insensitive" } },
            { description: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const projectDelegate = (prisma as any).project;

    if (!projectDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;project&apos; not found. Please restart the dev server.
                </div>
            </div>
        );
    }

    const [projects, totalCount, activeBarangays] = await Promise.all([
        projectDelegate.findMany({
            where,
            select: {
                id: true,
                title: true,
                category: true,
                status: true,
                location: true,
                progress: true,
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
        projectDelegate.count({ where }),
        prisma.barangayInfo.findMany({
            orderBy: { name: "asc" },
            select: { name: true },
        }),
    ]);

    return (
        <ProjectsPage
            initialData={projects}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            status={status}
            currentBarangay={isBarangayAdmin ? user.managedBarangay : barangayParam || undefined}
            activeBarangays={activeBarangays.map((b) => b.name)}
        />
    );
}
