"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

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
    setStalls: React.Dispatch<React.SetStateAction<StallItem[]>>;
    stallTypes: StallTypeOption[];
    vendors: VendorOption[];
    themeColor: string;
    search: string;
    debouncedSearch: string;
    isSearching: boolean;
    isRefreshing: boolean;
    triggerRefresh: () => void;
    setSearch: (val: string) => void;
    selectedStatus: string;
    setSelectedStatus: (val: string) => void;
    selectedStallType: string;
    setSelectedStallType: (val: string) => void;
    viewMode: "grid" | "table";
    setViewMode: (mode: "grid" | "table") => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    selectedStall: StallItem | null;
    setSelectedStall: (stall: StallItem | null) => void;
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editingStall: StallItem | null;
    setEditingStall: (stall: StallItem | null) => void;
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    deletingStall: StallItem | null;
    setDeletingStall: (stall: StallItem | null) => void;
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
    const router = useRouter();
    const [stalls, setStalls] = useState<StallItem[]>(initialStalls);
    const [search, setSearchRaw] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [selectedStatus, setSelectedStatus] = useState("ALL");
    const [selectedStallType, setSelectedStallType] = useState("ALL");
    const [viewMode, setViewMode] = useState<"grid" | "table">("table"); // Default to Table List View
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [selectedStall, setSelectedStall] = useState<StallItem | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingStall, setEditingStall] = useState<StallItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingStall, setDeletingStall] = useState<StallItem | null>(null);

    // Sync state when initialStalls changes from server revalidation
    React.useEffect(() => {
        setStalls(initialStalls);
    }, [initialStalls]);

    const triggerRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    // 400ms Debounce effect on search input
    React.useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false);
            setCurrentPage(1);
        }, 400);

        return () => clearTimeout(timer);
    }, [search]);

    return (
        <StallsContext.Provider
            value={{
                stalls,
                setStalls,
                stallTypes,
                vendors,
                themeColor,
                search,
                debouncedSearch,
                isSearching,
                isRefreshing,
                triggerRefresh,
                setSearch: setSearchRaw,
                selectedStatus,
                setSelectedStatus,
                selectedStallType,
                setSelectedStallType,
                viewMode,
                setViewMode,
                currentPage,
                setCurrentPage,
                pageSize,
                setPageSize,
                selectedStall,
                setSelectedStall,
                isAddOpen,
                setIsAddOpen,
                isEditOpen,
                setIsEditOpen,
                editingStall,
                setEditingStall,
                isDeleteOpen,
                setIsDeleteOpen,
                deletingStall,
                setDeletingStall,
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
