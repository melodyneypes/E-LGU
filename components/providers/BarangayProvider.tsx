"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface BarangayContextType {
    selectedBarangay: string;
    setSelectedBarangay: (barangay: string) => void;
    isLoading: boolean;
}

const BarangayContext = createContext<BarangayContextType | undefined>(undefined);

function useSearchParamsSafe() {
    try {
        return useSearchParams();
    } catch {
        // During SSG or when not in a router context, return null
        return null;
    }
}

export function BarangayProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const searchParams = useSearchParamsSafe();
    const pathname = usePathname();
    const [selectedBarangay, setSelectedBarangay] = useState<string>("All");
    const [isLoading, setIsLoading] = useState(false);

    // Sync state with URL and localStorage
    useEffect(() => {
        // Skip if searchParams is not available (during SSG)
        if (!searchParams) {
            setIsLoading(false);
            return;
        }

        const urlBarangay = searchParams.get("barangay");
        const saved = localStorage.getItem("selectedBarangay");

        if (urlBarangay) {
            setSelectedBarangay(urlBarangay);
        } else if (saved && saved !== "All") {
            // If no URL param, but we have a saved preference, update URL
            const params = new URLSearchParams(searchParams.toString());
            params.set("barangay", saved);
            router.replace(`${pathname}?${params.toString()}`);
            setSelectedBarangay(saved);
        }
        // Hide splash when URL settles
        setIsLoading(false);

        // Listen for global custom events to trigger loading overlay from navigation clicks
        const handleGlobalLoadingTrigger = (e: Event) => {
            const customEvent = e as CustomEvent;
            setIsLoading(customEvent.detail);
        };

        window.addEventListener("trigger-global-loading", handleGlobalLoadingTrigger);
        return () => {
            window.removeEventListener("trigger-global-loading", handleGlobalLoadingTrigger);
        };
    }, [searchParams, pathname, router]);

    const updateBarangay = (value: string) => {
        // Skip if searchParams is not available (during SSG)
        if (!searchParams) {
            return;
        }

        setIsLoading(true);
        setSelectedBarangay(value);
        localStorage.setItem("selectedBarangay", value);

        const params = new URLSearchParams(searchParams.toString());
        if (value === "All") {
            params.delete("barangay");
        } else {
            params.set("barangay", value);
        }

        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <BarangayContext.Provider value={{ selectedBarangay, setSelectedBarangay: updateBarangay, isLoading }}>
            {children}
        </BarangayContext.Provider>
    );
}

export function useBarangay() {
    const context = useContext(BarangayContext);
    if (context === undefined) {
        // Return default values during SSG/SSR when context is not yet available
        return {
            selectedBarangay: "All",
            setSelectedBarangay: () => { },
            isLoading: false
        } as BarangayContextType;
    }
    return context;
}
