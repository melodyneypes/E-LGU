import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { MayorKainanHeader } from "./components/MayorKainanHeader";
import { MayorKainanTable } from "./components/MayorKainanTable";

export const dynamic = "force-dynamic";

export default async function MayorKainanPage(props: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        status?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session?.user) {
        redirect("/auth/login");
    }

    if (user?.role !== "MAYOR" && user?.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const params = await props.searchParams;
    const selectedBarangay = params.barangay || "";
    const search = params.search || "";
    const status = params.status || "All";

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));

    const whereClause: any = {};

    if (selectedBarangay && selectedBarangay !== "All") {
        whereClause.barangay = selectedBarangay;
    }

    if (status !== "All") {
        if (status === "Published" || status === "Active") whereClause.isPublished = true;
        if (status === "Draft") whereClause.isPublished = false;
    }

    if (search.trim()) {
        whereClause.OR = [
            { name: { contains: search.trim(), mode: "insensitive" } },
            { address: { contains: search.trim(), mode: "insensitive" } },
            { cuisineType: { contains: search.trim(), mode: "insensitive" } },
            { description: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const diningDelegate = (prisma as any).dining;

    const [settingsList, activeBarangays, diningData, totalCount] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        prisma.barangayInfo.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
        diningDelegate
            ? diningDelegate.findMany({
                  where: whereClause,
                  select: {
                      id: true,
                      name: true,
                      description: true,
                      cuisineType: true,
                      address: true,
                      imageUrl: true,
                      openingHours: true,
                      contactNumber: true,
                      facebookUrl: true,
                      googleMapsUrl: true,
                      latitude: true,
                      longitude: true,
                      barangay: true,
                      isPublished: true,
                      createdAt: true,
                  },
                  orderBy: { createdAt: "desc" },
                  skip: (page - 1) * pageSize,
                  take: pageSize,
              })
            : Promise.resolve([]),
        diningDelegate ? diningDelegate.count({ where: whereClause }) : Promise.resolve(0),
    ]);

    const themeColor = settingsList.get("theme_color") || "#2563eb";

    const formattedDiningData = diningData.map((d: any) => ({
        ...d,
        createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString(),
    }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
            {/* Header Navbar */}
            <MayorKainanHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={activeBarangays.map((b: { name: string }) => b.name)}
                selectedBarangay={selectedBarangay}
            />

            {/* Page Main Content */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <MayorKainanTable
                    diningData={formattedDiningData}
                    totalCount={totalCount}
                    currentPage={page}
                    pageSize={pageSize}
                    searchQuery={search}
                    selectedBarangay={selectedBarangay}
                    activeStatus={status}
                    themeColor={themeColor}
                />
            </main>
        </div>
    );
}
