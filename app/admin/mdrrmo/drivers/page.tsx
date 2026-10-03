import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMDRRMODrivers, getMDRRMOAmbulanceFleet } from "../actions";
import DriversClient from "./DriversClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ambulance Drivers & Duty Monitoring | MDRRMO",
    description: "Roster management, driver vehicle assignments, license expiry tracking, and real-time on-duty monitoring for ambulance drivers.",
};

export default async function MDRRMODriversPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const role = ((session.user as any)?.role || "").toUpperCase();
    const department = (((session.user as any)?.department as string) || "").toUpperCase();

    const allowedRoles = ["ADMIN", "MDRRMO_ADMIN", "ADMIN_AIDE", "MAYOR"];
    const isAuthorized = allowedRoles.includes(role) || department.includes("MDRRMO") || department.includes("DISASTER") || department === "LGU";

    if (!isAuthorized) {
        redirect("/admin/dashboard");
    }

    const [driversRes, fleetRes] = await Promise.all([
        getMDRRMODrivers(),
        getMDRRMOAmbulanceFleet()
    ]);

    const isReadOnly = false;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24">
            <DriversClient
                initialDrivers={driversRes.drivers || []}
                fleet={fleetRes.fleet || []}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
