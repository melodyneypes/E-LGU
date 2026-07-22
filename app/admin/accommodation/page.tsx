import prisma from "@/lib/db/prisma";
import { AccommodationPage } from "../content/Accommodation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ barangay?: string }> }) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF"];
    if (!session || (user?.role && !allowedRoles.includes(user.role))) {
        redirect("/auth/login");
    }

    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";
    
    // Await searchParams for Next.js 15 compatibility
    const params = await searchParams;
    const currentBarangay = isBarangayAdmin ? user.managedBarangay : params.barangay;

    const accommodations = await prisma.accommodation.findMany({
        where: currentBarangay ? { barangay: currentBarangay } : {},
        orderBy: { createdAt: "desc" },
    });

    const activeBarangays = await prisma.barangayInfo.findMany({
        orderBy: { name: "asc" },
        select: { name: true }
    });

    return (
        <AccommodationPage
            initialData={accommodations as any}
            currentBarangay={currentBarangay}
            activeBarangays={isBarangayAdmin ? [] : activeBarangays.map(b => b.name)}
        />
    );
}
