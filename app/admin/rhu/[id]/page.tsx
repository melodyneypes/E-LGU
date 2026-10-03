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

    let transaction: any = null;
    try {
        transaction = await prisma.transaction.findUnique({
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
    } catch {
        const raw: any[] = await prisma.$queryRaw`
            SELECT t.*,
                   JSON_BUILD_OBJECT('id', u.id, 'name', u.name, 'email', u.email) as user,
                   JSON_BUILD_OBJECT('id', tt.id, 'code', tt.code, 'name', tt.name, 'category', tt.category) as type
            FROM "Transaction" t
            LEFT JOIN "User" u ON t."userId" = u.id
            LEFT JOIN "TransactionType" tt ON t."typeId" = tt.id
            WHERE t.id = ${id}
            LIMIT 1
        `;
        transaction = raw[0] || null;
    }

    if (!transaction) {
        notFound();
    }

    const userRole = (session.user as any)?.role;
    const userEmail = ((session.user as any)?.email || "").toLowerCase();
    const isCenterAdmin = userRole === "RHU_CENTER_ADMIN" || userRole === "RHU_DOCTOR" || userRole === "RHU_STAFF" || userRole === "ASST_SEC";

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

            const assignedDoctorId = (session.user as any).assignedDoctorId;
            const matchedCenter = centers.find((c: any) =>
                (c.userId && String(c.userId) === String((session.user as any).id)) ||
                (assignedDoctorId && c.userId && String(c.userId) === String(assignedDoctorId)) ||
                (c.accountEmail && String(c.accountEmail).toLowerCase() === userEmail) ||
                (userEmail.includes("{{BARANGAY_NAME}}") && String(c.name).toLowerCase().includes("{{BARANGAY_NAME}}")) ||
                (userEmail.includes("main") && String(c.name).toLowerCase().includes("main")) ||
                ((session.user as any).managedBarangay && c.barangay === (session.user as any).managedBarangay)
            );

            if (matchedCenter) {
                const matchesId = txCenterId && String(txCenterId) === String(matchedCenter.id);
                const matchesName = txCenterName && (
                    txCenterName.includes(matchedCenter.name.toLowerCase()) ||
                    (matchedCenter.name.toLowerCase().includes("{{BARANGAY_NAME}}") && txCenterName.includes("{{BARANGAY_NAME}}")) ||
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
            <RHUTransactionDetailClient transaction={transaction} currentUser={session.user as any} />
        </div>
    );
}
