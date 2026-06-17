"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function RealtimeSettingsListener({ isMaintenanceActive }: { isMaintenanceActive: boolean }) {
    const pathname = usePathname();
    const router = useRouter();
    const prevMaintenanceRef = useRef(isMaintenanceActive);

    useEffect(() => {
        prevMaintenanceRef.current = isMaintenanceActive;
    }, [isMaintenanceActive]);

    useEffect(() => {
        if (!supabase) return;

        console.log("Subscribing to Supabase Realtime 'SystemSetting' table...");

        const channel = supabase
            .channel("realtime-system-settings")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "SystemSetting"
                },
                (payload: any) => {
                    const updatedSetting = payload.new as { key: string; value: string };
                    console.log("SystemSetting updated in realtime:", updatedSetting);

                    if (updatedSetting.key === "maintenance_mode") {
                        const isMaintenance = updatedSetting.value === "true";
                        const wasMaintenance = prevMaintenanceRef.current;
                        
                        // Update ref value
                        prevMaintenanceRef.current = isMaintenance;

                        const isAdminRoute = pathname.startsWith("/admin");
                        const isAuthRoute = pathname.startsWith("/auth");
                        const isMaintenanceRoute = pathname === "/maintenance";

                        if (isMaintenance && !wasMaintenance) {
                            // Ensure bypass cookie does not prevent redirect to maintenance page
                            document.cookie = "bypass_maintenance=; path=/; max-age=0";

                            const hasBypass = document.cookie.split("; ").some(row => row.startsWith("bypass_maintenance=true"));
                            if (!isAdminRoute && !isAuthRoute && !isMaintenanceRoute && !hasBypass) {
                                console.log("Maintenance mode enabled. Redirecting to /maintenance...");
                                router.push("/maintenance");
                            }
                        } else if (!isMaintenance && wasMaintenance) {
                            // Clear bypass cookie when maintenance is turned off
                            document.cookie = "bypass_maintenance=; path=/; max-age=0";

                            if (isMaintenanceRoute) {
                                console.log("Maintenance mode disabled. Redirecting to home...");
                                router.push("/");
                            }
                        }
                    } else if (updatedSetting.key === "theme_color") {
                        // Dynamically update primary theme color CSS variable on root document
                        console.log("Theme color updated in realtime:", updatedSetting.value);
                        document.documentElement.style.setProperty("--primary-theme", updatedSetting.value);
                    } else {
                        // For any other settings (logo, brand text, section visibility, etc.),
                        // refresh the Next.js router to pull fresh Server Component data
                        router.refresh();
                    }
                }
            )
            .subscribe((status: any) => {
                console.log("SystemSetting realtime channel status:", status);
            });

        return () => {
            console.log("Unsubscribing from Supabase Realtime 'SystemSetting' table...");
            supabase.removeChannel(channel);
        };
    }, [pathname, router]);

    return null;
}
