"use client";

import { useState } from "react";
import { useNews } from "../providers/NewsProvider";
import { addNews, updateNews } from "@/app/admin/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useNewsForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending, setNewsData } = useNews();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            if (editingData) {
                const res = await updateNews(editingData.id, formData);
                if (res.success && res.news) {
                    setNewsData((prev) => prev.map((item) => item.id === editingData.id ? { ...item, ...(res.news as any) } : item));
                }
                toast.success("News updated successfully!");
            } else {
                await addNews(formData);
                toast.success("News published successfully!");
            }
            setEditingData(null);
            setIsAddModalOpen(false);
            setIsPending(true);
            router.refresh();
        } catch (error) {
            console.error("Error saving news:", error);
            toast.error("Failed to save news. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
