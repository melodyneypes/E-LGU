import prisma from "@/lib/db/prisma";
import { NewsPage } from "../content/News";
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
    const barangayParam = params.barangay || null;

    const user = session?.user as any;
    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";

    // Build optimized Prisma filter clause
    const where: any = {};

    if (isBarangayAdmin) {
        where.barangay = user.managedBarangay;
    } else if (barangayParam && barangayParam !== "All") {
        where.barangay = barangayParam;
    }

    if (category && category !== "All") {
        where.category = category;
    }

    if (search.trim()) {
        where.OR = [
            { title: { contains: search.trim(), mode: "insensitive" } },
            { content: { contains: search.trim(), mode: "insensitive" } },
            { author: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const newsDelegate = (prisma as any).news;

    if (!newsDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;news&apos; not found. Please restart the dev server.
                </div>
            </div>
        );
    }

    // Execute paginated query and total count concurrently
    const [news, totalCount, activeBarangays] = await Promise.all([
        newsDelegate.findMany({
            where,
            select: {
                id: true,
                title: true,
                category: true,
                author: true,
                imageUrl: true,
                publishDate: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { publishDate: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        newsDelegate.count({ where }),
        prisma.barangayInfo.findMany({
            orderBy: { name: "asc" },
            select: { name: true },
        }),
    ]);

    return (
        <NewsPage
            initialData={news}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            currentBarangay={isBarangayAdmin ? user.managedBarangay : barangayParam || undefined}
            activeBarangays={activeBarangays.map((b) => b.name)}
        />
    );
}
