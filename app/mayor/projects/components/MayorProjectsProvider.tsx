"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface MayorProject {
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

interface MayorProjectsContextType {
    projects: MayorProject[];
    searchTerm: string;
    selectedCategory: string;
    selectedStatus: string;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const MayorProjectsContext = createContext<MayorProjectsContextType | undefined>(undefined);

export function useMayorProjects() {
    const ctx = useContext(MayorProjectsContext);
    if (!ctx) throw new Error("useMayorProjects must be used within MayorProjectsProvider");
    return ctx;
}

export function MayorProjectsProvider({
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
    themeColor = "#2563eb",
}: {
    children: ReactNode;
    initialData: MayorProject[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor?: string;
}) {
    const [isPending, setIsPending] = useState(false);

    return (
        <MayorProjectsContext.Provider
            value={{
                projects: initialData,
                searchTerm: search,
                selectedCategory: category,
                selectedStatus: status,
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
        </MayorProjectsContext.Provider>
    );
}
