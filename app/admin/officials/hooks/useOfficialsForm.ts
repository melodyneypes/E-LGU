"use client";

import { useState } from "react";
import { useOfficials } from "../providers/OfficialsProvider";
import { addOfficial, updateOfficial } from "../actions/officials.actions";
import { toast } from "sonner";

export function useOfficialsForm() {
    const { setIsAddModalOpen, editingData, setEditingData, refreshOfficials } = useOfficials();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            if (editingData) {
                const res = await updateOfficial(editingData.id, formData);
                if (!res.success) throw new Error(res.error);
                toast.success("Official updated successfully!");
            } else {
                const res = await addOfficial(formData);
                if (!res.success) throw new Error(res.error);
                toast.success("Official added successfully!");
            }
            setIsAddModalOpen(false);
            setEditingData(null);
            await refreshOfficials();
        } catch (error: any) {
            console.error("Error saving official:", error);
            toast.error(error.message || "Failed to save official. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
