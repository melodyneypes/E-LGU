"use client";

import { useState } from "react";
import { useHotlines } from "../providers/HotlinesProvider";
import { addHotline, updateHotline } from "../actions/hotlines.actions";
import { toast } from "sonner";

export function useHotlinesForm() {
    const { setIsAddModalOpen, editingData, setEditingData, refreshHotlines } = useHotlines();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const response = editingData
                ? await updateHotline(editingData.id, formData)
                : await addHotline(formData);

            if (response && response.success) {
                toast.success(editingData ? "Hotline updated successfully!" : "Hotline added successfully!");
                setIsAddModalOpen(false);
                setEditingData(null);
                await refreshHotlines();
            } else {
                const errMsg = response && "error" in response ? response.error : "Failed to save hotline.";
                toast.error(errMsg || "Failed to save hotline.");
            }
        } catch (error: any) {
            console.error("Error saving hotline:", error);
            toast.error(error?.message || "Failed to save hotline. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
