"use client";

import * as React from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function AuthOTPGuard() {
    const { data: session, status } = useSession();
    const pathname = usePathname();

    React.useEffect(() => {
        if (typeof window === "undefined") return;

        if (status === "authenticated" && session && session.user) {
            const isEmailVerified = (session.user as any).isEmailVerified;
            if (isEmailVerified === false) {
                signOut({ redirect: false });
                return;
            }

            const isPasswordChanged = (session.user as any).isPasswordChanged;
            if (isPasswordChanged === false) {
                const isOtpPath = pathname.startsWith("/auth/verify-otp") || pathname.startsWith("/auth/setup-password");
                if (!isOtpPath) {
                    const isLoggingIn = sessionStorage.getItem("logging_in_otp") === "true";
                    if (!isLoggingIn) {
                        signOut({ redirect: false });
                    }
                }
            }
        }
    }, [session, status, pathname]);

    return null;
}
