"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getTransactionById } from "@/app/admin/transactions/actions";
import { toast } from "sonner";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ZoningDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [, setLoading] = useState(true);

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                const tx = res.data;
                const isBuildingPermit = tx.type?.code?.startsWith("BUILDING_PERMIT") ?? false;
                if (isBuildingPermit) {
                    const addData = (tx.additionalData as any) || {};
                    const zoningStatus = addData.zoningStatus;

                    if (tx.status === "EVALUATED" && zoningStatus) {
                        if (zoningStatus === "FOR_REQUESTING" || zoningStatus === "FOR_REVISION" || zoningStatus === "REJECTED") {
                            router.replace(`/admin/zoning/${id}/evaluation`);
                        } else if (zoningStatus === "FOR_INSPECTION") {
                            router.replace(`/admin/zoning/${id}/inspection`);
                        } else if (zoningStatus === "FOR_REINSPECTION") {
                            router.replace(`/admin/zoning/${id}/reinspection`);
                        } else if (zoningStatus === "EVALUATED") {
                            router.replace(`/admin/zoning/${id}/fees`);
                        } else {
                            router.replace(`/admin/zoning/${id}/fees`);
                        }
                    } else {
                        if (tx.status === "FOR_REQUESTING" || tx.status === "FOR_REVISION" || tx.status === "REJECTED") {
                            router.replace(`/admin/zoning/${id}/evaluation`);
                        } else if (tx.status === "FOR_INSPECTION") {
                            router.replace(`/admin/zoning/${id}/inspection`);
                        } else if (tx.status === "FOR_REINSPECTION") {
                            router.replace(`/admin/zoning/${id}/reinspection`);
                        } else if (["EVALUATED", "UNPAID", "PAYMENT_SUBMITTED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(tx.status)) {
                            router.replace(`/admin/zoning/${id}/fees`);
                        }
                    }
                } else {
                    toast.error("Not a building/zoning permit transaction");
                }
            } else {
                toast.error(res.error || "Failed to load transaction");
            }
        } catch {
            toast.error("An error occurred while fetching details");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchTransaction();
    }, [fetchTransaction]);

    return (
        <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    );
}
