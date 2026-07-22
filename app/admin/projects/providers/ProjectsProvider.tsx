"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Project {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    status: string;
    location: string;
    budget?: string | null;
    contractor?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    progress: number;
    imageUrl: string | null;
    barangay?: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface ProjectsContextType {
    projectsData: Project[];
    setProjectsData: (data: Project[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: Project | null;
    setEditingData: (data: Project | null) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    status = "All",
    currentBarangay,
    activeBarangays = [],
}: {
    children: ReactNode;
    initialData: Project[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}) {
    const [projectsData, setProjectsData] = useState<Project[]>(initialData);
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Project | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [selectedStatus, setSelectedStatus] = useState(status);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setProjectsData(initialData);
        setIsPending(false);
    }, [initialData]);

    useEffect(() => {
        setSearchTerm(search);
    }, [search]);

    useEffect(() => {
        setSelectedCategory(category);
    }, [category]);

    useEffect(() => {
        setSelectedStatus(status);
    }, [status]);

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
        <ProjectsContext.Provider
            value={{
                projectsData,
                setProjectsData,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
                selectedCategory,
                setSelectedCategory,
                selectedStatus,
                setSelectedStatus,
                currentBarangay,
                activeBarangays,
                themeColor,
                page,
                pageSize,
                totalCount,
                isPending,
                setIsPending,
            }}
        >
            {children}
        </ProjectsContext.Provider>
    );
}

export function useProjects() {
    const context = useContext(ProjectsContext);
    if (context === undefined) {
        throw new Error("useProjects must be used within a ProjectsProvider");
    }
    return context;
}
