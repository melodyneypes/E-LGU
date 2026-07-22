"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Accommodation {
    id: string;
    name: string;
    description?: string | null;
    address: string;
    type: string;
    priceRange?: string | null;
    amenities?: string | null;
    contactNumber?: string | null;
    websiteUrl?: string | null;
    imageUrl: string | null;
    latitude?: number | null;
    longitude?: number | null;
    googleMapsUrl?: string | null;
    barangay: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface AccommodationContextType {
    accommodationData: Accommodation[];
    setAccommodationData: (data: Accommodation[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (isOpen: boolean) => void;
    editingData: Accommodation | null;
    setEditingData: (data: Accommodation | null) => void;
    selectedType: string;
    setSelectedType: (type: string) => void;
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

const AccommodationContext = createContext<AccommodationContextType | undefined>(undefined);

export function AccommodationProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    type = "All",
    status = "All",
    currentBarangay,
    activeBarangays = [],
}: {
    children: ReactNode;
    initialData: Accommodation[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    type?: string;
    status?: string;
    currentBarangay?: string | null;
    activeBarangays?: string[];
}) {
    const [accommodationData, setAccommodationData] = useState<Accommodation[]>(initialData);
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Accommodation | null>(null);
    const [selectedType, setSelectedType] = useState(type);
    const [selectedStatus, setSelectedStatus] = useState(status);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setAccommodationData(initialData);
        setIsPending(false);
    }, [initialData]);

    useEffect(() => {
        setSearchTerm(search);
    }, [search]);

    useEffect(() => {
        setSelectedType(type);
    }, [type]);

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
        <AccommodationContext.Provider
            value={{
                accommodationData,
                setAccommodationData,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
                selectedType,
                setSelectedType,
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
        </AccommodationContext.Provider>
    );
}

export function useAccommodation() {
    const context = useContext(AccommodationContext);
    if (context === undefined) {
        throw new Error("useAccommodation must be used within an AccommodationProvider");
    }
    return context;
}
