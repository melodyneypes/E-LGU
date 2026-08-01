"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Announcement {
    id: string;
    title: string;
    content?: string | null;
    priority: string;
    category: string;
    isPinned: boolean;
    isActive: boolean;
    barangay: string | null;
    imageUrl?: string | null;
    expiryDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

interface MayorAnnouncementsContextType {
    announcements: Announcement[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedPriority: string;
    setSelectedPriority: (priority: string) => void;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const MayorAnnouncementsContext = createContext<MayorAnnouncementsContextType | undefined>(undefined);

export function MayorAnnouncementsProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    priority = "All",
    currentBarangay,
    activeBarangays = [],
}: {
    children: ReactNode;
    initialData: Announcement[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    priority?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [announcements, setAnnouncements] = useState<Announcement[]>(initialData);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [selectedPriority, setSelectedPriority] = useState(priority);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

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

    useEffect(() => {
        setAnnouncements(initialData);
        setIsPending(false);
    }, [initialData]);

    return (
        <MayorAnnouncementsContext.Provider
            value={{
                announcements,
                searchTerm,
                setSearchTerm,
                selectedCategory,
                setSelectedCategory,
                selectedPriority,
                setSelectedPriority,
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
        </MayorAnnouncementsContext.Provider>
    );
}

export function useMayorAnnouncements() {
    const context = useContext(MayorAnnouncementsContext);
    if (context === undefined) {
        throw new Error("useMayorAnnouncements must be used within a MayorAnnouncementsProvider");
    }
    return context;
}
