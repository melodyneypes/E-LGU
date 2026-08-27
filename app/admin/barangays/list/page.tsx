import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarangaysListWorkspace } from "./BarangaysListWorkspace";

export const dynamic = "force-dynamic";

export default async function BarangaysPage() {
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentDepartment = (session?.user as any)?.department;
    const accessiblePages = ((session?.user as any)?.accessiblePages || []) as string[];

    const isLguAdmin = currentUserRole === "ADMIN" && currentDepartment === "LGU";
    const isAssignedAdmin = currentUserRole === "ADMIN" && accessiblePages.some(page => 
        page === "/admin/barangays/list" || 
        page === "/admin/barangays" || 
        page.startsWith("/admin/barangays")
    );

    if (!session?.user?.id || (!isLguAdmin && !isAssignedAdmin)) {
        redirect("/admin");
    }

    const [barangays, settingsList] = await Promise.all([
        prisma.barangayInfo.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' }
        }),
        prisma.systemSetting.findMany()
    ]);

    const settings = settingsList.reduce((acc: any, curr: { key: string; value: string }) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
    const themeColor = settings.theme_color || "#2563eb";

    return <BarangaysListWorkspace initialData={barangays} themeColor={themeColor} />;
}
