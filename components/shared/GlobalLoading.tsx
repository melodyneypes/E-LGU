"use client";

import React, { useEffect, useState } from "react";
import { useBarangay } from "@/components/providers/BarangayProvider";
import LoadingClientBody from "@/app/LoadingClientBody";
import { AnimatePresence } from "framer-motion";

export function GlobalLoading() {
    const { isLoading } = useBarangay();
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        // Fetch branding from API since we're in a client component
        fetch("/api/settings")
            .then(async (res) => {
                const contentType = res.headers.get("content-type") || "";
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Settings request failed (${res.status}): ${text.slice(0, 120)}`);
                }
                if (!contentType.includes("application/json")) {
                    const text = await res.text();
                    throw new Error(`Expected JSON from /api/settings but received ${contentType || "unknown content type"}: ${text.slice(0, 120)}`);
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

    return (
        <AnimatePresence>
            {isLoading && settings && (
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
