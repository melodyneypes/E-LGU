import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "./components/AdminShell";
import { getMultipleSystemSettings } from "@/lib/settings";
import prisma from "@/lib/db/prisma";
export const dynamic = "force-dynamic";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/auth/login");
    }
    const role = (session.user as { role?: string })?.role;
    if (role !== "ADMIN" && role !== "CONTENT_ADMIN" && role !== "BARANGAY_ADMIN" && role !== "TREASURY_STAFF" && role !== "ADMIN_AIDE" && role !== "ENGINEER") {
        redirect("/auth/login");
    }

    const settings = await getMultipleSystemSettings([
        "site_logo", 
        "brand_word_1", 
        "brand_word_2", 
        "theme_color"
    ]);

    const [pendingReportsCount, pendingResidentsCount, pendingTransactionsCount] = await Promise.all([
        prisma.report.count({ where: { status: "PENDING" } }),
        prisma.resident.count({ where: { registrationStatus: "PENDING" } }),
        prisma.transaction.count({ where: { status: { in: ["FOR_REQUESTING", "PAID"] } } }),
    ]);

    return (
        <div 
            className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0f1117] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-300"
            style={{ "--primary-theme": settings.get("theme_color") || "#2563eb" } as React.CSSProperties}
        >
            <AdminShell
                session={session}
                logoUrl={settings.get("site_logo")}
                brandWord1={settings.get("brand_word_1")}
                brandWord2={settings.get("brand_word_2")}
                themeColor={settings.get("theme_color")}
                pendingReportsCount={pendingReportsCount}
                pendingResidentsCount={pendingResidentsCount}
                pendingTransactionsCount={pendingTransactionsCount}
            >
                {children}
            </AdminShell>
        </div>
    );
}

