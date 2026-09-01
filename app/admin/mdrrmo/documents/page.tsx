import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMDRRMODocuments, getMDRRMOAmbulanceFleet } from "../actions";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ambulance OR/CR & Papers Filing | MDRRMO Mapandan",
    description: "Digital filing system for ambulance Official Receipts (OR), Certificates of Registration (CR), vehicle insurance, and emission test certificates.",
};

export default async function MDRRMODocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{
        ambulanceId?: string;
        type?: string;
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
    const selectedAmbulanceId = params.ambulanceId || "ALL";
    const selectedType = params.type || "ALL";

    const [docsRes, fleetRes] = await Promise.all([
        getMDRRMODocuments(selectedAmbulanceId, selectedType),
        getMDRRMOAmbulanceFleet()
    ]);

    const isReadOnly = false;

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-24">
            <DocumentsClient
                initialDocuments={docsRes.documents || []}
                fleet={fleetRes.fleet || []}
                initialAmbulanceId={selectedAmbulanceId}
                initialType={selectedType}
                isReadOnly={isReadOnly}
            />
        </div>
    );
}
