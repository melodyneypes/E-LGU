import React from "react";
import PaymentSettingsClient from "@/app/admin/treasury/payment-settings/PaymentSettingsClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";

export const metadata: Metadata = {
    title: "Payment Settings | Mapandan Portal",
    description: "Official administrative configuration for municipal Payments and merchant details.",
};

export default async function PaymentSettingsPage() {
    notFound();

    // Fetch Treasury Settings for the configuration form
    const settingsList = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    "theme_color"
                ]
            }
        }
    });

    const treasurySettings = settingsList.reduce((acc: any, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {});

    const themeColor = treasurySettings["theme_color"] || "#2563eb";

    const transactionTypes = await prisma.transactionType.findMany({
        orderBy: { name: "asc" }
    });

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* Elegant Header Banner */}
            <div className="px-6 py-8 rounded-[1.5rem] border" style={{ backgroundColor: `${themeColor}15`, borderColor: `${themeColor}25` }}>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter drop-shadow-sm" style={{ color: themeColor }}>
                    Payment <span className="tracking-normal italic">Settings</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[10px] opacity-70">
                    Manage official merchant identities and service transaction base fees.
                </p>
            </div>

            <div className="w-full">
                <PaymentSettingsClient 
                    transactionTypes={transactionTypes as any}
                    themeColor={themeColor}
                />
            </div>
        </div>
    );
}
