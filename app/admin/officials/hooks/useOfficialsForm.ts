"use client";

import { useState } from "react";
import { useOfficials } from "../providers/OfficialsProvider";
import { addOfficial, updateOfficial } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useOfficialsForm() {
    const { setIsAddModalOpen, editingData, setEditingData } = useOfficials();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            if (editingData) {
                await updateOfficial(editingData.id, formData);
                toast.success("Official updated successfully!");
            } else {
                await addOfficial(formData);
                toast.success("Official added successfully!");
            }
            router.refresh();
            setIsAddModalOpen(false);
            setEditingData(null);
        } catch (error) {
            console.error("Error saving official:", error);
            toast.error("Failed to save official. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
