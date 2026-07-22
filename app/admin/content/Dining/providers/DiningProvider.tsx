"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Dining {
    id: string;
    name: string;
    description?: string | null;
    address: string;
    cuisineType?: string | null;
    openingHours?: string | null;
    contactNumber?: string | null;
    facebookUrl?: string | null;
    imageUrl: string | null;
    latitude?: number | null;
    longitude?: number | null;
    googleMapsUrl?: string | null;
    barangay: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface DiningContextType {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (isOpen: boolean) => void;
    diningData: Dining[];
    setDiningData: (data: Dining[]) => void;
    editingData: Dining | null;
    setEditingData: (data: Dining | null) => void;
    selectedCuisine: string;
    setSelectedCuisine: (cuisine: string) => void;
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

const DiningContext = createContext<DiningContextType | undefined>(undefined);

export function DiningProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    cuisine = "All",
    status = "All",
    currentBarangay,
    activeBarangays = [],
}: {
    children: ReactNode;
    initialData: Dining[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    cuisine?: string;
    status?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}) {
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [diningData, setDiningData] = useState<Dining[]>(initialData);
    const [editingData, setEditingData] = useState<Dining | null>(null);
    const [selectedCuisine, setSelectedCuisine] = useState(cuisine);
    const [selectedStatus, setSelectedStatus] = useState(status);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setDiningData(initialData);
        setIsPending(false);
    }, [initialData]);

    useEffect(() => {
        setSearchTerm(search);
    }, [search]);

    useEffect(() => {
        setSelectedCuisine(cuisine);
    }, [cuisine]);

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
        <DiningContext.Provider
            value={{
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                diningData,
                setDiningData,
                editingData,
                setEditingData,
                selectedCuisine,
                setSelectedCuisine,
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
        </DiningContext.Provider>
    );
}

export function useDining() {
    const context = useContext(DiningContext);
    if (context === undefined) {
        throw new Error("useDining must be used within a DiningProvider");
    }
    return context;
}
