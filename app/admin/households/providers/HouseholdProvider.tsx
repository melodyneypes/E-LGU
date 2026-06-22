"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Household = {
    id: string;
    headId: string | null;
    headOfFamily?: string | null; // Virtual for display
    barangay: string;
    latitude: number | null;
    longitude: number | null;
    householdSize: number;
    contactNumber: string | null;
    riskLevel: string;
    specialSectors?: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
};
type ViewMode = "map" | "list";

type Coords = { lat: number; lng: number };

type HouseholdContextType = {
    households: Household[];
    setHouseholds: React.Dispatch<React.SetStateAction<Household[]>>;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedBarangay: string;
    setSelectedBarangay: (barangay: string) => void;
    selectedRiskLevel: string;
    setSelectedRiskLevel: (risk: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (isOpen: boolean) => void;
    editingData: Household | null;
    setEditingData: (data: Household | null) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    selectedCoords: Coords | null;
    setSelectedCoords: (coords: Coords | null) => void;
};

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export function HouseholdProvider({
    children,
    initialHouseholds
}: {
    children: ReactNode;
    initialHouseholds: Household[]
}) {
    const [households, setHouseholds] = useState<Household[]>(initialHouseholds);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBarangay, setSelectedBarangay] = useState("All");
    const [selectedRiskLevel, setSelectedRiskLevel] = useState("All");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Household | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("map");
    const [selectedCoords, setSelectedCoords] = useState<Coords | null>(null);

    return (
        <HouseholdContext.Provider value={{
            households,
            setHouseholds,
            searchQuery,
            setSearchQuery,
            selectedBarangay,
            setSelectedBarangay,
            selectedRiskLevel,
            setSelectedRiskLevel,
            isAddModalOpen,
            setIsAddModalOpen,
            editingData,
            setEditingData,
            viewMode,
            setViewMode,
            selectedCoords,
            setSelectedCoords
        }}>
            {children}
        </HouseholdContext.Provider>
    );
}

export function useHousehold() {
    const context = useContext(HouseholdContext);
    if (context === undefined) {
        throw new Error("useHousehold must be used within a HouseholdProvider");
    }
    return context;
}
