"use client";

import { useState, FormEvent } from "react";
import { createAccommodation, updateAccommodation } from "../actions/accommodation.actions";
import { useAccommodation } from "../providers/AccommodationProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useAccommodationForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending } = useAccommodation();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            let res;
            if (editingData) {
                res = await updateAccommodation(editingData.id, formData);
            } else {
                res = await createAccommodation(formData);
            }

            if (res?.success) {
                toast.success(`Accommodation ${editingData ? "updated" : "added"} successfully!`);
                setEditingData(null);
                setIsAddModalOpen(false);
                setIsPending(true);
                router.refresh();
            } else {
                toast.error(res?.error || "An error occurred");
            }
        } catch (error) {
            console.error("Error saving accommodation:", error);
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
