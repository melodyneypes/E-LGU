"use client";

import React, { createContext, useContext, useState } from "react";

export interface StallItem {
    id: string;
    stallNumber: string;
    stallTypeId: string;
    vendorId: string | null;
    status: "VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
    dailyRate: number;
    monthlyRate: number;
    dailyRateOverdueFee: number;
    monthlyRateOverdueFee: number;
    createdAt: Date | string;
    updatedAt: Date | string;
    stallType: {
        id: string;
        code: string;
        name: string;
    };
    vendor?: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
    otherFees?: any[];
    collections?: any[];
}

export interface StallTypeOption {
    id: string;
    code: string;
    name: string;
}

export interface VendorOption {
    id: string;
    name: string | null;
    email: string | null;
}

interface StallsContextType {
    stalls: StallItem[];
    stallTypes: StallTypeOption[];
    vendors: VendorOption[];
    themeColor: string;
    search: string;
    setSearch: (val: string) => void;
    selectedStatus: string;
    setSelectedStatus: (val: string) => void;
    selectedStallType: string;
    setSelectedStallType: (val: string) => void;
    viewMode: "grid" | "table";
    setViewMode: (mode: "grid" | "table") => void;
    selectedStall: StallItem | null;
    setSelectedStall: (stall: StallItem | null) => void;
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editingStall: StallItem | null;
    setEditingStall: (stall: StallItem | null) => void;
}

const StallsContext = createContext<StallsContextType | undefined>(undefined);

export function StallsProvider({
    initialStalls,
    stallTypes,
    vendors,
    themeColor,
    children,
}: {
    initialStalls: StallItem[];
    stallTypes: StallTypeOption[];
    vendors: VendorOption[];
    themeColor: string;
    children: React.ReactNode;
}) {
    const [stalls] = useState<StallItem[]>(initialStalls);
    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedStallType, setSelectedStallType] = useState("ALL");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    
    const [selectedStall, setSelectedStall] = useState<StallItem | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStall, setEditingStall] = useState<StallItem | null>(null);

    return (
        <StallsContext.Provider
            value={{
                stalls,
                stallTypes,
                vendors,
                themeColor,
                search,
                setSearch,
                selectedStatus,
                setSelectedStatus,
                selectedStallType,
                setSelectedStallType,
                viewMode,
                setViewMode,
                selectedStall,
                setSelectedStall,
                isAddOpen,
                setIsAddOpen,
                isEditOpen,
                setIsEditOpen,
                editingStall,
                setEditingStall,
            }}
        >
            {children}
        </StallsContext.Provider>
    );
}

export function useStalls() {
    const context = useContext(StallsContext);
    if (!context) {
        throw new Error("useStalls must be used within a StallsProvider");
    }
    return context;
}
