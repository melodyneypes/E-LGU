"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Announcement {
    id: string;
    title: string;
    content?: string;
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

interface AnnouncementContextType {
    announcements: Announcement[];
    setAnnouncements: (data: Announcement[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: Announcement | null;
    setEditingData: (data: Announcement | null) => void;
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

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

export function AnnouncementProvider({
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
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>(initialData);
    const [editingData, setEditingData] = useState<Announcement | null>(null);
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

    useEffect(() => {
        setSearchTerm(search);
    }, [search]);

    useEffect(() => {
        setSelectedCategory(category);
    }, [category]);

    useEffect(() => {
        setSelectedPriority(priority);
    }, [priority]);

    return (
        <AnnouncementContext.Provider
            value={{
                announcements,
                setAnnouncements,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
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
        </AnnouncementContext.Provider>
    );
}

export function useAnnouncements() {
    const context = useContext(AnnouncementContext);
    if (context === undefined) {
        throw new Error("useAnnouncements must be used within an AnnouncementProvider");
    }
    return context;
}
