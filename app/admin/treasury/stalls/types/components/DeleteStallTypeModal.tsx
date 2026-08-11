"use client";

import React, { useState } from "react";
import { useStallTypes } from "./StallTypesProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { deleteStallType } from "../actions";

export function DeleteStallTypeModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingStallType,
        setDeletingStallType,
        triggerRefresh,
    } = useStallTypes();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingStallType) return;

        setLoading(true);
        const res = await deleteStallType(deletingStallType.id);
        setLoading(false);

        if (res.success) {
            setIsDeleteOpen(false);
            setDeletingStallType(null);
            triggerRefresh();
        } else {
            alert(res.error || "Failed to delete section");
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
