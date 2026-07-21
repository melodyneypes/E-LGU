"use client";

import { signOut } from "next-auth/react";
import { secureLogoutAction } from "@/app/actions/auth";

export async function logoutToLogin(): Promise<void> {
    document.cookie = "active_portal=; path=/; max-age=0; SameSite=Lax";
    await secureLogoutAction();
    await signOut({ redirect: false });
    window.location.replace("/auth/login");
}
