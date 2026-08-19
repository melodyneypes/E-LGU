"use client";
"use client";

import React, { useEffect, useState } from "react";
import { useBarangay } from "@/components/providers/BarangayProvider";
import LoadingClientBody from "@/app/LoadingClientBody";
import { AnimatePresence } from "framer-motion";

export function GlobalLoading() {
    const { isLoading } = useBarangay();
    const [settings, setSettings] = useState<any>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Fetch branding from API since we're in a client component
        fetch("/api/settings")
            .then(async (res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                const contentType = res.headers.get("content-type") || "";
                if (!contentType.includes("application/json")) {
                    throw new Error("Invalid content type");
                }
                return res.json();
            })
            .then(data => setSettings(data))
            .catch(err => {
                console.error("Failed to fetch settings for loader", err);
                setSettings({
                    logoUrl: "",
                    brand1: "MAPANDAN",
                    brand2: "PORTAL",
                    themeColor: "#2563eb"
                });
            });
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
