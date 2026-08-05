import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "./components/AdminShell";
import { getMultipleSystemSettings } from "@/lib/settings";
import prisma from "@/lib/db/prisma";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
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
    const isAllowedAdmin = [
        "ADMIN",
        "RHU_ADMIN",
        "CONTENT_ADMIN",
        "BARANGAY_ADMIN",
        "TREASURY_STAFF",
        "ADMIN_AIDE",
        "ENGINEER",
        "MPDC_ZONING",
        "BFP",
        "RHU_CENTER_ADMIN",
        "RHU_DOCTOR",
        "RHU_STAFF",
        "RHU_PHARMACY"
    ].includes(role || "");

    if (!isAllowedAdmin) {
        redirect("/auth/login");
    }

    const settings = await getMultipleSystemSettings([
        "site_logo",
        "brand_word_1",
        "brand_word_2",
        "theme_color"
    ]);

    const user = session.user as any;
    const isBarangayAdmin = user.role === "BARANGAY_ADMIN";
    const managedBarangay = user.managedBarangay;

    const reportsWhere: any = { status: "PENDING" };
    const residentsWhere: any = { registrationStatus: "PENDING" };

    if (isBarangayAdmin && managedBarangay) {
        reportsWhere.barangay = {
            name: managedBarangay
        };
        residentsWhere.barangay = managedBarangay;
    }

    let pendingReportsCount = 0;
    let pendingResidentsCount = 0;
    let pendingTreasuryCount = 0;
    let lcrTransactions: any[] = [];

    try {
        const [repCnt, resCnt, trsCnt, lcrTx] = await Promise.all([
            prisma.report.count({ where: reportsWhere }).catch(() => 0),
            prisma.resident.count({ where: residentsWhere }).catch(() => 0),
            prisma.transaction.count({ where: { status: { in: ["FOR_REQUESTING", "PAID"] } } }).catch(() => 0),
            prisma.transaction.findMany({
                where: {
                    status: { in: ["FOR_INSPECTION", "FOR_REQUESTING"] },
                    isCancelled: false,
                    type: {
                        OR: [
                            { category: "Civil Registry" },
                            { code: { startsWith: "LCR_" } },
                            { code: { startsWith: "CIVIL_REGISTRY" } }
                        ]
                    }
                },
                select: {
                    id: true,
                    updatedAt: true,
                    type: { select: { code: true } }
                }
            }).catch(() => [])
        ]);
        pendingReportsCount = repCnt;
        pendingResidentsCount = resCnt;
        pendingTreasuryCount = trsCnt;
        lcrTransactions = lcrTx;
    } catch (err) {
        console.error("Error fetching admin layout counts:", err);
    }

    // Map type codes to sidebar category labels
    const codeToCategory: Record<string, string> = {
        LCR_BIRTH_REG: "Birth Registration",
        LCR_BIRTH: "Birth Certificate",
        LCR_PSA_ENDORSEMENT: "PSA Endorsement",
        LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT: "Certified True Copy Appointment",
        LCR_DEATH_PSA_ENDORSEMENT: "PSA Endorsement",
        LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT: "Certified True Copy Appointment",
        LCR_MARRIAGE_PSA_ENDORSEMENT: "PSA Endorsement",
        LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT: "Certified True Copy Appointment",
        LCR_DEATH_REG: "Death Registration",
        LCR_DEATH: "Death Certificate",
        LCR_MARRIAGE_LICENSE: "Marriage License",
        LCR_MARRIAGE_REG: "Marriage Registration",
        LCR_MARRIAGE: "Marriage Certificate",
    };

    const unviewedLcrCounts: Record<string, number> = {};
    if (lcrTransactions) {
        for (const tx of lcrTransactions) {
            const code = tx.type?.code || "";
            const category = codeToCategory[code];
            if (category) {
                unviewedLcrCounts[category] = (unviewedLcrCounts[category] || 0) + 1;
            }
        }
    }

    return (
        <ThemeProvider themeColor={settings.get("theme_color") || "#2563eb"}>
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
                    pendingTransactionsCount={pendingTreasuryCount}
                    unviewedLcrCounts={unviewedLcrCounts}
                >
                    {children}
                </AdminShell>
            </div>
        </ThemeProvider>
    );
}
