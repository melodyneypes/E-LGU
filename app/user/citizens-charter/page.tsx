import prisma from "@/lib/db/prisma";
import { UserCitizensCharterView } from "./UserCitizensCharterView";

export const dynamic = "force-dynamic";

export default async function Page() {
    const charters = await prisma.citizenCharter.findMany({
        where: { isActive: true },
        orderBy: { officeName: "asc" }
    });

    return <UserCitizensCharterView initialCharters={charters as any} />;
}
