"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

export interface VendorItem {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    isEmailVerified: boolean;
    createdAt: Date | string;
    vendorStalls?: {
        id: string;
        stallNumber: string;
        status: string;
    }[];
}

interface VendorContextType {
    vendors: VendorItem[];
    setVendors: React.Dispatch<React.SetStateAction<VendorItem[]>>;
    themeColor: string;
    search: string;
    setSearch: (val: string) => void;
    debouncedSearch: string;
    stallFilter: "ALL" | "ASSIGNED" | "UNASSIGNED";
    setStallFilter: (val: "ALL" | "ASSIGNED" | "UNASSIGNED") => void;
    isSearching: boolean;
    isRefreshing: boolean;
    triggerRefresh: () => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editingVendor: VendorItem | null;
    setEditingVendor: (vendor: VendorItem | null) => void;
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    deletingVendor: VendorItem | null;
    setDeletingVendor: (vendor: VendorItem | null) => void;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export function VendorProvider({
    initialVendors,
    themeColor,
    children,
}: {
    initialVendors: VendorItem[];
    themeColor: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [vendors, setVendors] = useState<VendorItem[]>(initialVendors);
    const [search, setSearchRaw] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [stallFilter, setStallFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingVendor, setDeletingVendor] = useState<VendorItem | null>(null);

    React.useEffect(() => {
        setVendors(initialVendors);
    }, [initialVendors]);

    React.useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false);
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const triggerRefresh = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => {
            setIsRefreshing(false);
        }, 500);
    };

    return (
        <VendorContext.Provider
            value={{
                vendors,
                setVendors,
                themeColor,
                search,
                setSearch: setSearchRaw,
                debouncedSearch,
                stallFilter,
                setStallFilter,
                isSearching,
                isRefreshing,
                triggerRefresh,
                currentPage,
                setCurrentPage,
                pageSize,
                setPageSize,
                isAddOpen,
                setIsAddOpen,
                isEditOpen,
                setIsEditOpen,
                editingVendor,
                setEditingVendor,
                isDeleteOpen,
                setIsDeleteOpen,
                deletingVendor,
                setDeletingVendor,
            }}
        >
            {children}
        </VendorContext.Provider>
    );
}

export function useVendors() {
    const context = useContext(VendorContext);
    if (!context) {
        throw new Error("useVendors must be used within a VendorProvider");
    }
    return context;
}
