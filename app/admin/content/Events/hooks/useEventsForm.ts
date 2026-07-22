"use client";

import { useState } from "react";
import { useEvents } from "../providers/EventsProvider";
import { addEvent, updateEvent } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useEventsForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending } = useEvents();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            if (editingData) {
                await updateEvent(editingData.id, formData);
                toast.success("Event updated successfully!");
            } else {
                await addEvent(formData);
                toast.success("Event added successfully!");
            }
            setEditingData(null);
            setIsAddModalOpen(false);
            setIsPending(true);
            router.refresh();
        } catch (error) {
            console.error("Error saving event:", error);
            toast.error("Failed to save event. Please check the details and try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
