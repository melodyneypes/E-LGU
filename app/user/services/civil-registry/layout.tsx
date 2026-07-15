"use client";
 
import React from "react";
import { usePathname, notFound } from "next/navigation";
 
export default function CivilRegistryLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    
    // Check if the current route is the main civil-registry catalog page OR one of the active appointment pages
    const isAllowedRoute = 
        pathname === "/user/services/civil-registry" || 
        pathname?.includes("/appointment-") || 
        pathname?.includes("/civil-registry-appointment");
 
    if (!isAllowedRoute) {
        notFound();
    }
 
    return <>{children}</>;
}
