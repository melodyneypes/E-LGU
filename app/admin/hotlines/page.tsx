import prisma from "@/lib/db/prisma";
import { HotlinesPage } from "./HotlinesPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        search?: string;
        category?: string;
        status?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF"];
    if (!session || (user?.role && !allowedRoles.includes(user.role))) {
        redirect("/auth/login");
    }

    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "All";
    const status = params.status || "All";

    const where: any = {};

    if (category && category !== "All") {
        where.category = category;
    }

    if (status !== "All") {
        if (status === "Active" || status === "Published") where.isActive = true;
        if (status === "Inactive" || status === "Draft") where.isActive = false;
    }

    if (search.trim()) {
        where.OR = [
            { name: { contains: search.trim(), mode: "insensitive" } },
            { category: { contains: search.trim(), mode: "insensitive" } },
            { mobileNumber: { contains: search.trim(), mode: "insensitive" } },
            { telephone: { contains: search.trim(), mode: "insensitive" } },
            { address: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const hotlineDelegate = (prisma as any).hotline;

    if (!hotlineDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;hotline&apos; not found. Please restart the dev server.
                </div>
            </div>
        );
    }

    const [hotlines, totalCount] = await Promise.all([
        hotlineDelegate.findMany({
            where,
            orderBy: { order: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        hotlineDelegate.count({ where }),
    ]);

    return (
        <HotlinesPage
            initialData={hotlines as any}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            status={status}
        />
    );
}
