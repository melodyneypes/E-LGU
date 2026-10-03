import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMultipleSystemSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import { getCaptainHotlines } from "./actions";
import { CaptainHotlinesHeader } from "./components/CaptainHotlinesHeader";
import { MayorHotlinesTable } from "@/app/mayor/hotlines/components/MayorHotlinesTable";

export const dynamic = "force-dynamic";

export default async function CaptainHotlinesPage(props: {
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

    if (!session?.user) {
        redirect("/auth/login");
    }

    if (user?.role !== "BARANGAY_CAPTAIN" && user?.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "{{BARANGAY_NAME}}";
    const params = await props.searchParams;
    const search = params.search || "";
    const category = params.category || "All";
    const status = params.status || "All";
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));

    const [settingsList, hotlinesRes] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        getCaptainHotlines({
            page,
            pageSize,
            search,
            category: category !== "All" ? category : undefined,
            status: status !== "All" ? status : undefined,
        }),
    ]);

    const themeColor = settingsList.get("theme_color") || "#2563eb";
    const hotlines = hotlinesRes?.hotlines || [];
    const totalCount = hotlinesRes?.totalCount || 0;

    const formattedData = hotlines.map((item: any) => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
    }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
            <CaptainHotlinesHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
            />

            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <MayorHotlinesTable
                    hotlineData={formattedData}
                    totalCount={totalCount}
                    currentPage={page}
                    pageSize={pageSize}
                    searchQuery={search}
                    selectedCategory={category}
                    activeStatus={status}
                    themeColor={themeColor}
                />
            </main>
        </div>
    );
}
