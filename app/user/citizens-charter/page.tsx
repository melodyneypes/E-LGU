import prisma from "@/lib/db/prisma";
import { UserCitizensCharterView } from "./UserCitizensCharterView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
    const [charters, logoSetting] = await Promise.all([
        prisma.citizenCharter.findMany({
            where: { isActive: true },
            orderBy: { officeName: "asc" }
        }),
        prisma.systemSetting.findUnique({
            where: { key: "site_logo" }
        })
    ]);

    const logoUrl = logoSetting?.value || "";

    return <UserCitizensCharterView initialCharters={charters as any} logoUrl={logoUrl} />;
}
