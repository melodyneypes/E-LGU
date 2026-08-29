"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

export interface RegistryPersonnelItem {
    id: string;
    name: string | null;
    email: string | null;
    role: "VENDOR" | "COLLECTOR" | string;
    isEmailVerified: boolean;
    createdAt: Date | string;
    rfid?: string | null;
}

interface RegistryContextType {
    personnel: RegistryPersonnelItem[];
    setPersonnel: React.Dispatch<React.SetStateAction<RegistryPersonnelItem[]>>;
    themeColor: string;
    search: string;
    debouncedSearch: string;
    isSearching: boolean;
    isRefreshing: boolean;
    triggerRefresh: () => void;
    refreshPersonnel: () => Promise<void>;
    setSearch: (val: string) => void;
    selectedRoleFilter: "ALL" | "VENDOR" | "COLLECTOR";
    setSelectedRoleFilter: (val: "ALL" | "VENDOR" | "COLLECTOR") => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    pageSize: number;
    setPageSize: (size: number) => void;
    isAddOpen: boolean;
    setIsAddOpen: (open: boolean) => void;
    isEditOpen: boolean;
    setIsEditOpen: (open: boolean) => void;
    editingPersonnel: RegistryPersonnelItem | null;
    setEditingPersonnel: (item: RegistryPersonnelItem | null) => void;
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    deletingPersonnel: RegistryPersonnelItem | null;
    setDeletingPersonnel: (item: RegistryPersonnelItem | null) => void;
    isRFIDOpen: boolean;
    setIsRFIDOpen: (open: boolean) => void;
    rfidPersonnel: RegistryPersonnelItem | null;
    setRfidPersonnel: (item: RegistryPersonnelItem | null) => void;
}

const RegistryContext = createContext<RegistryContextType | undefined>(undefined);

export function RegistryProvider({
    initialPersonnel,
    themeColor,
    children,
}: {
    initialPersonnel: RegistryPersonnelItem[];
    themeColor: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [personnel, setPersonnel] = useState<RegistryPersonnelItem[]>(initialPersonnel);
    const [search, setSearchRaw] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedRoleFilter, setSelectedRoleFilter] = useState<"ALL" | "VENDOR" | "COLLECTOR">("ALL");

    // Sync state when initialPersonnel changes from server revalidation
    React.useEffect(() => {
        setPersonnel(initialPersonnel);
    }, [initialPersonnel]);

    const refreshPersonnel = async () => {
        setIsRefreshing(true);
        try {
            const { getMarketPersonnel } = await import("../actions/registry.actions");
            const res = await getMarketPersonnel();
            if (res.success && res.personnel) {
                setPersonnel(res.personnel as any);
            } else {
                router.refresh();
            }
        } catch {
            router.refresh();
        } finally {
            setIsRefreshing(false);
        }
    };

    const triggerRefresh = () => {
        refreshPersonnel();
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal States
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingPersonnel, setEditingPersonnel] = useState<RegistryPersonnelItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingPersonnel, setDeletingPersonnel] = useState<RegistryPersonnelItem | null>(null);
    const [isRFIDOpen, setIsRFIDOpen] = useState(false);
    const [rfidPersonnel, setRfidPersonnel] = useState<RegistryPersonnelItem | null>(null);

    return (
        <RegistryContext.Provider
            value={{
                personnel,
                setPersonnel,
                themeColor,
                search,
                debouncedSearch,
                isSearching,
                isRefreshing,
                triggerRefresh,
                refreshPersonnel,
                setSearch: setSearchRaw,
                selectedRoleFilter,
                setSelectedRoleFilter,
                currentPage,
                setCurrentPage,
                pageSize,
                setPageSize,
                isAddOpen,
                setIsAddOpen,
                isEditOpen,
                setIsEditOpen,
                editingPersonnel,
                setEditingPersonnel,
                isDeleteOpen,
                setIsDeleteOpen,
                deletingPersonnel,
                setDeletingPersonnel,
                isRFIDOpen,
                setIsRFIDOpen,
                rfidPersonnel,
                setRfidPersonnel,
            }}
        >
            {children}
        </RegistryContext.Provider>
    );
}

export function useRegistry() {
    const context = useContext(RegistryContext);
    if (!context) {
        throw new Error("useRegistry must be used within a RegistryProvider");
    }
    return context;
}
