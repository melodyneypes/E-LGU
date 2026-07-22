"use client";

import { useState } from "react";
import { useAnnouncements } from "../providers/AnnouncementProvider";
import { addAnnouncement, updateAnnouncement } from "../actions/announcements.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useAnnouncementForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending } = useAnnouncements();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            if (editingData) {
                const res = await updateAnnouncement(editingData.id, formData);
                if (res.success) {
                    toast.success("Announcement updated successfully!");
                } else {
                    toast.error(res.error || "Failed to update.");
                }
            } else {
                const res = await addAnnouncement(formData);
                if (res.success) {
                    toast.success("Announcement posted successfully!");
                } else {
                    toast.error(res.error || "Failed to post.");
                }
            }
            setIsAddModalOpen(false);
            setEditingData(null);
            setIsPending(true);
            router.refresh();
        } catch (error) {
            console.error("Error saving announcement:", error);
            toast.error("An error occurred during save.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
