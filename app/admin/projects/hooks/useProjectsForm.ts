"use client";

import { useState } from "react";
import { useProjects } from "../providers/ProjectsProvider";
import { createProject, updateProject } from "../actions/projects.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useProjectsForm() {
    const { setIsAddModalOpen, editingData, setEditingData, setIsPending } = useProjects();
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, imageFile: File | null) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        if (imageFile) {
            formData.append("imageFile", imageFile);
        }

        try {
            if (editingData) {
                const res = await updateProject(editingData.id, formData);
                if (!res.success) throw new Error(res.error);
                toast.success("Project updated successfully!");
            } else {
                const res = await createProject(formData);
                if (!res.success) throw new Error(res.error);
                toast.success("Project added successfully!");
            }
            setIsAddModalOpen(false);
            setEditingData(null);
            setIsPending(true);
            router.refresh();
        } catch (error: any) {
            console.error("Error saving project:", error);
            toast.error(error.message || "Failed to save project. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
