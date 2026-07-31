import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import RHUTransactionDetailClient from "./RHUTransactionDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function RHUTransactionDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    residentProfile: true
                }
            },
            type: true
        }
    });

    if (!transaction) {
        notFound();
    }

    const userRole = (session.user as any)?.role;
    const userEmail = ((session.user as any)?.email || "").toLowerCase();
    const isCenterAdmin = userRole === "RHU_CENTER_ADMIN" || userRole === "RHU_DOCTOR" || userRole === "RHU_STAFF";

    if (isCenterAdmin && transaction.additionalData) {
        const addData = typeof transaction.additionalData === "string"
            ? JSON.parse(transaction.additionalData)
            : (transaction.additionalData as any);

        const txCenterId = addData?.healthCenterId;
        const txCenterName = (addData?.healthCenterName || "").toLowerCase();

        try {
            const centers: any[] = await prisma.$queryRaw`
                SELECT "id", "name", "code", "barangay", "accountEmail", "userId" FROM "RHUHealthCenter"
            `;

            const matchedCenter = centers.find((c: any) =>
                (c.userId && String(c.userId) === String((session.user as any).id)) ||
                (c.accountEmail && String(c.accountEmail).toLowerCase() === userEmail) ||
                (userEmail.includes("lalas") && String(c.name).toLowerCase().includes("lalas")) ||
                (userEmail.includes("main") && String(c.name).toLowerCase().includes("main")) ||
                ((session.user as any).managedBarangay && c.barangay === (session.user as any).managedBarangay)
            );

            if (matchedCenter) {
                const matchesId = txCenterId && String(txCenterId) === String(matchedCenter.id);
                const matchesName = txCenterName && (
                    txCenterName.includes(matchedCenter.name.toLowerCase()) ||
                    (matchedCenter.name.toLowerCase().includes("lalas") && txCenterName.includes("lalas")) ||
                    (matchedCenter.name.toLowerCase().includes("main") && txCenterName.includes("main"))
                );

                if (txCenterName && !matchesId && !matchesName) {
                    redirect("/admin/rhu/consultations");
                }
            }
        } catch {
            // fallback
        }
    }

    return (
        <div className="p-4 md:p-8 w-full max-w-full space-y-6 pb-20 animate-in fade-in duration-500">
            <RHUTransactionDetailClient transaction={transaction} />
        </div>
    );
}
