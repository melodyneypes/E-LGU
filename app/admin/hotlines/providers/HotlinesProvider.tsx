"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Hotline {
    id: string;
    name: string;
    category: string;
    mobileNumber: string | null;
    telephone: string | null;
    address: string | null;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

import { getAdminHotlines } from "../actions/hotlines.actions";

interface HotlinesContextType {
    hotlinesData: Hotline[];
    setHotlinesData: (data: Hotline[]) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    refreshHotlines: () => Promise<void>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: Hotline | null;
    setEditingData: (data: Hotline | null) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const HotlinesContext = createContext<HotlinesContextType | undefined>(undefined);

export function HotlinesProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    status = "All",
}: {
    children: ReactNode;
    initialData: Hotline[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
}) {
    const [hotlinesData, setHotlinesData] = useState<Hotline[]>(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Hotline | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [selectedStatus, setSelectedStatus] = useState(status);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    const refreshHotlines = async () => {
        setIsLoading(true);
        try {
            const res = await getAdminHotlines({
                page,
                pageSize,
                search: searchTerm,
                category: selectedCategory,
                status: selectedStatus,
            });
            if (res.success && res.hotlines) {
                setHotlinesData(res.hotlines as any);
            }
        } catch (err) {
            console.error("Failed to refresh hotlines:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setHotlinesData(initialData);
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
        <HotlinesContext.Provider
            value={{
                hotlinesData,
                setHotlinesData,
                isLoading,
                setIsLoading,
                refreshHotlines,
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
                themeColor,
                page,
                pageSize,
                totalCount,
                isPending,
                setIsPending,
            }}
        >
            {children}
        </HotlinesContext.Provider>
    );
}

export function useHotlines() {
    const context = useContext(HotlinesContext);
    if (context === undefined) {
        throw new Error("useHotlines must be used within a HotlinesProvider");
    }
    return context;
}
