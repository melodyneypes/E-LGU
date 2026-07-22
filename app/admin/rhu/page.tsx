import React from "react";
import RHUDashboard from "./RHUDashboard";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "RHU Hub | Mapandan Admin Portal",
    description: "Official administrative dashboard for Rural Health Unit (RHU) clinical appointments and check-ups.",
};

export default async function RHUAdminPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const role = (session.user as any)?.role;
    const department = ((session.user as any)?.department || "").toUpperCase();

    const allowedRoles = ["ADMIN", "ADMIN_AIDE", "BARANGAY_ADMIN"];
    const allowedDepts = ["RHU", "HEALTH", "RURAL_HEALTH_UNIT"];

    const isAuthorized = allowedRoles.includes(role) || allowedDepts.includes(department);

    if (!isAuthorized) {
        redirect("/admin/dashboard");
    }

    return (
        <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <RHUDashboard />
        </div>
    );
}
