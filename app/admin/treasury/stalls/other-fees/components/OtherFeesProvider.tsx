"use client";

import React, { createContext, useContext, useState } from "react";

export interface OtherFeeItem {
    id: string;
    code: string;
    name: string;
    amount: number;
    description?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    _count?: {
        stalls: number;
    };
    stalls?: {
        id: string;
        stallId: string;
        stall: {
            id: string;
            stallNumber: string;
            status: string;
        };
    }[];
}

export interface StallOption {
    id: string;
    stallNumber: string;
    status: string;
}

interface OtherFeesContextType {
    otherFees: OtherFeeItem[];
    allStalls: StallOption[];
    themeColor: string;
    search: string;
    setSearch: (val: string) => void;
    viewMode: "grid" | "table";
    setViewMode: (mode: "grid" | "table") => void;
    selectedFee: OtherFeeItem | null;
    setSelectedFee: (item: OtherFeeItem | null) => void;
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editingFee: OtherFeeItem | null;
    setEditingFee: (item: OtherFeeItem | null) => void;
    isAssignOpen: boolean;
    setIsAssignOpen: (open: boolean) => void;
    assigningFee: OtherFeeItem | null;
    setAssigningFee: (item: OtherFeeItem | null) => void;
}

const OtherFeesContext = createContext<OtherFeesContextType | undefined>(undefined);

export function OtherFeesProvider({
    initialOtherFees,
    allStalls,
    themeColor,
    children,
}: {
    initialOtherFees: OtherFeeItem[];
    allStalls: StallOption[];
    themeColor: string;
    children: React.ReactNode;
}) {
    const [otherFees] = useState<OtherFeeItem[]>(initialOtherFees);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

    const [selectedFee, setSelectedFee] = useState<OtherFeeItem | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingFee, setEditingFee] = useState<OtherFeeItem | null>(null);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [assigningFee, setAssigningFee] = useState<OtherFeeItem | null>(null);

    return (
        <OtherFeesContext.Provider
            value={{
                otherFees,
                allStalls,
                themeColor,
                search,
                setSearch,
                viewMode,
                setViewMode,
                selectedFee,
                setSelectedFee,
                isAddOpen,
                setIsAddOpen,
                isEditOpen,
                setIsEditOpen,
                editingFee,
                setEditingFee,
                isAssignOpen,
                setIsAssignOpen,
                assigningFee,
                setAssigningFee,
            }}
        >
            {children}
        </OtherFeesContext.Provider>
    );
}

export function useOtherFees() {
    const context = useContext(OtherFeesContext);
    if (!context) {
        throw new Error("useOtherFees must be used within an OtherFeesProvider");
    }
    return context;
}
