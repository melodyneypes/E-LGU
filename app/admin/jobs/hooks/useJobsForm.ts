"use client";

import { useState } from "react";
import { useJobs } from "../providers/JobsProvider";
import { addJob, updateJob } from "../actions/jobs.actions";
import { toast } from "sonner";

export function useJobsForm() {
    const { setIsAddModalOpen, editingData, setEditingData, refreshJobs } = useJobs();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            if (editingData) {
                const res = await updateJob(editingData.id, formData);
                if (!res.success) throw new Error(res.error);
                toast.success("Job updated successfully!");
            } else {
                const res = await addJob(formData);
                if (!res.success) throw new Error(res.error);
                toast.success("Job posted successfully!");
            }
            setIsAddModalOpen(false);
            setEditingData(null);
            await refreshJobs();
        } catch (error: any) {
            console.error("Error saving job:", error);
            toast.error(error.message || "Failed to save job posting. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
