"use server";

import { cookies } from "next/headers";

/**
 * Server action to securely clear all session cookies and redirect to the login page.
 * Bypasses NextAuth API route issues.
 */
export async function secureLogoutAction() {
    const cookieStore = await cookies();
    
    const cookiesToClear = [
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "next-auth.callback-url",
        "__Secure-next-auth.callback-url",
        "next-auth.csrf-token",
        "__Secure-next-auth.csrf-token",
        "active_portal"
    ];

    cookiesToClear.forEach((cookieName) => {
        cookieStore.delete(cookieName);
    });

    return { success: true };
}
