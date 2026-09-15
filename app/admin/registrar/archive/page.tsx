import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import RegistrarArchiveClient from "./components/RegistrarArchiveClient";

export const metadata: Metadata = {
    title: "Document Archives & Registry Vault | Civil Registrar Hub",
    description: "Historical Civil Registry physical book records and certificate digitization vault.",
};

export const dynamic = "force-dynamic";

export default async function RegistrarArchivePage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const role = user?.role;
    const department = (user?.department || "").toUpperCase();

    const isAuthorized =
        role === "ADMIN" ||
        role === "TREASURY_STAFF" ||
        role === "REGISTRAR" ||
        department === "REGISTRAR" ||
        department === "CIVIL_REGISTRY";

    if (!session || !isAuthorized) {
        redirect("/admin/dashboard");
    }

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-2 h-8 bg-blue-600 rounded-full" />
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Civil Registry <span className="text-blue-600 tracking-normal italic">Archives</span>
                    </h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Digitized vault for historical registry books, birth, death, marriage records, and legal instruments.
                </p>
            </div>

            <RegistrarArchiveClient themeColor={themeColor} />
        </div>
    );
}
