"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { BarangayProvider } from "../providers/BarangayProvider";
import { GlobalLoading } from "./GlobalLoading";
import { NetworkInterceptor } from "./NetworkInterceptor";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider refetchInterval={15}>
            <BarangayProvider>
                <NetworkInterceptor />
                <GlobalLoading />
                {children}
                <Toaster position="top-center" richColors />
            </BarangayProvider>
        </SessionProvider>
    );
}
