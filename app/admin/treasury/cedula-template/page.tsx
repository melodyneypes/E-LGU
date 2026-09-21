import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import CedulaTemplateStudioClient from "./CedulaTemplateStudioClient";
import { getCedulaLayoutAction } from "./actions";

export const metadata: Metadata = {
    title: "Cedula Template Studio | Mapandan Portal",
    description: "Official visual layout designer and printing calibration studio for Community Tax Certificates (Cedula).",
};

export default async function CedulaTemplateStudioPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;
    const department = (user?.department || "").toUpperCase();

    const isAllowed =
        role === "ADMIN" ||
        role === "TREASURY_STAFF" ||
        role === "ADMIN_AIDE" ||
        department === "TREASURY";

    if (!isAllowed) {
        redirect("/admin/treasury?category=CEDULA");
    }

    // Load theme color setting
    const themeSetting = await prisma.systemSetting.findUnique({
        where: { key: "theme_color" }
    });
    const themeColor = themeSetting?.value || "#2563eb";

    // Load layout config
    const layoutRes = await getCedulaLayoutAction();
    const initialLayout = layoutRes.data;

    return (
        <CedulaTemplateStudioClient
            themeColor={themeColor}
            initialLayout={initialLayout}
        />
    );
}
