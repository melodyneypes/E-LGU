import prisma from "@/lib/db/prisma";
import { BarangaysListWorkspace } from "./BarangaysListWorkspace";

export const dynamic = "force-dynamic";

export default async function BarangaysPage() {
    const barangays = await prisma.barangayInfo.findMany({
        orderBy: { name: 'asc' }
    });

    const settingsList = await prisma.systemSetting.findMany();
    const settings = settingsList.reduce((acc: any, curr: { key: string; value: string }) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});
    const themeColor = settings.theme_color || "#2563eb";

    return <BarangaysListWorkspace initialData={barangays} themeColor={themeColor} />;
}
