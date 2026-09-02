"use client";

import React, { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

export interface CollectorItem {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    rfid: string | null;
    isEmailVerified: boolean;
    createdAt: Date | string;
    _count?: {
        collectorCollections: number;
    };
}

interface CollectorContextType {
    collectors: CollectorItem[];
    setCollectors: React.Dispatch<React.SetStateAction<CollectorItem[]>>;
    themeColor: string;
    search: string;
    setSearch: (val: string) => void;
    debouncedSearch: string;
    rfidFilter: "ALL" | "WITH_RFID" | "WITHOUT_RFID";
    setRfidFilter: (val: "ALL" | "WITH_RFID" | "WITHOUT_RFID") => void;
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
    editingCollector: CollectorItem | null;
    setEditingCollector: (collector: CollectorItem | null) => void;
    isDeleteOpen: boolean;
    setIsDeleteOpen: (open: boolean) => void;
    deletingCollector: CollectorItem | null;
    setDeletingCollector: (collector: CollectorItem | null) => void;
    isRfidOpen: boolean;
    setIsRfidOpen: (open: boolean) => void;
    rfidCollector: CollectorItem | null;
    setRfidCollector: (collector: CollectorItem | null) => void;
}

const CollectorContext = createContext<CollectorContextType | undefined>(undefined);

export function CollectorProvider({
    initialCollectors,
    themeColor,
    children,
}: {
    initialCollectors: CollectorItem[];
    themeColor: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [collectors, setCollectors] = useState<CollectorItem[]>(initialCollectors);
    const [search, setSearchRaw] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [rfidFilter, setRfidFilter] = useState<"ALL" | "WITH_RFID" | "WITHOUT_RFID">("ALL");
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCollector, setEditingCollector] = useState<CollectorItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [deletingCollector, setDeletingCollector] = useState<CollectorItem | null>(null);
    const [isRfidOpen, setIsRfidOpen] = useState(false);
    const [rfidCollector, setRfidCollector] = useState<CollectorItem | null>(null);

    React.useEffect(() => {
        setCollectors(initialCollectors);
    }, [initialCollectors]);

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
        <CollectorContext.Provider
            value={{
                collectors,
                setCollectors,
                themeColor,
                search,
                setSearch: setSearchRaw,
                debouncedSearch,
                rfidFilter,
                setRfidFilter,
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
                editingCollector,
                setEditingCollector,
                isDeleteOpen,
                setIsDeleteOpen,
                deletingCollector,
                setDeletingCollector,
                isRfidOpen,
                setIsRfidOpen,
                rfidCollector,
                setRfidCollector,
            }}
        >
            {children}
        </CollectorContext.Provider>
    );
}

export function useCollectors() {
    const context = useContext(CollectorContext);
    if (!context) {
        throw new Error("useCollectors must be used within a CollectorProvider");
    }
    return context;
}
