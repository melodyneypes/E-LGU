import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { getMDRRMOAnnouncements } from "../actions";
import MDRRMOAnnouncementsClient from "./MDRRMOAnnouncementsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "MDRRMO Emergency Announcements | Mapandan Admin",
    description: "Broadcast municipal disaster alerts, weather advisories, ambulance fleet availability, and road rescue notices.",
};

export default async function MDRRMOAnnouncementsPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        priority?: string;
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
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const search = params.search || "";
    const priority = params.priority || "All";

    const [annRes, barangays] = await Promise.all([
        getMDRRMOAnnouncements({ page, pageSize: 12, search, priority }),
        prisma.barangayInfo.findMany({
            orderBy: { name: "asc" },
            select: { name: true }
        })
    ]);

    const isReadOnly = false;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24">
            <MDRRMOAnnouncementsClient
                initialAnnouncements={annRes.announcements || []}
                totalCount={annRes.totalCount || 0}
                currentPage={page}
                pageSize={12}
                initialSearch={search}
                initialPriority={priority}
                barangays={barangays.map(b => b.name)}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
