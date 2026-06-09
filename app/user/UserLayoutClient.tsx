"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useSession } from "next-auth/react";

interface UserLayoutClientProps {
    children: React.ReactNode;
    logoUrl?: string;
    brandWord1?: string;
    brandWord2?: string;
    themeColor?: string;
}

export default function UserLayoutClient({
    children,
    logoUrl,
    brandWord1 = "E",
    brandWord2 = "Mapandan",
    themeColor = "#2563eb"
}: UserLayoutClientProps) {
    const { status } = useSession();

    React.useEffect(() => {
        if (status === "unauthenticated") {
            window.location.href = "/auth/login?error=Your account has been deactivated due to multiple rejected requests. Please visit the Municipal Treasury Office for restoration.";
        }
    }, [status]);

    return (
        <div
            className="min-h-screen bg-slate-50 dark:bg-[#06080a] text-slate-900 dark:text-slate-200 font-sans transition-colors duration-500 flex flex-col selection:bg-primary/30"
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <Navbar
                logoUrl={logoUrl}
                brandWord1={brandWord1}
                brandWord2={brandWord2}
                themeColor={themeColor}
            />

            <main className="flex-1 pt-28 md:pt-36 pb-20">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {children}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}

