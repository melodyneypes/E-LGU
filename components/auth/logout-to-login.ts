"use client";

import { signOut } from "next-auth/react";
import { secureLogoutAction } from "@/app/actions/auth";

export async function logoutToLogin(): Promise<void> {
    try {
        if (typeof document !== "undefined") {
            document.cookie = "active_portal=; path=/; max-age=0; SameSite=Lax";
        }
        if (typeof window !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
        }
    } catch {
        // ignore storage/cookie errors
    }

    try {
        await secureLogoutAction();
    } catch {
        // ignore action errors on expired session
    }

    try {
        await signOut({ redirect: false });
    } catch {
        // ignore signOut errors
    }

    if (typeof window !== "undefined") {
        window.location.replace("/auth/login");
    }
}
