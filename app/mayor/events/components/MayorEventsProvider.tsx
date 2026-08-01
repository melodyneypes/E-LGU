"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface MayorEvent {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    startDate: Date;
    endDate: Date;
    venueName: string;
    address: string;
    contactNumber?: string | null;
    imageUrl: string | null;
    barangay: string | null;
    reminders?: string[];
    latitude?: number | null;
    longitude?: number | null;
    googleMapsUrl?: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface MayorEventsContextType {
    events: MayorEvent[];
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

const MayorEventsContext = createContext<MayorEventsContextType | undefined>(undefined);

export function useMayorEvents() {
    const ctx = useContext(MayorEventsContext);
    if (!ctx) throw new Error("useMayorEvents must be used within MayorEventsProvider");
    return ctx;
}

export function MayorEventsProvider({
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
    initialData: MayorEvent[];
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
        <MayorEventsContext.Provider
            value={{
                events: initialData,
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
        </MayorEventsContext.Provider>
    );
}
