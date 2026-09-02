"use client";

import React, { useState } from "react";
import { useCollectors } from "./CollectorProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { toast } from "sonner";
import { deleteCollector } from "../actions";

export function DeleteCollectorModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingCollector,
        setDeletingCollector,
        setCollectors,
        triggerRefresh,
    } = useCollectors();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingCollector) return;

        setLoading(true);
        try {
            const deletedId = deletingCollector.id;
            const res = await deleteCollector(deletedId);
            if (res.success) {
                // Instant Optimistic Deletion
                setCollectors((prev) => prev.filter((c) => c.id !== deletedId));
                toast.success(`Collector "${deletingCollector.name}" removed successfully!`);
                setIsDeleteOpen(false);
                setDeletingCollector(null);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to delete collector");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete collector");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setIsDeleteOpen(false);
            setDeletingCollector(null);
        }
    };

    if (!deletingCollector) return null;

    return (
        <ConfirmDeleteModal
            isOpen={isDeleteOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            isLoading={loading}
            title="Delete Ticket Collector"
            description={
                <span>
                    Are you sure you want to delete collector <strong className="text-white">{deletingCollector.name || deletingCollector.email}</strong>? All historic tickets issued by this collector will remain archived in the collections ledger.
                </span>
            }
        />
    );
}
