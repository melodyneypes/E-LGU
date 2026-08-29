"use client";

import React, { useState } from "react";
import { useStallTypes } from "./StallTypesProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { deleteStallType } from "../actions/stall-types.actions";
import { toast } from "sonner";

export function DeleteStallTypeModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingStallType,
        setDeletingStallType,
        setStallTypes,
        triggerRefresh,
    } = useStallTypes();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingStallType) return;

        setLoading(true);
        try {
            const deletedId = deletingStallType.id;
            const res = await deleteStallType(deletedId);
            if (res.success) {
                // Instant Optimistic Deletion (0ms lag sa table)
                setStallTypes(prev => prev.filter(t => t.id !== deletedId));
                toast.success("Market section deleted successfully!");
                setIsDeleteOpen(false);
                setDeletingStallType(null);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to delete section");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete section");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setIsDeleteOpen(false);
            setDeletingStallType(null);
        }
    };

    if (!deletingStallType) return null;

    return (
        <ConfirmDeleteModal
            isOpen={isDeleteOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            isLoading={loading}
            title="Delete Market Section"
            description={
                <>
                    Are you sure you want to delete section{" "}
                    <strong className="text-slate-900 dark:text-white uppercase not-italic">
                        &quot;{deletingStallType.name}&quot; ({deletingStallType.code})
                    </strong>
                    ? This action cannot be undone.
                </>
            }
            confirmText="Yes, Delete Section"
        />
    );
}
