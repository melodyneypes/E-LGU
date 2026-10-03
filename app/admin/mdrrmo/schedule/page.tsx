import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMDRRMOSchedules, getMDRRMOAmbulanceFleet, getMDRRMODrivers } from "../actions";
import ScheduleClient from "./ScheduleClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ambulance Scheduling & Dispatch | MDRRMO",
    description: "Coordinate patient hospital transfers, emergency ambulance dispatches, driver shifts, and standby rotations.",
};

export default async function MDRRMOSchedulePage({
    searchParams,
}: {
    searchParams: Promise<{
        status?: string;
        ambulanceId?: string;
    }>;
}) {
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

    const params = await searchParams;
    const selectedStatus = params.status || "ALL";

    const [schedulesRes, fleetRes, driversRes] = await Promise.all([
        getMDRRMOSchedules({ status: selectedStatus }),
        getMDRRMOAmbulanceFleet(),
        getMDRRMODrivers()
    ]);

    const isReadOnly = false;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24">
            <ScheduleClient
                initialSchedules={schedulesRes.schedules || []}
                fleet={fleetRes.fleet || []}
                drivers={driversRes.drivers || []}
                initialStatus={selectedStatus}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
