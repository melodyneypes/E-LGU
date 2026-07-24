import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { getPosoDueDaysSetting } from "@/app/admin/poso/actions";
import PosoSettingsClient from "./PosoSettingsClient";

export const metadata: Metadata = {
    title: "POSO Settings | Mapandan Portal",
    description: "System settings and citation grace period configuration for POSO.",
};

export default async function PosoSettingsPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || user.role !== "ADMIN" || user.department !== "POSO") {
        redirect("/admin/dashboard");
    }

    const dueDaysRes = await getPosoDueDaysSetting();
    const initialDueDays = dueDaysRes.dueDays || 7;

    return <PosoSettingsClient initialDueDays={initialDueDays} />;
}
