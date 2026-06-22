"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { BarangayProvider } from "../providers/BarangayProvider";
import { GlobalLoading } from "./GlobalLoading";
import { NetworkInterceptor } from "./NetworkInterceptor";
import { RealtimeSettingsListener } from "./RealtimeSettingsListener";
import { AuthOTPGuard } from "../auth/AuthOTPGuard";

export function Providers({ 
    children,
    isMaintenanceActive = false
}: { 
    children: React.ReactNode;
    isMaintenanceActive?: boolean;
}) {
    return (
        <SessionProvider refetchInterval={15}>
            <BarangayProvider>
                <AuthOTPGuard />
                <NetworkInterceptor />
                <GlobalLoading />
                <RealtimeSettingsListener isMaintenanceActive={isMaintenanceActive} />
                {children}
                <Toaster position="top-center" richColors />
            </BarangayProvider>
        </SessionProvider>
    );
}
