"use client";

import { useState } from "react";
import { useEvents } from "../providers/EventsProvider";
import { createEvent, updateEvent } from "../actions/events.actions";
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
                const res = await updateEvent(editingData.id, formData);
                if (res.success) {
                    toast.success("Event updated successfully!");
                } else {
                    toast.error(res.error || "Failed to update event.");
                    return;
                }
            } else {
                const res = await createEvent(formData);
                if (res.success) {
                    toast.success("Event added successfully!");
                } else {
                    toast.error(res.error || "Failed to add event.");
                    return;
                }
            }
            setEditingData(null);
            setIsAddModalOpen(false);
            setIsPending(true);
            router.refresh();
        } catch (error: any) {
            console.error("Error saving event:", error);
            toast.error(error?.message || "Failed to save event. Please check details and try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
