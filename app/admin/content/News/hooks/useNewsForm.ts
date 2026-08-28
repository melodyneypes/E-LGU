"use client";

import { useState } from "react";
import { useNews } from "../providers/NewsProvider";
import { createNews, updateNews } from "../actions/news.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useNewsForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending, setNewsData } = useNews();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, customFormData?: FormData) => {
        e.preventDefault();
        setLoading(true);

        const formData = customFormData || new FormData(e.currentTarget);

        try {
            if (editingData) {
                const res = await updateNews(editingData.id, formData);
                if (res.success && res.news) {
                    setNewsData((prev) => prev.map((item) => item.id === editingData.id ? { ...item, ...(res.news as any) } : item));
                    toast.success("News updated successfully!");
                } else {
                    toast.error(res.error || "Failed to update news article.");
                    return;
                }
            } else {
                const res = await createNews(formData);
                if (res.success) {
                    toast.success("News published successfully!");
                } else {
                    toast.error(res.error || "Failed to create news article.");
                    return;
                }
            }
            setEditingData(null);
            setIsAddModalOpen(false);
            setIsPending(true);
            router.refresh();
        } catch (error: any) {
            console.error("Error saving news:", error);
            toast.error(error?.message || "Failed to save news. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
