import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import AccommodationAdminDetailClient from "./AccommodationAdminDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminAccommodationDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const allowedRoles = ["ADMIN", "SUPER_ADMIN", "BARANGAY_ADMIN", "CONTENT_ADMIN", "STAFF"];
    
    if (!session || (user.role && !allowedRoles.includes(user.role))) {
        redirect("/auth/login");
    }

    const { id } = await params;

    const accommodationDelegate = (prisma as any).accommodation;
    if (!accommodationDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;accommodation&apos; not found.
                </div>
            </div>
        );
    }

    const accommodation = await accommodationDelegate.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            description: true,
            address: true,
            type: true,
            priceRange: true,
            amenities: true,
            contactNumber: true,
            websiteUrl: true,
            imageUrl: true,
            latitude: true,
            longitude: true,
            googleMapsUrl: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            barangay: true,
            reviews: {
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    mediaUrl: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            residentProfile: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    imageUrl: true,
                                    barangay: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: "desc"
                }
            }
        }
    });

    if (!accommodation) {
        notFound();
    }

    // Role-based security check for Barangay Admins
    if (user?.role === "BARANGAY_ADMIN" && user.managedBarangay) {
        if (accommodation.barangay && accommodation.barangay !== user.managedBarangay) {
            redirect("/admin/accommodation");
        }
    }

    return <AccommodationAdminDetailClient accommodation={accommodation} />;
}
