import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { CaptainKainanHeader } from "./components/CaptainKainanHeader";
import { MayorKainanTable } from "@/app/mayor/kainan/components/MayorKainanTable";

export const dynamic = "force-dynamic";

export default async function CaptainKainanPage(props: {
    searchParams: Promise<{
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

    if (user?.role !== "BARANGAY_CAPTAIN" && user?.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "{{BARANGAY_NAME}}";
    const params = await props.searchParams;
    const search = params.search || "";
    const status = params.status || "All";

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));

    const whereClause: any = {
        barangay: { equals: managedBarangay, mode: "insensitive" }
    };

    if (status !== "All") {
        if (status === "Published" || status === "Active") whereClause.isPublished = true;
        if (status === "Draft") whereClause.isPublished = false;
    }

    if (search.trim()) {
        whereClause.AND = [
            {
                OR: [
                    { name: { contains: search.trim(), mode: "insensitive" } },
                    { address: { contains: search.trim(), mode: "insensitive" } },
                    { cuisineType: { contains: search.trim(), mode: "insensitive" } },
                    { description: { contains: search.trim(), mode: "insensitive" } },
                ]
            }
        ];
    }

    const diningDelegate = (prisma as any).dining;

    const [settingsList, diningData, totalCount] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
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
            <CaptainKainanHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
            />

            {/* Page Main Content */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <MayorKainanTable
                    diningData={formattedDiningData}
                    totalCount={totalCount}
                    currentPage={page}
                    pageSize={pageSize}
                    searchQuery={search}
                    selectedBarangay={managedBarangay}
                    activeStatus={status}
                    themeColor={themeColor}
                />
            </main>
        </div>
    );
}
