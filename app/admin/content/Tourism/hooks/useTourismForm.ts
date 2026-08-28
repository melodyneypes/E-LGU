"use client";

import { useState, FormEvent } from "react";
import { createTourismSpot, updateTourismSpot } from "../actions/tourism.actions";
import { useTourism } from "../providers/TourismProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useTourismForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending } = useTourism();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            let res;
            if (editingData) {
                res = await updateTourismSpot(editingData.id, formData);
            } else {
                res = await createTourismSpot(formData);
            }

            if (res?.success) {
                toast.success(`Tourism spot ${editingData ? "updated" : "added"} successfully!`);
                setEditingData(null);
                setIsAddModalOpen(false);
                setIsPending(true);
                router.refresh();
            } else {
                toast.error(res?.error || "An error occurred");
            }
        } catch (error) {
            console.error("Error saving tourism spot:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    }

    return {
        handleSubmit,
        loading,
    };
}
