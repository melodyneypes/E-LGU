"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Official {
    id: string;
    name: string;
    position: string;
    contactNumber: string | null;
    email: string | null;
     
    links: any;
    bio: string | null;
    education: string | null;
    motto: string | null;
    achievements: string | null;
    imageUrl: string | null;
    termStart: Date | null;
    termEnd: Date | null;
    order: number;
    isActive: boolean;
    barangay: string | null;
    category: string;
    createdAt: Date;
    updatedAt: Date;
}

import { getAdminOfficials } from "../actions/officials.actions";

interface OfficialsContextType {
    officialsData: Official[];
    setOfficialsData: (data: Official[]) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    refreshOfficials: () => Promise<void>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: Official | null;
    setEditingData: (data: Official | null) => void;
    selectedPosition: string;
    setSelectedPosition: (position: string) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    selectedBarangay: string;
    setSelectedBarangay: (barangay: string) => void;
    barangays: string[];
    themeColor: string;
}

const OfficialsContext = createContext<OfficialsContextType | undefined>(undefined);

export function OfficialsProvider({ 
    children, 
    initialData, 
    barangays, 
    managedBarangay 
}: { 
    children: ReactNode; 
    initialData: Official[]; 
    barangays: string[];
    managedBarangay?: string | null;
}) {
    const [officialsData, setOfficialsData] = useState<Official[]>(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<any | null>(null);
    const [selectedPosition, setSelectedPosition] = useState("All");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [selectedBarangay, setSelectedBarangay] = useState(managedBarangay || "LGU");
    const [themeColor, setThemeColor] = useState("#2563eb");

    const refreshOfficials = async () => {
        setIsLoading(true);
        try {
            const res = await getAdminOfficials({
                barangay: selectedBarangay !== "All" ? selectedBarangay : undefined,
                category: selectedCategory !== "All" ? selectedCategory : undefined
            });
            if (res.success && res.officials) {
                setOfficialsData(res.officials as any);
            }
        } catch (err) {
            console.error("Failed to refresh officials:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setOfficialsData(initialData);
    }, [initialData]);

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
        <OfficialsContext.Provider
            value={{
                officialsData,
                setOfficialsData,
                isLoading,
                setIsLoading,
                refreshOfficials,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
                selectedPosition,
                setSelectedPosition,
                selectedCategory,
                setSelectedCategory,
                selectedStatus,
                setSelectedStatus,
                selectedBarangay,
                setSelectedBarangay,
                barangays,
                themeColor,
            }}
        >
            {children}
        </OfficialsContext.Provider>
    );
}

export function useOfficials() {
    const context = useContext(OfficialsContext);
    if (context === undefined) {
        throw new Error("useOfficials must be used within an OfficialsProvider");
    }
    return context;
}