import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import PaymentsClient from "@/app/admin/treasury/payments/PaymentsClient";

export const metadata: Metadata = {
    title: "Payments Ledger | Mapandan Portal",
    description: "Official administrative ledger of municipal transactions and payment records.",
};

export default async function PaymentsPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (role !== "TREASURY_STAFF" && role !== "ADMIN") {
        redirect("/admin/dashboard");
    }

    // Get system setting theme_color
    const themeColorSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeColorSetting?.value || "#2563eb";

    // Initial fetch of payments to render on server load
    const initialPayments = await prisma.payment.findMany({
        include: {
            transaction: {
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    paymentType: true,
                    paymentReference: true,
                    type: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    user: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });

    // Make dates safe for serialization by converting them to strings/dates safely
    const safePayments = JSON.parse(JSON.stringify(initialPayments));

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 rounded-full" style={{ backgroundColor: themeColor }} />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Payments <span className="tracking-normal italic" style={{ color: themeColor }}>Ledger</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Search, filter, and track all citizen payment transactions and reference numbers.
                </p>
            </div>

            <PaymentsClient initialPayments={safePayments} />
        </div>
    );
}
