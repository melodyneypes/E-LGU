import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAccountableFormIncidentsAction } from "@/app/admin/transactions/treasury-incident-actions";
import { getMultipleSystemSettings } from "@/lib/settings";
import AccountableFormsView from "./AccountableFormsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Registry of Cancelled Accountable Forms | Treasury Hub",
    description: "Official municipal COA audit registry for cancelled accountable forms, paper jams, and serial liquidation.",
};

export default async function AccountableFormsPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;
    const userDepartment = user?.department?.toUpperCase();

    const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY_OFFICER", "ADMIN_AIDE", "MAYOR"];
    const allowedDepartments = ["TREASURY", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);

    if (!session || !isAllowedRole || !isAllowedDepartment) {
        redirect("/auth/login");
    }

    const [res, settings] = await Promise.all([
        getAccountableFormIncidentsAction(),
        getMultipleSystemSettings([
            "site_logo",
            "brand_word_1",
            "brand_word_2",
            "theme_color",
            "municipal_treasurer_name"
        ])
    ]);

    const incidents = res.success && res.data ? res.data : [];

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 w-full min-h-screen">
            <AccountableFormsView 
                initialIncidents={incidents as any} 
                currentUser={{
                    name: user?.name || "Treasury Staff",
                    email: user?.email || "",
                    role: user?.role || "TREASURY_STAFF"
                }}
                settings={{
                    logoUrl: settings.get("site_logo") || null,
                    brandWord1: settings.get("brand_word_1") || "Municipality of",
                    brandWord2: settings.get("brand_word_2") || "Mapandan",
                    themeColor: settings.get("theme_color") || "#2563eb",
                    treasurerName: settings.get("municipal_treasurer_name") || "Municipal Treasurer"
                }}
            />
        </div>
    );
}
