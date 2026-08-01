"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface MayorNews {
    id: string;
    title: string;
    content?: string | null;
    category: string;
    author: string | null;
    imageUrl: string | null;
    publishDate: Date;
    barangay: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface MayorNewsContextType {
    newsData: MayorNews[];
    searchTerm: string;
    selectedCategory: string;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const MayorNewsContext = createContext<MayorNewsContextType | undefined>(undefined);

export function useMayorNews() {
    const ctx = useContext(MayorNewsContext);
    if (!ctx) throw new Error("useMayorNews must be used within MayorNewsProvider");
    return ctx;
}

export function MayorNewsProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    currentBarangay,
    activeBarangays = [],
    themeColor = "#2563eb",
}: {
    children: ReactNode;
    initialData: MayorNews[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor?: string;
}) {
    const [isPending, setIsPending] = useState(false);

    return (
        <MayorNewsContext.Provider
            value={{
                newsData: initialData,
                searchTerm: search,
                selectedCategory: category,
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
        </MayorNewsContext.Provider>
    );
}
