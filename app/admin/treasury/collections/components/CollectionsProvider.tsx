"use client";

import React, { createContext, useContext, useState } from "react";

export interface StallOption {
    id: string;
    stallNumber: string;
    dailyRate: number;
    monthlyRate: number;
    dailyRateOverdueFee: number;
    stallType: {
        id: string;
        name: string;
    };
    vendor?: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
    otherFees?: {
        otherFee: {
            id: string;
            name: string;
            amount: number;
        };
    }[];
}

export interface CollectionRecord {
    id: string;
    stallId: string;
    vendorId: string | null;
    collectorId: string;
    collectedDate: Date | string;
    ticketNumber: string;
    baseAmount: number;
    otherFeesPaid: number;
    overdueFeePaid: number;
    totalAmountPaid: number;
    paymentMethod: "CASH" | "EPAYMENT";
    status: "PAID" | "PARTIAL" | "PENDING" | "CANCELLED";
    remarks?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    stall: {
        id: string;
        stallNumber: string;
        stallType: { name: string };
    };
    collector: {
        id: string;
        name: string | null;
        email: string | null;
    };
    vendor?: {
        id: string;
        name: string | null;
        email: string | null;
    } | null;
}

interface CollectionsContextType {
    collections: CollectionRecord[];
    stalls: StallOption[];
    collectorId: string;
    themeColor: string;
    search: string;
    setSearch: (val: string) => void;
    paymentMethodFilter: string;
    setPaymentMethodFilter: (val: string) => void;
    statusFilter: string;
    setStatusFilter: (val: string) => void;
    startDate: string;
    setStartDate: (val: string) => void;
    endDate: string;
    setEndDate: (val: string) => void;
    isLoading: boolean;
    setIsLoading: (val: boolean) => void;
    isIssueModalOpen: boolean;
    setIsIssueModalOpen: (open: boolean) => void;
    selectedReceipt: CollectionRecord | null;
    setSelectedReceipt: (record: CollectionRecord | null) => void;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export function CollectionsProvider({
    initialCollections,
    stalls,
    collectorId,
    themeColor,
    children,
}: {
    initialCollections: CollectionRecord[];
    stalls: StallOption[];
    collectorId: string;
    themeColor: string;
    children: React.ReactNode;
}) {
    const [collections] = useState<CollectionRecord[]>(initialCollections);
    const [search, setSearch] = useState("");
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<CollectionRecord | null>(null);

    return (
        <CollectionsContext.Provider
            value={{
                collections,
                stalls,
                collectorId,
                themeColor,
                search,
                setSearch,
                paymentMethodFilter,
                setPaymentMethodFilter,
                statusFilter,
                setStatusFilter,
                startDate,
                setStartDate,
                endDate,
                setEndDate,
                isLoading,
                setIsLoading,
                isIssueModalOpen,
                setIsIssueModalOpen,
                selectedReceipt,
                setSelectedReceipt,
            }}
        >
            {children}
        </CollectionsContext.Provider>
    );
}

export function useCollections() {
    const context = useContext(CollectionsContext);
    if (!context) {
        throw new Error("useCollections must be used within a CollectionsProvider");
    }
    return context;
}
