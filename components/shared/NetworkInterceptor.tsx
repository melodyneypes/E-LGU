"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { logoutToLogin } from "@/components/auth/logout-to-login";

let isHandlingUnauthorized = false;

/**
 * Global session invalidation handler with lock/debounce to prevent duplicate toast
 * stacks and multiple simultaneous redirects when multiple requests return 401.
 */
export function handleUnauthorizedSession(customMessage?: string) {
    if (isHandlingUnauthorized) return;
    isHandlingUnauthorized = true;

    // 1. Wipe local session data immediately
    try {
        if (typeof window !== "undefined") {
            localStorage.clear();
            sessionStorage.clear();
        }
    } catch {
        // Ignore storage access exceptions
    }

    // 2. Display a single consolidated notification
    toast.error(customMessage || "Session expired. Please log in again.", {
        id: "global-unauthorized-session-toast",
    });

    // 3. Clear session and force redirect to /auth/login
    setTimeout(() => {
        void logoutToLogin();
    }, 300);
}

export function NetworkInterceptor() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const url = typeof args[0] === 'string' 
                ? args[0] 
                : (args[0] instanceof URL ? args[0].toString() : (args[0] as Request).url || '');
            
            const isRelativeApi = url.startsWith('/api/') || url.startsWith('api/');
            const isLocalApi = url.includes(window.location.origin + '/api/');
            const isInternalRoute = !url.startsWith('http') && !url.includes('.') && !url.includes('_next/data');
            const shouldIntercept = (isRelativeApi || isLocalApi || isInternalRoute) && !url.includes('api/auth');

            try {
                const response = await originalFetch.apply(this, args);

                // Specifically intercept 401 Unauthorized and 403 Forbidden HTTP status codes for non-auth APIs
                if (shouldIntercept && (response.status === 401 || response.status === 403)) {
                    handleUnauthorizedSession("Session expired or unauthorized. Please log in again.");
                    return response;
                }

                if (!response.ok && shouldIntercept && response.status !== 404) {
                    try {
                        const clone = response.clone();
                        const contentType = clone.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const data = await clone.json();
                            const msg = data.error || data.message || `Server returned code ${response.status}`;
                            
                            const isUnauthorizedMsg = 
                                typeof msg === "string" && (
                                    msg.toLowerCase().includes("unauthorized") ||
                                    msg.toLowerCase().includes("unauthenticated") ||
                                    msg.toLowerCase().includes("session expired") ||
                                    msg.toLowerCase().includes("invalid token") ||
                                    msg.toLowerCase().includes("token expired")
                                );

                            if (isUnauthorizedMsg) {
                                handleUnauthorizedSession("Session expired. Please log in again.");
                                return response;
                            }

                            // Do not stack generic toasts if an unauthorized state is already being handled
                            if (!isHandlingUnauthorized) {
                                toast.error(`Network Request Failed: ${msg}`);
                            }
                        }
                    } catch {
                        // Silent catch for clone/parse errors
                    }
                }
                return response;
            } catch (error: any) {
                const isAbortOrFetchErr = 
                    error?.name === "AbortError" || 
                    error?.message?.includes("aborted") || 
                    error?.message?.includes("abort") ||
                    error?.message?.includes("Failed to fetch") ||
                    error?.message?.includes("Load failed");

                if (shouldIntercept && !isAbortOrFetchErr && !isHandlingUnauthorized) {
                    toast.error(`Network Connection Failed: ${error.message || 'Please check your connection'}`);
                }
                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    return null;
}
