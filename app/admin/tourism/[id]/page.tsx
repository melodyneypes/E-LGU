import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import TourismAdminDetailClient from "./TourismAdminDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminTourismDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF"];
    
    if (!session || (user.role && !allowedRoles.includes(user.role))) {
        redirect("/auth/login");
    }

    const { id } = await params;

    const tourismDelegate = (prisma as any).tourismSpot;
    if (!tourismDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;tourismSpot&apos; not found.
                </div>
            </div>
        );
    }

    const tourismSpot = await tourismDelegate.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            category: true,
            description: true,
            address: true,
            entranceFee: true,
            bestTimeToVisit: true,
            contactNumber: true,
            imageUrl: true,
            latitude: true,
            longitude: true,
            googleMapsUrl: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            barangay: true,
        }
    });

    if (!tourismSpot) {
        notFound();
    }

    if (user.role === "BARANGAY_ADMIN" && tourismSpot.barangay && tourismSpot.barangay !== user.managedBarangay) {
        redirect("/admin/tourism");
    }

    return <TourismAdminDetailClient tourismSpot={tourismSpot} />;
}
