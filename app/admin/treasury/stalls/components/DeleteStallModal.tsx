"use client";

import React, { useState } from "react";
import { useStalls } from "./StallsProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { deleteStall } from "../actions/stalls.actions";

import { toast } from "sonner";

export function DeleteStallModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingStall,
        setDeletingStall,
        setStalls,
        triggerRefresh,
    } = useStalls();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingStall) return;

        setLoading(true);
        try {
            const deletedId = deletingStall.id;
            const res = await deleteStall(deletedId);
            if (res.success) {
                // Instant Optimistic Deletion (0ms delay sa table)
                setStalls(prev => prev.filter(s => s.id !== deletedId));
                toast.success("Market stall deleted successfully!");
                setIsDeleteOpen(false);
                setDeletingStall(null);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to delete stall");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete stall");
        } finally {
            setLoading(false);
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
