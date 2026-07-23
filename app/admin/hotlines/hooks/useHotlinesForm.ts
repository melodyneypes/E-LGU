"use client";

import { useState } from "react";
import { useHotlines } from "../providers/HotlinesProvider";
import { addHotline, updateHotline } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useHotlinesForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending } = useHotlines();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
                setIsPending(true);
                router.refresh();
            } else {
                const errMsg = response && "error" in response ? response.error : "Failed to save hotline.";
                toast.error(errMsg || "Failed to save hotline.");
            }
        } catch (error) {
            console.error("Error saving hotline:", error);
            toast.error("Failed to save hotline. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
