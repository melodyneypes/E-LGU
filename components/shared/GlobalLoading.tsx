"use client";

import React, { useEffect, useState } from "react";
import { useBarangay } from "@/components/providers/BarangayProvider";
import LoadingClientBody from "@/app/LoadingClientBody";
import { AnimatePresence } from "framer-motion";

const DEFAULT_SETTINGS = {
    logoUrl: "",
    brand1: "MAPANDAN",
    brand2: "PORTAL",
    themeColor: "#2563eb"
};

export function GlobalLoading() {
    const { isLoading } = useBarangay();
    const [settings, setSettings] = useState<any>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadSettings() {
            try {
                const res = await fetch("/api/settings");
                if (!res.ok) {
                    if (isMounted) setSettings(DEFAULT_SETTINGS);
                    return;
                }
                const contentType = res.headers.get("content-type") || "";
                if (!contentType.includes("application/json")) {
                    if (isMounted) setSettings(DEFAULT_SETTINGS);
                    return;
                }
                const data = await res.json();
                if (isMounted) setSettings(data);
            } catch {
                if (isMounted) setSettings(DEFAULT_SETTINGS);
            }
        }

        loadSettings();

        return () => {
            isMounted = false;
        };
    }, []);

    // Manage visibility with a hard safety timeout (max 2 seconds)
    useEffect(() => {
        if (isLoading) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
            }, 2000);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [isLoading]);

    return (
        <AnimatePresence>
            {visible && settings && (
                <LoadingClientBody 
                    logoUrl={settings.logoUrl}
                    brand1={settings.brand1}
                    brand2={settings.brand2}
                    themeColor={settings.themeColor}
                />
            )}
        </AnimatePresence>
    );
}
