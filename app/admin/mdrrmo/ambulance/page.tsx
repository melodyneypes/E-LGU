import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMDRRMOAmbulanceFleet, getMDRRMOHotlines, getMDRRMODrivers } from "../actions";
import MDRRMOAmbulanceClient from "./MDRRMOAmbulanceClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ambulance Fleet Registry | MDRRMO",
    description: "Manage emergency ambulance vehicles, license plates, station deployments, assigned drivers, and dispatch hotlines.",
};

export default async function MDRRMOAmbulancePage() {
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

    const [fleetRes, hotlinesRes, driversRes] = await Promise.all([
        getMDRRMOAmbulanceFleet(),
        getMDRRMOHotlines(),
        getMDRRMODrivers()
    ]);

    const isReadOnly = false;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24">
            <MDRRMOAmbulanceClient
                initialFleet={fleetRes.fleet || []}
                initialHotlines={hotlinesRes.hotlines || []}
                initialDrivers={driversRes.drivers || []}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
