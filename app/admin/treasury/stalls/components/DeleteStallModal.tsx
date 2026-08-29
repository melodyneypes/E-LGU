"use client";

import React, { useState } from "react";
import { useStalls } from "./StallsProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { deleteStall } from "../actions/stalls.actions";

export function DeleteStallModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingStall,
        setDeletingStall,
        triggerRefresh,
    } = useStalls();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingStall) return;

        setLoading(true);
        const res = await deleteStall(deletingStall.id);
        setLoading(false);

        if (res.success) {
            setIsDeleteOpen(false);
            setDeletingStall(null);
            triggerRefresh();
        } else {
            alert(res.error || "Failed to delete stall");
        }
    };

    const handleClose = () => {
        if (!loading) {
            setIsDeleteOpen(false);
            setDeletingStall(null);
        }
    };

    if (!deletingStall) return null;

    return (
        <ConfirmDeleteModal
            isOpen={isDeleteOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            isLoading={loading}
            title="Delete Market Stall"
            description={
                <>
                    Are you sure you want to delete stall unit{" "}
                    <strong className="text-slate-900 dark:text-white uppercase not-italic">
                        &quot;{deletingStall.stallNumber}&quot;
                    </strong>
                    ? This action cannot be undone.
                </>
            }
            confirmText="Yes, Delete Stall"
        />
    );
}
