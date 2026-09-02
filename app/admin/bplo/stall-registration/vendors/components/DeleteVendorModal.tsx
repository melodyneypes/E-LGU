"use client";

import React, { useState } from "react";
import { useVendors } from "./VendorProvider";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { toast } from "sonner";
import { deleteVendor } from "../actions";

export function DeleteVendorModal() {
    const {
        isDeleteOpen,
        setIsDeleteOpen,
        deletingVendor,
        setDeletingVendor,
        setVendors,
        triggerRefresh,
    } = useVendors();

    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!deletingVendor) return;

        setLoading(true);
        try {
            const deletedId = deletingVendor.id;
            const res = await deleteVendor(deletedId);
            if (res.success) {
                // Instant Optimistic Deletion
                setVendors((prev) => prev.filter((v) => v.id !== deletedId));
                toast.success(`Vendor "${deletingVendor.name}" removed successfully!`);
                setIsDeleteOpen(false);
                setDeletingVendor(null);
                triggerRefresh();
            } else {
                toast.error(res.error || "Failed to delete vendor");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete vendor");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setIsDeleteOpen(false);
            setDeletingVendor(null);
        }
    };

    if (!deletingVendor) return null;

    return (
        <ConfirmDeleteModal
            isOpen={isDeleteOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            isLoading={loading}
            title="Delete Market Vendor"
            description={
                <span>
                    Are you sure you want to delete vendor <strong className="text-white">{deletingVendor.name || deletingVendor.email}</strong>? Any stalls currently assigned to this vendor will be set to VACANT.
                </span>
            }
        />
    );
}
