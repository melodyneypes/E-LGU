"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Tourism {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    address: string;
    entranceFee?: string | null;
    bestTimeToVisit?: string | null;
    contactNumber?: string | null;
    imageUrl: string | null;
    latitude?: number | null;
    longitude?: number | null;
    googleMapsUrl?: string | null;
    barangay: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface TourismContextType {
    tourismData: Tourism[];
    setTourismData: (data: Tourism[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (isOpen: boolean) => void;
    editingData: Tourism | null;
    setEditingData: (data: Tourism | null) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    currentBarangay?: string | null;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const TourismContext = createContext<TourismContextType | undefined>(undefined);

export function TourismProvider({
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
    initialData: Tourism[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    status?: string;
    currentBarangay?: string | null;
    activeBarangays?: string[];
}) {
    const [tourismData, setTourismData] = useState<Tourism[]>(initialData);
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Tourism | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [selectedStatus, setSelectedStatus] = useState(status);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setTourismData(initialData);
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
        <TourismContext.Provider
            value={{
                tourismData,
                setTourismData,
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
        </TourismContext.Provider>
    );
}

export function useTourism() {
    const context = useContext(TourismContext);
    if (context === undefined) {
        throw new Error("useTourism must be used within a TourismProvider");
    }
    return context;
}
