import prisma from "@/lib/db/prisma";
import { CitizensCharterClient } from "./CitizensCharterClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // LGU Admin check (reject BARANGAY_ADMIN and other roles not in allowed list)
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "STAFF"];
    if (!session || (user?.role && !allowedRoles.includes(user.role))) {
        redirect("/admin/dashboard");
    }

    const charters = await prisma.citizenCharter.findMany({
        orderBy: { officeName: "asc" },
    });

    return <CitizensCharterClient initialData={charters as any} />;
}
