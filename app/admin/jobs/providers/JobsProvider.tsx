"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Job {
    id: string;
    title: string;
    department: string;
    location: string | null;
    mapUrl: string | null;
    description: string;
    qualifications: string;
    requirements: string;
    salary: string | null;
    employmentType: string;
    deadline: Date | string | null;
     
    links: any;
    barangay: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface JobsContextType {
    jobsData: Job[];
    setJobsData: (data: Job[]) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    refreshJobs: () => Promise<void>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: Job | null;
    setEditingData: (data: Job | null) => void;
    selectedDepartment: string;
    setSelectedDepartment: (department: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    currentBarangay?: string | null;
    activeBarangays?: string[];
    themeColor: string;
}

const JobsContext = createContext<JobsContextType | undefined>(undefined);

import { getAdminJobs } from "../actions/jobs.actions";

export function JobsProvider({ 
    children, 
    initialData,
    currentBarangay,
    activeBarangays = [] 
}: { 
    children: ReactNode; 
    initialData: Job[];
    currentBarangay?: string | null;
    activeBarangays?: string[];
}) {
    const [jobsData, setJobsData] = useState<Job[]>(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Job | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [themeColor, setThemeColor] = useState("#2563eb");

    const refreshJobs = async () => {
        setIsLoading(true);
        try {
            const res = await getAdminJobs(currentBarangay || undefined);
            if (res.success && res.jobs) {
                setJobsData(res.jobs as any);
            }
        } catch (err) {
            console.error("Failed to refresh jobs:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setJobsData(initialData);
    }, [initialData]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings");
                const data = await response.json();
                if (data.themeColor) {
                    setThemeColor(data.themeColor);
                }
            } catch (error) {
                console.error("Error fetching theme settings:", error);
            }
        };
        fetchSettings();
    }, []);

    return (
        <JobsContext.Provider
            value={{
                jobsData,
                setJobsData,
                isLoading,
                setIsLoading,
                refreshJobs,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
                selectedDepartment,
                setSelectedDepartment,
                selectedStatus,
                setSelectedStatus,
                currentBarangay,
                activeBarangays,
                themeColor
            }}
        >
            {children}
        </JobsContext.Provider>
    );
}

export function useJobs() {
    const context = useContext(JobsContext);
    if (context === undefined) {
        throw new Error("useJobs must be used within a JobsProvider");
    }
    return context;
}