import React from "react";
import RHULedgerClient from "./RHULedgerClient";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getRHUAdminTransactions } from "../actions";

export const metadata: Metadata = {
    title: "Consultation Ledger | RHU Hub",
    description: "Official historical records of completed Rural Health Unit patient consultations.",
};

export default async function RHULedgerPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const role = (session.user as any)?.role;
    const department = ((session.user as any)?.department || "").toUpperCase();

    const allowedRoles = [
        "ADMIN",
        "RHU_ADMIN",
        "ADMIN_AIDE",
        "BARANGAY_ADMIN",
        "RHU_CENTER_ADMIN",
        "RHU_DOCTOR",
        "RHU_STAFF",
        "RHU_PHARMACY",
        "ASST_SEC"
    ];
    const allowedDepts = ["RHU", "HEALTH", "RURAL_HEALTH_UNIT", "MEDICAL", "PHARMACY", "LGU"];

    const isAuthorized =
        allowedRoles.includes(role) ||
        allowedDepts.some(d => department.includes(d)) ||
        (role && role.startsWith("RHU_"));

    if (!isAuthorized) {
        redirect("/admin/rhu/centers");
    }

    const initialData = await getRHUAdminTransactions({
        status: "COMPLETED",
        page: 1,
        limit: 10,
        search: "",
        checkupType: "ALL",
        sessionUser: session.user
    });

    return (
        <RHULedgerClient initialData={initialData} />
    );
}
