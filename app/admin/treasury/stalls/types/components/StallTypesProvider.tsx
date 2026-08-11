"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

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
    debouncedSearch: string;
    isSearching: boolean;
    isRefreshing: boolean;
    triggerRefresh: () => void;
    setSearch: (val: string) => void;
    viewMode: "grid" | "table";
    setViewMode: (mode: "grid" | "table") => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
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
    const router = useRouter();
    const [stallTypes, setStallTypes] = useState<StallTypeItem[]>(initialStallTypes);
    const [search, setSearchRaw] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("table");

    // Sync state when initialStallTypes changes from server revalidation
    React.useEffect(() => {
        setStallTypes(initialStallTypes);
    }, [initialStallTypes]);

    const triggerRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [selectedStallType, setSelectedStallType] = useState<StallTypeItem | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStallType, setEditingStallType] = useState<StallTypeItem | null>(null);

    // 400ms Debounce effect on search input
    React.useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false);
            setCurrentPage(1); // Reset to page 1 on search
        }, 400);

        return () => clearTimeout(timer);
    }, [search]);

    return (
        <StallTypesContext.Provider
            value={{
                stallTypes,
                themeColor,
                search,
                debouncedSearch,
                isSearching,
                isRefreshing,
                triggerRefresh,
                setSearch: setSearchRaw,
                viewMode,
                setViewMode,
                currentPage,
                setCurrentPage,
                pageSize,
                setPageSize,
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
