"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Event {
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

interface EventsContextType {
    events: Event[];
    setEvents: (data: Event[]) => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: Event | null;
    setEditingData: (data: Event | null) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    currentBarangay,
    activeBarangays = [],
}: {
    children: ReactNode;
    initialData: Event[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}) {
    const [events, setEvents] = useState<Event[]>(initialData);
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Event | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setEvents(initialData);
        setIsPending(false);
    }, [initialData]);

    useEffect(() => {
        setSearchTerm(search);
    }, [search]);

    useEffect(() => {
        setSelectedCategory(category);
    }, [category]);

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
        <EventsContext.Provider
            value={{
                events,
                setEvents,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
                selectedCategory,
                setSelectedCategory,
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
        </EventsContext.Provider>
    );
}

export function useEvents() {
    const context = useContext(EventsContext);
    if (context === undefined) {
        throw new Error("useEvents must be used within an EventsProvider");
    }
    return context;
}
