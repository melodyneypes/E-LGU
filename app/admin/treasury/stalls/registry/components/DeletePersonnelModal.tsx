"use client";

import React, { useState } from "react";
import { useRegistry } from "./RegistryProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { deleteMarketPersonnel } from "../actions/registry.actions";
import { toast } from "sonner";

export function DeletePersonnelModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingPersonnel,
        setDeletingPersonnel,
        setPersonnel,
        triggerRefresh,
    } = useRegistry();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingPersonnel) return;

        setLoading(true);
        try {
            const deletedId = deletingPersonnel.id;
            const res = await deleteMarketPersonnel(deletedId);
            if (res.success) {
                // Instant Optimistic Deletion (alis agad sa table)
                setPersonnel(prev => prev.filter(p => p.id !== deletedId));
                toast.success("Personnel account deleted successfully!");
                setIsDeleteOpen(false);
                setDeletingPersonnel(null);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to delete personnel account");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete personnel account");
        } finally {
            setLoading(false);
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
