"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { configuredBarangays } from "@/lib/utils/lgu";

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

        // Skip on auth routes to avoid interfering with auth redirections
        if (pathname.startsWith("/auth")) {
            setIsLoading(false);
            return;
        }

        const urlBarangay = searchParams.get("barangay");
        const saved = localStorage.getItem("selectedBarangay");

        const isConfiguredSelection = (value: string) =>
            value === "All" || configuredBarangays.includes(value);

        if (urlBarangay && isConfiguredSelection(urlBarangay)) {
            setSelectedBarangay(urlBarangay);
        } else if (urlBarangay) {
            localStorage.removeItem("selectedBarangay");
            const params = new URLSearchParams(searchParams.toString());
            params.delete("barangay");
            router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
            setSelectedBarangay("All");
        } else if (saved && isConfiguredSelection(saved)) {
            if (saved !== "All") {
                const params = new URLSearchParams(searchParams.toString());
                params.set("barangay", saved);
                router.replace(`${pathname}?${params.toString()}`);
                setSelectedBarangay(saved);
            } else {
                setSelectedBarangay("All");
            }
        } else if (saved) {
            localStorage.removeItem("selectedBarangay");
            setSelectedBarangay("All");
        }
        // Hide splash when URL settles
        setIsLoading(false);

        // Listen for global custom events to trigger loading overlay from navigation clicks
        const handleGlobalLoadingTrigger = (e: Event) => {
            const customEvent = e as CustomEvent;
            const state = !!customEvent.detail;
            setIsLoading(state);
            if (state) {
                setTimeout(() => {
                    setIsLoading(false);
                }, 1500);
            }
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
