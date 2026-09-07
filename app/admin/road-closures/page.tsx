import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { verifyRoadClosureAccess, getRoadClosuresAction } from "./actions";
import { RoadClosuresClient } from "./components/RoadClosuresClient";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RoadClosuresAdminPage() {
    const auth = await verifyRoadClosureAccess();

    // Guard: strictly redirect unauthorized users
    if (!auth.authorized) {
        redirect("/admin/dashboard");
    }

    // Fetch initial closures and barangays in parallel
    const [closuresRes, barangays] = await Promise.all([
        getRoadClosuresAction(),
        prisma.barangayInfo.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" }
        })
    ]);

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                Road Closures & Traffic Advisories
                            </h1>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                Real-time road status management for the Municipality of Mapandan, Pangasinan.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Client Container */}
            <RoadClosuresClient
                initialClosures={closuresRes.success ? (closuresRes.data as any[]) : []}
                barangaysList={barangays}
                userManagedBarangay={auth.managedBarangay}
                isBarangayAdmin={auth.isBarangayAdmin}
            />
        </div>
    );
}
