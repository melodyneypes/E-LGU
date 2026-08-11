"use client";

import React, { useState } from "react";
import { useRegistry } from "./RegistryProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { deleteMarketPersonnel } from "../actions";

export function DeletePersonnelModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingPersonnel,
        setDeletingPersonnel,
        triggerRefresh,
    } = useRegistry();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingPersonnel) return;

        setLoading(true);
        const res = await deleteMarketPersonnel(deletingPersonnel.id);
        setLoading(false);

        if (res.success) {
            setIsDeleteOpen(false);
            setDeletingPersonnel(null);
            triggerRefresh();
        } else {
            alert(res.error || "Failed to delete personnel account");
        }
    };

    const handleClose = () => {
        if (!loading) {
            setIsDeleteOpen(false);
            setDeletingPersonnel(null);
        }
    };

    if (!deletingPersonnel) return null;

    return (
        <ConfirmDeleteModal
            isOpen={isDeleteOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            isLoading={loading}
            title="Delete Market Personnel"
            description={
                <>
                    Are you sure you want to delete account for{" "}
                    <strong className="text-slate-900 dark:text-white uppercase not-italic">
                        &quot;{deletingPersonnel.name}&quot; ({deletingPersonnel.email})
                    </strong>
                    ? This action cannot be undone.
                </>
            }
            confirmText="Yes, Delete Account"
        />
    );
}
