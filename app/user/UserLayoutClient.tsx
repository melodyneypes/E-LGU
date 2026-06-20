"use client";

import { motion } from "framer-motion";
import * as React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

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
    brandWord2 = "",
    themeColor = "#2563eb"
}: UserLayoutClientProps) {
    const { status } = useSession();
    const pathname = usePathname();

    const isPublicPath = 
        pathname.startsWith("/user/dining") ||
        pathname.startsWith("/user/accommodation") ||
        pathname.startsWith("/user/tourism") ||
        pathname.startsWith("/user/news") ||
        pathname.startsWith("/user/events") ||
        pathname.startsWith("/user/projects") ||
        pathname.startsWith("/user/officials") ||
        pathname.startsWith("/user/hotlines");

    React.useEffect(() => {
        if (status === "unauthenticated" && !isPublicPath) {
            window.location.href = "/auth/login";
        }
    }, [status, isPublicPath]);

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

            <main className="flex-1 pt-20 sm:pt-24 md:pt-28 pb-20">
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

