import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAccountableFormIncidentsAction } from "@/app/admin/transactions/treasury-incident-actions";
import AccountableFormsView from "./AccountableFormsView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Accountable Forms & Spoiled Stubs Log | Treasury Hub",
    description: "Official municipal COA audit registry for spoiled stubs, paper jams, and accountable forms liquidation.",
};

export default async function AccountableFormsPage() {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department?.toUpperCase();

    const allowedRoles = ["ADMIN", "TREASURY_STAFF", "TREASURY_OFFICER", "ADMIN_AIDE", "MAYOR"];
    const allowedDepartments = ["TREASURY", "LGU"];

    const isAllowedRole = allowedRoles.includes(userRole);
    const isAllowedDepartment = !userDepartment || allowedDepartments.includes(userDepartment);

    if (!session || !isAllowedRole || !isAllowedDepartment) {
        redirect("/auth/login");
    }

    const res = await getAccountableFormIncidentsAction();
    const incidents = res.success && res.data ? res.data : [];

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500 w-full min-h-screen">
            <AccountableFormsView initialIncidents={incidents as any} />
        </div>
    );
}
