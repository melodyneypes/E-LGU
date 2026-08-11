"use client";

import React, { createContext, useContext, useState } from "react";

export interface StallTypeItem {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    _count?: {
        stalls: number;
    };
    stalls?: {
        id: string;
        stallNumber: string;
        status: string;
    }[];
}

interface StallTypesContextType {
    stallTypes: StallTypeItem[];
    themeColor: string;
    search: string;
    setSearch: (val: string) => void;
    viewMode: "grid" | "table";
    setViewMode: (mode: "grid" | "table") => void;
    selectedStallType: StallTypeItem | null;
    setSelectedStallType: (item: StallTypeItem | null) => void;
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editingStallType: StallTypeItem | null;
    setEditingStallType: (item: StallTypeItem | null) => void;
}

const StallTypesContext = createContext<StallTypesContextType | undefined>(undefined);

export function StallTypesProvider({
    initialStallTypes,
    themeColor,
    children,
}: {
    initialStallTypes: StallTypeItem[];
    themeColor: string;
    children: React.ReactNode;
}) {
    const [stallTypes] = useState<StallTypeItem[]>(initialStallTypes);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    const [selectedStallType, setSelectedStallType] = useState<StallTypeItem | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStallType, setEditingStallType] = useState<StallTypeItem | null>(null);

    return (
        <StallTypesContext.Provider
            value={{
                stallTypes,
                themeColor,
                search,
                setSearch,
                viewMode,
                setViewMode,
                selectedStallType,
                setSelectedStallType,
                isAddOpen,
                setIsAddOpen,
                isEditOpen,
                setIsEditOpen,
                editingStallType,
                setEditingStallType,
            }}
        >
            {children}
        </StallTypesContext.Provider>
    );
}

export function useStallTypes() {
    const context = useContext(StallTypesContext);
    if (!context) {
        throw new Error("useStallTypes must be used within a StallTypesProvider");
    }
    return context;
}
